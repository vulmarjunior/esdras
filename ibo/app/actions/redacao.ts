"use server";

import { revalidatePath } from "next/cache";
import { get, run, transaction, now } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { ALTERACAO_TYPE_LABELS } from "@/lib/labels";
import { sanitizeHtml, htmlToText } from "@/lib/rich-text";
import { rolesCom } from "@/lib/permissions";
import { avaliarConflito } from "@/lib/version-guard";
import { publishRealtime } from "@/lib/realtime";
import type { ActionState } from "./state";

async function audit(userId: number, user_name: string, action: string, entity: string, entity_id: string, detail?: string) {
  await run(
    "INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, detail) VALUES (?, ?, ?, ?, ?, ?)",
    [userId, user_name, action, entity, entity_id, detail || ""]
  );
}

export async function updateRedacao(
  provisionId: string,
  content: string,
  expectedVersion: number,
  reason: string
): Promise<ActionState> {
  const user = await requireRole(...rolesCom("editar_redacao"));
  const prov = await get<{ version: number; redacao_trabalho: string; status: string }>(
    "SELECT version, redacao_trabalho, status FROM provisions WHERE id = ?",
    [provisionId]
  );
  if (!prov) return { error: "Dispositivo não encontrado." };
  if (prov.status === "aprovado") {
    return { error: "Reabra o dispositivo antes de alterar uma redação concluída." };
  }
  const conflito = avaliarConflito(expectedVersion, prov.version);
  if (conflito.conflito) {
    return { conflict: true, error: conflito.mensagem || "Conflito de versão." };
  }
  if (!content.trim()) return { error: "A redação não pode ficar vazia." };
  const clean = sanitizeHtml(content);
  if (!htmlToText(clean).trim()) return { error: "A redação não pode ficar vazia." };

  const ts = now();
  await transaction(async () => {
    await run("INSERT INTO provision_versions (provision_id, version, content, reason, author_id, created_at) VALUES (?, ?, ?, ?, ?, ?)", [
      provisionId,
      prov.version + 1,
      clean,
      reason || null,
      user.id,
      ts,
    ]);
    await run("UPDATE provisions SET redacao_trabalho = ?, version = version + 1, updated_at = ?, updated_by = ?, status = CASE WHEN status = 'nao_iniciado' THEN 'em_analise' ELSE status END WHERE id = ?", [
      clean,
      ts,
      user.id,
      provisionId,
    ]);
    await audit(user.id, user.name, "Redação de trabalho atualizada", "provision", provisionId, reason || "");
  });
  revalidatePath(`/dispositivo/${provisionId}`);
  revalidatePath("/mesa-trabalho");
  await publishRealtime({ entity: "provision", id: provisionId, action: "redacao" });
  return { ok: true, message: "Redação salva. Nova versão criada." };
}

export async function updateJustificativa(provisionId: string, justificativa: string): Promise<ActionState> {
  const user = await requireRole(...rolesCom("editar_justificativa"));
  await run("UPDATE provisions SET justificativa = ?, updated_at = ? WHERE id = ?", [sanitizeHtml(justificativa), now(), provisionId]);
  await audit(user.id, user.name, "Justificativa atualizada", "provision", provisionId);
  revalidatePath(`/dispositivo/${provisionId}`);
  revalidatePath("/mesa-trabalho");
  await publishRealtime({ entity: "provision", id: provisionId, action: "justificativa" });
  return { ok: true };
}

export async function updateHistoricalText(
  provisionId: string,
  campo: "texto_vigente" | "proposta_inicial",
  novoTexto: string
): Promise<ActionState> {
  const user = await requireRole(...rolesCom("corrigir_extracao"));
  const prov = await get<{ texto_vigente: string; proposta_inicial: string }>(
    "SELECT texto_vigente, proposta_inicial FROM provisions WHERE id = ?",
    [provisionId]
  );
  if (!prov) return { error: "Dispositivo não encontrado." };
  const rotulo = campo === "texto_vigente" ? "Texto vigente" : "Proposta inicial";
  const antigo = prov[campo];
  const limpo = campo === "proposta_inicial" ? sanitizeHtml(novoTexto) : novoTexto;
  const acao = campo === "proposta_inicial" ? "Proposta inicial editada" : "Correção de extração — Texto vigente";
  const ts = now();
  await transaction(async () => {
    await run(`UPDATE provisions SET ${campo} = ?, updated_at = ? WHERE id = ?`, [limpo, ts, provisionId]);
    await audit(
      user.id,
      user.name,
      acao,
      "provision",
      provisionId,
      `Antes: ${antigo.slice(0, 200)}\nDepois: ${limpo.slice(0, 200)}`
    );
  });
  revalidatePath(`/dispositivo/${provisionId}`);
  await publishRealtime({ entity: "provision", id: provisionId, action: "historico" });
  return { ok: true, message: `${rotulo} corrigido e registrado em auditoria.` };
}

export async function setStatus(provisionId: string, status: string): Promise<ActionState> {
  const user = await requireRole(...rolesCom("gerenciar_status"));
  const allowed = ["nao_iniciado", "em_analise", "em_discussao", "redacao_definida", "aprovado", "reaberto"];
  if (!allowed.includes(status)) return { error: "Status inválido." };
  if (status === "aprovado") {
    const provision = await get<{ redacao_trabalho: string }>(
      "SELECT redacao_trabalho FROM provisions WHERE id = ?",
      [provisionId],
    );
    if (!provision) return { error: "Dispositivo não encontrado." };
    if (!htmlToText(provision.redacao_trabalho).trim()) {
      return { error: "Salve uma redação de trabalho antes de concluir." };
    }
  }

  await transaction(async () => {
    if (status === "aprovado") {
      await run("UPDATE provisions SET status = 'aprovado', redacao_consolidada = redacao_trabalho, updated_at = ? WHERE id = ?", [now(), provisionId]);
    } else {
      await run("UPDATE provisions SET status = ?, updated_at = ? WHERE id = ?", [status, now(), provisionId]);
    }
    await audit(user.id, user.name, "Status alterado para " + status, "provision", provisionId);
  });
  revalidatePath(`/dispositivo/${provisionId}`);
  revalidatePath("/mesa-trabalho");
  revalidatePath("/");
  await publishRealtime({ entity: "provision", id: provisionId, action: "status" });
  return { ok: true };
}

export async function setAlteracaoTipo(provisionId: string, tipo: string): Promise<ActionState> {
  const user = await requireRole(...rolesCom("classificar_alteracao"));
  const allowed = ["nao_avaliado", "mantido", "alteracao_redacional", "alteracao_material", "novo", "revogado", "desmembrado", "incorporado", "reorganizado"];
  if (!allowed.includes(tipo)) return { error: "Tipo de alteração inválido." };
  const prov = await get<{ alteracao_tipo: string }>("SELECT alteracao_tipo FROM provisions WHERE id = ?", [provisionId]);
  if (!prov) return { error: "Dispositivo não encontrado." };
  await transaction(async () => {
    await run("UPDATE provisions SET alteracao_tipo = ?, updated_at = ? WHERE id = ?", [tipo, now(), provisionId]);
    await audit(user.id, user.name, "Tipo de alteração definido como " + tipo, "provision", provisionId);
  });
  revalidatePath(`/dispositivo/${provisionId}`);
  revalidatePath("/");
  revalidatePath("/mesa-trabalho");
  revalidatePath("/consolidado");
  revalidatePath("/comparativo");
  revalidatePath("/revisao");
  await publishRealtime({ entity: "provision", id: provisionId, action: "classificacao" });
  return { ok: true, message: `Classificação: ${ALTERACAO_TYPE_LABELS[tipo] || tipo}.` };
}
