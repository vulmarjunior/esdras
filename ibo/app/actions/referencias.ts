"use server";

import { revalidatePath } from "next/cache";
import { get, run, transaction, now } from "@/lib/db";
import { getActiveMeeting } from "@/lib/data";
import { requireRole, type Role } from "@/lib/auth";
import { rolesCom, type Permissao } from "@/lib/permissions";
import { sanitizeHtml } from "@/lib/rich-text";
import { publishRealtime } from "@/lib/realtime";
import { substituirMencoes, CAMPO_LABELS, type CampoReferencia } from "@/lib/referencias-core";
import type { ActionState } from "./state";

const PERMISSAO_POR_CAMPO: Record<CampoReferencia, Permissao> = {
  texto_vigente: "corrigir_extracao",
  proposta_inicial: "corrigir_extracao",
  redacao_trabalho: "editar_redacao",
  redacao_consolidada: "editar_redacao",
  justificativa: "editar_justificativa",
};

const CAMPOS_VALIDOS = Object.keys(PERMISSAO_POR_CAMPO) as CampoReferencia[];

async function audit(userId: number, userName: string, action: string, entityId: string, detail?: string) {
  await run(
    "INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, detail) VALUES (?, ?, ?, ?, ?, ?)",
    [userId, userName, action, "provision", entityId, detail || ""]
  );
}

async function logMeetingEvent(tipo: string, descricao: string, userId: number | null) {
  const meeting = await getActiveMeeting();
  if (!meeting) return;
  const hora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  await run("INSERT INTO meeting_events (meeting_id, user_id, hora, tipo, descricao) VALUES (?, ?, ?, ?, ?)", [
    meeting.id,
    userId,
    hora,
    tipo,
    descricao,
  ]);
}

function podeEditar(role: Role, campo: CampoReferencia): boolean {
  return rolesCom(PERMISSAO_POR_CAMPO[campo]).includes(role);
}

/**
 * Atualiza uma referência interna ("Art. N" → "Art. M") em um campo do
 * dispositivo, com confirmação humana. Redação de trabalho/consolidada gera
 * nova versão no histórico; os demais campos ficam registrados em auditoria.
 */
export async function atualizarReferencia(
  provisionId: string,
  campo: CampoReferencia,
  numeroAntigo: number,
  numeroNovo: string
): Promise<ActionState> {
  if (!CAMPOS_VALIDOS.includes(campo)) return { error: "Campo inválido." };
  const user = await requireRole(...rolesCom(PERMISSAO_POR_CAMPO[campo]));

  const prov = await get<Record<string, string | number>>(
    "SELECT version, texto_vigente, proposta_inicial, redacao_trabalho, redacao_consolidada, justificativa FROM provisions WHERE id = ?",
    [provisionId]
  );
  if (!prov) return { error: "Dispositivo não encontrado." };

  const atual = String(prov[campo] ?? "");
  const { texto: novo, trocas } = substituirMencoes(atual, numeroAntigo, numeroNovo);
  if (trocas === 0) return { error: `Nenhuma menção a "Art. ${numeroAntigo}" encontrada em ${CAMPO_LABELS[campo]}.` };

  const limpo = campo === "texto_vigente" ? novo : sanitizeHtml(novo);
  const ts = now();
  const detalhe = `${CAMPO_LABELS[campo]}: Art. ${numeroAntigo} → Art. ${numeroNovo} (${trocas} menção(ões))`;

  await transaction(async () => {
    if (campo === "redacao_trabalho" || campo === "redacao_consolidada") {
      const versaoAtual = Number(prov.version ?? 0);
      await run(
        "INSERT INTO provision_versions (provision_id, version, content, reason, author_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        [provisionId, versaoAtual + 1, limpo, `Referência atualizada (${detalhe})`, user.id, ts]
      );
      await run(
        `UPDATE provisions SET ${campo} = ?, version = version + 1, updated_at = ?, updated_by = ? WHERE id = ?`,
        [limpo, ts, user.id, provisionId]
      );
    } else {
      await run(`UPDATE provisions SET ${campo} = ?, updated_at = ?, updated_by = ? WHERE id = ?`, [
        limpo,
        ts,
        user.id,
        provisionId,
      ]);
    }
    await audit(user.id, user.name, "Atualizou referência interna", provisionId, detalhe);
  });

  await logMeetingEvent("referencia_atualizada", `${provisionId}: ${detalhe}`, user.id);
  revalidatePath(`/dispositivo/${provisionId}`);
  revalidatePath("/renumeracao");
  await publishRealtime({ entity: "provision", id: provisionId, action: "referencia_atualizada" });
  return { ok: true, message: `${CAMPO_LABELS[campo]}: referência atualizada (${trocas} menção(ões)).` };
}

export interface ItemReferencia {
  campo: CampoReferencia;
  numeroAntigo: number;
  numeroNovo: string;
}

/** Atualiza de uma vez as referências permitidas ao perfil do usuário. */
export async function atualizarReferenciasDoDispositivo(
  provisionId: string,
  itens: ItemReferencia[]
): Promise<ActionState> {
  const user = await requireRole("admin", "coordenador");
  const permitidos = itens.filter((i) => CAMPOS_VALIDOS.includes(i.campo) && podeEditar(user.role as Role, i.campo));
  if (permitidos.length === 0) return { error: "Nenhuma referência pode ser atualizada com o seu perfil." };

  let atualizadas = 0;
  let ignoradas = itens.length - permitidos.length;
  for (const item of permitidos) {
    const res = await atualizarReferencia(provisionId, item.campo, item.numeroAntigo, item.numeroNovo);
    if (res.ok) atualizadas++;
    else ignoradas++;
  }
  if (atualizadas === 0) return { error: "Nenhuma referência foi atualizada." };
  return {
    ok: true,
    message: `${atualizadas} referência(s) atualizada(s)${ignoradas ? `, ${ignoradas} ignorada(s)` : ""}.`,
  };
}
