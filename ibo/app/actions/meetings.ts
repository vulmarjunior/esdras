"use server";

import { revalidatePath } from "next/cache";
import { get, run, all, now, transaction } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { rolesCom } from "@/lib/permissions";

async function audit(userId: number, user_name: string, action: string, entity: string, entity_id: string, detail?: string) {
  await run(
    "INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, detail) VALUES (?, ?, ?, ?, ?, ?)",
    [userId, user_name, action, entity, entity_id, detail || ""]
  );
}

export type ActionState = { error?: string; ok?: boolean; message?: string };

export async function createMeeting(data: {
  numero: number;
  data: string;
  horario: string;
  local: string;
  pauta: string;
  coordenador_id: number | null;
  secretario_id: number | null;
}): Promise<ActionState> {
  const user = await requireRole(...rolesCom("gerenciar_reunioes"));
  const res = await run(
    "INSERT INTO meetings (numero, data, horario, local, pauta, coordenador_id, secretario_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [data.numero, data.data, data.horario, data.local, data.pauta, data.coordenador_id, data.secretario_id]
  );
  const members = await all<{ id: number }>("SELECT id FROM users WHERE role IN ('coordenador','membro')");
  for (const m of members) {
    await run("INSERT INTO meeting_members (meeting_id, user_id) VALUES (?, ?)", [Number(res.lastInsertRowid), m.id]);
  }
  await audit(user.id, user.name, "Criou reunião #" + data.numero, "meeting", String(res.lastInsertRowid));
  revalidatePath("/reunioes");
  return { ok: true, message: "Reunião criada." };
}

export async function startMeeting(meetingId: number): Promise<ActionState> {
  const user = await requireRole(...rolesCom("gerenciar_reunioes"));
  await run("UPDATE meetings SET status = 'em_andamento', started_at = ? WHERE id = ?", [now(), meetingId]);
  await run("INSERT INTO meeting_events (meeting_id, user_id, hora, tipo, descricao) VALUES (?, ?, ?, 'inicio', 'Reunião iniciada')", [
    meetingId,
    user.id,
    new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  ]);
  await audit(user.id, user.name, "Iniciou reunião", "meeting", String(meetingId));
  revalidatePath(`/reunioes/${meetingId}`);
  return { ok: true };
}

export async function endMeeting(meetingId: number): Promise<ActionState> {
  const user = await requireRole(...rolesCom("gerenciar_reunioes"));
  await run("UPDATE meetings SET status = 'encerrada', ended_at = ? WHERE id = ?", [now(), meetingId]);
  await run("INSERT INTO meeting_events (meeting_id, user_id, hora, tipo, descricao) VALUES (?, ?, ?, 'encerramento', 'Reunião encerrada')", [
    meetingId,
    user.id,
    new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  ]);
  await audit(user.id, user.name, "Encerrou reunião", "meeting", String(meetingId));
  revalidatePath(`/reunioes/${meetingId}`);
  return { ok: true };
}

export async function setPresence(meetingId: number, userId: number, presente: boolean): Promise<ActionState> {
  await requireRole(...rolesCom("gerenciar_reunioes"));
  await run("UPDATE meeting_members SET presente = ? WHERE meeting_id = ? AND user_id = ?", [presente ? 1 : 0, meetingId, userId]);
  revalidatePath(`/reunioes/${meetingId}`);
  return { ok: true };
}

export async function addManualEvent(meetingId: number, descricao: string): Promise<ActionState> {
  const user = await requireRole(...rolesCom("gerenciar_reunioes"));
  if (!descricao.trim()) return { error: "Descreva o evento." };
  await run("INSERT INTO meeting_events (meeting_id, user_id, hora, tipo, descricao) VALUES (?, ?, ?, 'registro', ?)", [
    meetingId,
    user.id,
    new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    descricao,
  ]);
  await audit(user.id, user.name, "Registrou evento em reunião", "meeting", String(meetingId), descricao);
  revalidatePath(`/reunioes/${meetingId}`);
  return { ok: true };
}

export async function addDecision(
  meetingId: number,
  provisionId: string | null,
  tipo: string,
  texto: string
): Promise<ActionState> {
  const user = await requireRole(...rolesCom("gerenciar_reunioes"));
  if (!texto.trim()) return { error: "Descreva a deliberação." };
  const meeting = await get<{ numero: number; data: string }>("SELECT numero, data FROM meetings WHERE id = ?", [meetingId]);
  if (!meeting) return { error: "Reunião não encontrada." };
  const code = `DEC-${meeting.data.slice(0, 10)}-${String(meeting.numero).padStart(3, "0")}`;
  const n = (await get<{ c: number }>("SELECT COUNT(*) c FROM meeting_decisions WHERE meeting_id = ?", [meetingId]))?.c ?? 0;
  const fullCode = `${code}-${String(n + 1).padStart(3, "0")}`;
  await run("INSERT INTO meeting_decisions (code, meeting_id, provision_id, tipo, texto, user_id) VALUES (?, ?, ?, ?, ?, ?)", [
    fullCode,
    meetingId,
    provisionId,
    tipo,
    texto,
    user.id,
  ]);
  await run("INSERT INTO meeting_events (meeting_id, user_id, hora, tipo, descricao) VALUES (?, ?, ?, 'deliberacao', ?)", [
    meetingId,
    user.id,
    new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    `${fullCode} — ${texto.slice(0, 140)}`,
  ]);
  await audit(user.id, user.name, "Registrou deliberação " + fullCode, "meeting", String(meetingId));
  revalidatePath(`/reunioes/${meetingId}`);
  return { ok: true, message: fullCode };
}

export async function updateMeeting(
  meetingId: number,
  data: {
    numero: number;
    data: string;
    horario: string;
    local: string;
    pauta: string;
    coordenador_id: number | null;
    secretario_id: number | null;
  }
): Promise<ActionState> {
  const user = await requireRole(...rolesCom("gerenciar_reunioes"));
  const exists = await get("SELECT id FROM meetings WHERE id = ?", [meetingId]);
  if (!exists) return { error: "Reunião não encontrada." };
  await run(
    "UPDATE meetings SET numero = ?, data = ?, horario = ?, local = ?, pauta = ?, coordenador_id = ?, secretario_id = ? WHERE id = ?",
    [data.numero, data.data, data.horario, data.local, data.pauta, data.coordenador_id, data.secretario_id, meetingId]
  );
  await audit(user.id, user.name, "Atualizou reunião", "meeting", String(meetingId));
  revalidatePath(`/reunioes/${meetingId}`);
  revalidatePath("/reunioes");
  return { ok: true, message: "Reunião atualizada." };
}

export async function deleteMeeting(meetingId: number): Promise<ActionState> {
  const user = await requireRole(...rolesCom("gerenciar_reunioes"));
  const meeting = await get<{ numero: number }>("SELECT numero FROM meetings WHERE id = ?", [meetingId]);
  if (!meeting) return { error: "Reunião não encontrada." };
  const ataAprovada = (await get<{ c: number }>(
    "SELECT COUNT(*) c FROM minutes WHERE meeting_id = ? AND status = 'aprovada'",
    [meetingId]
  ))?.c ?? 0;
  if (ataAprovada > 0) {
    return { error: "Não é possível excluir uma reunião com ata aprovada." };
  }
  await transaction(async () => {
    await run("DELETE FROM meeting_decisions WHERE meeting_id = ?", [meetingId]);
    await run("DELETE FROM meeting_events WHERE meeting_id = ?", [meetingId]);
    await run("DELETE FROM meeting_members WHERE meeting_id = ?", [meetingId]);
    await run("DELETE FROM minutes WHERE meeting_id = ?", [meetingId]);
    await run("DELETE FROM meetings WHERE id = ?", [meetingId]);
    await audit(user.id, user.name, "Excluiu reunião nº " + meeting.numero, "meeting", String(meetingId));
  });
  revalidatePath("/reunioes");
  return { ok: true, message: "Reunião excluída." };
}

export async function generateMinutes(meetingId: number): Promise<ActionState> {
  const user = await requireRole(...rolesCom("gerenciar_reunioes"));
  const meeting = await get<{
    numero: number; data: string; horario: string | null; local: string | null; pauta: string | null;
    started_at: string | null; ended_at: string | null;
    coordenador: string | null; secretario: string | null;
  }>(`
    SELECT m.*, cu.name AS coordenador, su.name AS secretario
    FROM meetings m
    LEFT JOIN users cu ON cu.id = m.coordenador_id
    LEFT JOIN users su ON su.id = m.secretario_id
    WHERE m.id = ?
  `, [meetingId]);
  if (!meeting) return { error: "Reunião não encontrada." };

  const presentes = await all<{ name: string }>(
    "SELECT u.name FROM meeting_members mm JOIN users u ON u.id = mm.user_id WHERE mm.meeting_id = ? AND mm.presente = 1 ORDER BY u.name",
    [meetingId]
  );
  const total = (await get<{ c: number }>("SELECT COUNT(*) c FROM meeting_members WHERE meeting_id = ?", [meetingId]))?.c ?? 0;
  const eventos = await all<{ hora: string; descricao: string }>(
    "SELECT hora, descricao FROM meeting_events WHERE meeting_id = ? ORDER BY id",
    [meetingId]
  );
  const decisoes = await all<{ code: string; texto: string; provision_id: string | null }>(
    "SELECT code, texto, provision_id FROM meeting_decisions WHERE meeting_id = ? ORDER BY id",
    [meetingId]
  );

  const linhas: string[] = [];
  linhas.push(`ATA DA REUNIÃO Nº ${meeting.numero} DA COMISSÃO DE REFORMA DO ESTATUTO SOCIAL DA IGREJA BATISTA OLARIA`);
  linhas.push("");
  linhas.push(`Data: ${meeting.data}${meeting.horario ? `, às ${meeting.horario}` : ""}`);
  if (meeting.local) linhas.push(`Local: ${meeting.local}`);
  if (meeting.coordenador) linhas.push(`Coordenação: ${meeting.coordenador}`);
  if (meeting.secretario) linhas.push(`Secretário(a): ${meeting.secretario}`);
  linhas.push(`Presentes: ${presentes.length}/${total} — ${presentes.map((p) => p.name).join(", ") || "não registrado"}`);
  linhas.push("");
  if (meeting.pauta) {
    linhas.push(`Pauta: ${meeting.pauta}`);
    linhas.push("");
  }
  if (eventos.length) {
    linhas.push("Registro da sessão:");
    for (const e of eventos) linhas.push(`  ${e.hora} — ${e.descricao}`);
    linhas.push("");
  }
  if (decisoes.length) {
    linhas.push("Deliberações:");
    for (const d of decisoes) linhas.push(`  ${d.code}${d.provision_id ? ` (${d.provision_id})` : ""} — ${d.texto}`);
    linhas.push("");
  }
  linhas.push("Nada mais havendo a tratar, encerra-se a presente ata, que, aprovada, será assinada pelos presentes.");

  await run(`INSERT INTO minutes (meeting_id, status, conteudo) VALUES (?, 'rascunho', ?)
       ON CONFLICT(meeting_id) DO UPDATE SET conteudo = excluded.conteudo, status = 'rascunho', updated_at = datetime('now')`,
    [meetingId, linhas.join("\n")]);
  await audit(user.id, user.name, "Gerou minuta de ata", "meeting", String(meetingId));
  revalidatePath(`/reunioes/${meetingId}`);
  return { ok: true, message: "Minuta gerada com base nos registros da reunião." };
}

export async function setMinutesStatus(minutesId: number, status: string): Promise<ActionState> {
  const user = await requireRole(...rolesCom("gerenciar_reunioes"));
  const m = await get<{ meeting_id: number }>("SELECT meeting_id FROM minutes WHERE id = ?", [minutesId]);
  if (!m) return { error: "Minuta não encontrada." };
  await run("UPDATE minutes SET status = ?, updated_at = datetime('now') WHERE id = ?", [status, minutesId]);
  await audit(user.id, user.name, "Ata em status " + status, "minutes", String(minutesId));
  revalidatePath(`/reunioes/${m.meeting_id}`);
  return { ok: true };
}

export async function saveMinutes(meetingId: number, content: string): Promise<ActionState> {
  const user = await requireRole(...rolesCom("gerenciar_reunioes"));
  await run(`INSERT INTO minutes (meeting_id, status, conteudo) VALUES (?, 'rascunho', ?)
       ON CONFLICT(meeting_id) DO UPDATE SET conteudo = excluded.conteudo, status = 'rascunho', updated_at = datetime('now')`,
    [meetingId, content]);
  await audit(user.id, user.name, "Atualizou minuta de ata", "meeting", String(meetingId));
  revalidatePath(`/reunioes/${meetingId}`);
  return { ok: true };
}

export async function reviewMinutes(minutesId: number, opinion: string, content: string): Promise<ActionState> {
  const user = await requireRole(...rolesCom("revisar_ata"));
  const m = await get<{ meeting_id: number }>("SELECT meeting_id FROM minutes WHERE id = ?", [minutesId]);
  if (!m) return { error: "Minuta não encontrada." };
  await run("INSERT INTO minutes_reviews (minutes_id, user_id, opinion, content) VALUES (?, ?, ?, ?)", [
    minutesId,
    user.id,
    opinion,
    content || "",
  ]);
  revalidatePath(`/reunioes/${m.meeting_id}`);
  return { ok: true };
}

export async function addMinuteRetification(minutesId: number, content: string): Promise<ActionState> {
  const user = await requireRole(...rolesCom("revisar_ata"));
  if (!content.trim()) return { error: "Informe o texto da retificação." };
  const m = await get<{ meeting_id: number }>("SELECT meeting_id FROM minutes WHERE id = ?", [minutesId]);
  if (!m) return { error: "Ata não encontrada." };
  await run("INSERT INTO minutes_retifications (minutes_id, content, author_id) VALUES (?, ?, ?)", [
    minutesId,
    content.trim(),
    user.id,
  ]);
  await audit(user.id, user.name, "Registrou retificação de ata", "minutes", String(minutesId));
  revalidatePath(`/reunioes/${m.meeting_id}`);
  return { ok: true, message: "Retificação registrada." };
}