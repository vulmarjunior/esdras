"use server";

import { revalidatePath } from "next/cache";
import { get, run } from "@/lib/db";
import { getActiveMeeting } from "@/lib/data";
import { requireRole, requireUser } from "@/lib/auth";
import { rolesCom } from "@/lib/permissions";
import { publishRealtime } from "@/lib/realtime";
import type { ActionState } from "./state";

async function audit(userId: number, user_name: string, action: string, entity: string, entity_id: string, detail?: string) {
  await run(
    "INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, detail) VALUES (?, ?, ?, ?, ?, ?)",
    [userId, user_name, action, entity, entity_id, detail || ""]
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

export async function createSuggestion(
  provisionId: string,
  texto: string,
  justificativa: string,
  ondeEsta: string
): Promise<ActionState> {
  const user = await requireRole(...rolesCom("contribuir"));
  if (!texto.trim()) return { error: "Informe o texto da sugestão de redação." };
  const res = await run(
    "INSERT INTO suggestions (provision_id, author_id, texto, justificativa, onde_esta, status) VALUES (?, ?, ?, ?, ?, 'aberta')",
    [provisionId, user.id, texto, justificativa || "", ondeEsta || ""]
  );
  await audit(user.id, user.name, "Criou sugestão #" + res.lastInsertRowid, "provision", provisionId);
  await logMeetingEvent("sugestao", `Sugestão #${res.lastInsertRowid} criada em ${provisionId}`, user.id);
  revalidatePath(`/dispositivo/${provisionId}`);
  await publishRealtime({ entity: "provision", id: provisionId, action: "sugestao" });
  return { ok: true, message: "Sugestão de redação registrada." };
}

export async function updateSuggestionStatus(suggestionId: number, status: string): Promise<ActionState> {
  const user = await requireRole(...rolesCom("gerenciar_sugestoes"));
  const allowed = ["aberta", "em_discussao", "aceita", "aceita_parcialmente", "rejeitada", "retirada"];
  if (!allowed.includes(status)) return { error: "Status inválido." };
  const sug = await get<{ provision_id: string }>("SELECT provision_id FROM suggestions WHERE id = ?", [suggestionId]);
  if (!sug) return { error: "Sugestão de redação não encontrada." };
  await run("UPDATE suggestions SET status = ? WHERE id = ?", [status, suggestionId]);
  await audit(user.id, user.name, `Sugestão #${suggestionId} ${status}`, "suggestion", String(suggestionId));
  await logMeetingEvent(status === "aceita" ? "sugestao_aceita" : "sugestao", `Sugestão #${suggestionId} ${status}`, user.id);
  revalidatePath(`/dispositivo/${sug.provision_id}`);
  await publishRealtime({ entity: "provision", id: sug.provision_id, action: "sugestao_status" });
  return { ok: true };
}

export async function createComment(
  provisionId: string | null,
  suggestionId: number | null,
  content: string
): Promise<ActionState> {
  const user = await requireUser();
  if (!content.trim()) return { error: "Escreva um comentário." };
  await run("INSERT INTO comments (author_id, provision_id, suggestion_id, content) VALUES (?, ?, ?, ?)", [
    user.id,
    provisionId,
    suggestionId,
    content,
  ]);
  await audit(user.id, user.name, "Comentou", "provision", provisionId || "", content.slice(0, 120));
  revalidatePath(provisionId ? `/dispositivo/${provisionId}` : "/");
  await publishRealtime({ entity: "provision", id: provisionId || "", action: "comentario" });
  return { ok: true };
}

export async function createPendingIssue(provisionId: string, categoria: string, descricao: string): Promise<ActionState> {
  const user = await requireRole(...rolesCom("contribuir"));
  if (!descricao.trim()) return { error: "Descreva a pendência." };
  const res = await run("INSERT INTO pending_issues (provision_id, author_id, categoria, descricao) VALUES (?, ?, ?, ?)", [
    provisionId,
    user.id,
    categoria,
    descricao,
  ]);
  await audit(user.id, user.name, "Registrou pendência #" + res.lastInsertRowid, "provision", provisionId);
  revalidatePath(`/dispositivo/${provisionId}`);
  await publishRealtime({ entity: "provision", id: provisionId, action: "pendencia" });
  return { ok: true };
}

export async function resolvePending(pendingId: number, provisionId: string): Promise<ActionState> {
  const user = await requireUser();
  await run("UPDATE pending_issues SET status = 'resolvida' WHERE id = ?", [pendingId]);
  await audit(user.id, user.name, "Pendência #" + pendingId + " resolvida", "provision", provisionId);
  revalidatePath(`/dispositivo/${provisionId}`);
  revalidatePath("/pendentes");
  return { ok: true };
}

export async function createReference(provisionId: string, tipo: string, texto: string): Promise<ActionState> {
  const user = await requireRole(...rolesCom("contribuir"));
  if (!texto.trim()) return { error: "Informe a referência." };
  await run("INSERT INTO references_tb (provision_id, tipo, texto, author_id) VALUES (?, ?, ?, ?)", [
    provisionId,
    tipo,
    texto,
    user.id,
  ]);
  await audit(user.id, user.name, "Adicionou referência " + tipo, "provision", provisionId);
  revalidatePath(`/dispositivo/${provisionId}`);
  await publishRealtime({ entity: "provision", id: provisionId, action: "referencia" });
  return { ok: true };
}

export async function vote(provisionId: string | null, opinion: string, suggestionId: number | null = null): Promise<ActionState> {
  const user = await requireRole(...rolesCom("contribuir"));
  const allowed = ["concordo", "discordo", "ressalva"];
  if (!allowed.includes(opinion)) return { error: "Voto inválido." };
  if (suggestionId != null) {
    await run(
      `INSERT INTO votes (user_id, provision_id, suggestion_id, opinion) VALUES (?, NULL, ?, ?)
       ON CONFLICT(user_id, suggestion_id) WHERE suggestion_id IS NOT NULL
       DO UPDATE SET opinion = excluded.opinion, created_at = datetime('now')`,
      [user.id, suggestionId, opinion]
    );
    if (provisionId) revalidatePath(`/dispositivo/${provisionId}`);
    await publishRealtime({ entity: "provision", id: provisionId || "", action: "voto" });
    return { ok: true };
  }
  if (!provisionId) return { error: "Dispositivo não informado." };
  await run(
    `INSERT INTO votes (user_id, provision_id, opinion) VALUES (?, ?, ?)
     ON CONFLICT(user_id, provision_id) WHERE suggestion_id IS NULL
     DO UPDATE SET opinion = excluded.opinion, created_at = datetime('now')`,
    [user.id, provisionId, opinion]
  );
  revalidatePath(`/dispositivo/${provisionId}`);
  await publishRealtime({ entity: "provision", id: provisionId, action: "voto" });
  return { ok: true };
}

export async function removeVote(provisionId: string | null, suggestionId: number | null = null): Promise<ActionState> {
  const user = await requireUser();
  if (suggestionId != null) {
    await run("DELETE FROM votes WHERE user_id = ? AND suggestion_id = ?", [user.id, suggestionId]);
  } else if (provisionId) {
    await run("DELETE FROM votes WHERE user_id = ? AND provision_id = ?", [user.id, provisionId]);
  }
  if (provisionId) revalidatePath(`/dispositivo/${provisionId}`);
  return { ok: true };
}

export async function addProvisionRelation(provisionId: string, relatedId: string): Promise<ActionState> {
  const user = await requireRole(...rolesCom("vincular_dispositivos"));
  await run("INSERT OR IGNORE INTO provision_relations (provision_id, related_id) VALUES (?, ?)", [provisionId, relatedId]);
  await audit(user.id, user.name, "Vinculou dispositivo", "provision", provisionId, "relacionado a " + relatedId);
  revalidatePath(`/dispositivo/${provisionId}`);
  await publishRealtime({ entity: "provision", id: provisionId, action: "vinculo" });
  return { ok: true };
}

export async function removeProvisionRelation(provisionId: string, relatedId: string): Promise<ActionState> {
  await requireRole(...rolesCom("vincular_dispositivos"));
  await run("DELETE FROM provision_relations WHERE provision_id = ? AND related_id = ?", [provisionId, relatedId]);
  revalidatePath(`/dispositivo/${provisionId}`);
  await publishRealtime({ entity: "provision", id: provisionId, action: "vinculo" });
  return { ok: true };
}