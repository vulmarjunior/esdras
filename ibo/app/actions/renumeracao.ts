"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { run, transaction, now, get } from "@/lib/db";
import { getArtigosOrdenados } from "@/lib/renumeracao";
import { renumerar } from "@/lib/renumeracao-core";
import { rolesCom } from "@/lib/permissions";
import { publishRealtime } from "@/lib/realtime";

async function audit(userId: number, user_name: string, action: string, entity: string, entity_id: string, detail?: string) {
  await run(
    "INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, detail) VALUES (?, ?, ?, ?, ?, ?)",
    [userId, user_name, action, entity, entity_id, detail || ""]
  );
}

async function logMeetingEvent(tipo: string, descricao: string, userId: number | null) {
  const meeting = await get<{ id: number }>("SELECT id FROM meetings WHERE status = 'em_andamento' ORDER BY id DESC LIMIT 1");
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

export type RenumeracaoState = { ok?: boolean; error?: string; message?: string };

/**
 * PRD §17 — aplica a numeração final dos artigos conforme a ORDEM ATUAL da árvore.
 * A reordenação física entre capítulos é etapa separada; aqui apenas os números são
 * gravados, com auditoria e registro de evento de reunião. Nunca reescreve textos.
 */
export async function applyRenumeracao(): Promise<RenumeracaoState> {
  const user = await requireRole(...rolesCom("renumerar"));

  const artigos = await getArtigosOrdenados();
  const ids = artigos.map((a) => a.id);
  const numeros = renumerar(ids);

  let alterados = 0;
  const detalhes: string[] = [];
  await transaction(async () => {
    for (const a of artigos) {
      const novo = numeros.get(a.id)!;
      if (a.numeroAtual !== novo) {
        await run("UPDATE provisions SET numero = ?, updated_at = ? WHERE id = ?", [novo, now(), a.id]);
        detalhes.push(`${a.label}: ${a.numeroAtual || "NOVO"} → ${novo}`);
        alterados++;
      }
    }
    await audit(
      user.id,
      user.name,
      "Renumeração final aplicada",
      "project",
      "projeto-ibo",
      detalhes.length ? detalhes.join("\n") : "Nenhuma alteração de número necessária (ordem já sequencial)."
    );
  });
  await logMeetingEvent("renumeracao", `Renumeração aplicada — ${alterados} artigo(s) atualizado(s)`, user.id);

  revalidatePath("/");
  revalidatePath("/renumeracao");
  revalidatePath("/consolidado");
  await publishRealtime({ entity: "project", id: "projeto-ibo", action: "renumeracao" });
  return {
    ok: true,
    message:
      alterados === 0
        ? "Nenhum número precisou mudar — a numeração já está sequencial na ordem atual."
        : `Renumeração aplicada: ${alterados} artigo(s) atualizado(s). Registraram em auditoria.`,
  };
}