"use server";

import { revalidatePath } from "next/cache";
import { get, run, transaction, now } from "@/lib/db";
import { getActiveMeeting, provisionLabel } from "@/lib/data";
import type { Provision } from "@/lib/types";
import { requireRole, requireUser } from "@/lib/auth";

function audit(userId: number, user_name: string, action: string, entity: string, entity_id: string, detail?: string) {
  run(
    "INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, detail) VALUES (?, ?, ?, ?, ?, ?)",
    [userId, user_name, action, entity, entity_id, detail || ""]
  );
}

function logMeetingEvent(tipo: string, descricao: string, userId: number | null) {
  const meeting = getActiveMeeting();
  if (!meeting) return;
  const hora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  run("INSERT INTO meeting_events (meeting_id, user_id, hora, tipo, descricao) VALUES (?, ?, ?, ?, ?)", [
    meeting.id,
    userId,
    hora,
    tipo,
    descricao,
  ]);
}

export type ActionState = { error?: string; conflict?: boolean; ok?: boolean; message?: string };

export async function updateRedacao(
  provisionId: string,
  content: string,
  expectedVersion: number,
  reason: string
): Promise<ActionState> {
  const user = await requireRole("coordenador", "admin");
  const prov = get<{ version: number; redacao_trabalho: string }>(
    "SELECT version, redacao_trabalho FROM provisions WHERE id = ?",
    [provisionId]
  );
  if (!prov) return { error: "Dispositivo não encontrado." };
  if (prov.version !== expectedVersion) {
    return {
      conflict: true,
      error: "Este dispositivo foi alterado desde que você iniciou a edição. Revise a versão mais recente antes de salvar.",
    };
  }
  if (!content.trim()) return { error: "A redação não pode ficar vazia." };

  const ts = now();
  transaction(() => {
    run("INSERT INTO provision_versions (provision_id, version, content, reason, author_id, created_at) VALUES (?, ?, ?, ?, ?, ?)", [
      provisionId,
      prov.version,
      prov.redacao_trabalho,
      reason || null,
      user.id,
      ts,
    ]);
    run("UPDATE provisions SET redacao_trabalho = ?, version = version + 1, updated_at = ?, updated_by = ?, status = CASE WHEN status = 'nao_iniciado' THEN 'em_analise' ELSE status END WHERE id = ?", [
      content,
      ts,
      user.id,
      provisionId,
    ]);
    audit(user.id, user.name, "Redação de trabalho atualizada", "provision", provisionId, reason || "");
  });
  logMeetingEvent("redacao_atualizada", `Redação de ${provisionId} atualizada`, user.id);
  revalidatePath(`/dispositivo/${provisionId}`);
  return { ok: true, message: "Redação salva. Nova versão criada." };
}

export async function updateJustificativa(provisionId: string, justificativa: string): Promise<ActionState> {
  const user = await requireRole("coordenador", "admin");
  run("UPDATE provisions SET justificativa = ?, updated_at = ? WHERE id = ?", [justificativa, now(), provisionId]);
  audit(user.id, user.name, "Justificativa atualizada", "provision", provisionId);
  revalidatePath(`/dispositivo/${provisionId}`);
  return { ok: true };
}

export async function updateHistoricalText(
  provisionId: string,
  campo: "texto_vigente" | "proposta_inicial",
  novoTexto: string
): Promise<ActionState> {
  const user = await requireRole("admin");
  const prov = get<{ texto_vigente: string; proposta_inicial: string }>(
    "SELECT texto_vigente, proposta_inicial FROM provisions WHERE id = ?",
    [provisionId]
  );
  if (!prov) return { error: "Dispositivo não encontrado." };
  const rotulo = campo === "texto_vigente" ? "Texto vigente" : "Proposta inicial";
  const antigo = prov[campo];
  const ts = now();
  transaction(() => {
    run(`UPDATE provisions SET ${campo} = ?, updated_at = ? WHERE id = ?`, [novoTexto, ts, provisionId]);
    audit(
      user.id,
      user.name,
      `Correção de extração — ${rotulo}`,
      "provision",
      provisionId,
      `Antes: ${antigo.slice(0, 200)}\nDepois: ${novoTexto.slice(0, 200)}`
    );
  });
  revalidatePath(`/dispositivo/${provisionId}`);
  return { ok: true, message: `${rotulo} corrigido e registrado em auditoria.` };
}

export async function setStatus(provisionId: string, status: string): Promise<ActionState> {
  const user = await requireRole("coordenador", "admin");
  const allowed = ["nao_iniciado", "em_analise", "em_discussao", "redacao_definida", "aprovado", "reaberto"];
  if (!allowed.includes(status)) return { error: "Status inválido." };

  transaction(() => {
    if (status === "aprovado") {
      run("UPDATE provisions SET status = 'aprovado', redacao_consolidada = redacao_trabalho, updated_at = ? WHERE id = ?", [now(), provisionId]);
    } else {
      run("UPDATE provisions SET status = ?, updated_at = ? WHERE id = ?", [status, now(), provisionId]);
    }
    audit(user.id, user.name, "Status alterado para " + status, "provision", provisionId);
  });
  logMeetingEvent(status === "aprovado" ? "aprovado" : "status", `${provisionId} ${status === "aprovado" ? "aprovado" : "marcado como " + status}`, user.id);
  revalidatePath(`/dispositivo/${provisionId}`);
  revalidatePath("/");
  return { ok: true };
}

export async function createSuggestion(
  provisionId: string,
  texto: string,
  justificativa: string,
  ondeEsta: string
): Promise<ActionState> {
  const user = await requireRole("coordenador", "admin", "membro");
  if (!texto.trim()) return { error: "Informe o texto da sugestão." };
  const res = run(
    "INSERT INTO suggestions (provision_id, author_id, texto, justificativa, onde_esta, status) VALUES (?, ?, ?, ?, ?, 'aberta')",
    [provisionId, user.id, texto, justificativa || "", ondeEsta || ""]
  );
  audit(user.id, user.name, "Criou sugestão #" + res.lastInsertRowid, "provision", provisionId);
  logMeetingEvent("sugestao", `Sugestão #${res.lastInsertRowid} criada em ${provisionId}`, user.id);
  revalidatePath(`/dispositivo/${provisionId}`);
  return { ok: true, message: "Sugestão registrada." };
}

export async function createProvision(
  parentId: string | null,
  tipo: string,
  texto: string,
  justificativa: string
): Promise<ActionState & { id?: string }> {
  const user = await requireRole("coordenador", "admin");
  const tipos = ["capitulo", "secao", "artigo", "paragrafo", "inciso", "alinea"];
  if (!tipos.includes(tipo)) return { error: "Tipo de dispositivo inválido." };
  if (!texto.trim()) return { error: "Informe o texto do novo dispositivo." };

  const HIERARQUIA: Record<string, string[]> = {
    capitulo: ["secao", "artigo"],
    secao: ["artigo"],
    artigo: ["paragrafo", "inciso"],
    paragrafo: ["inciso", "alinea"],
    inciso: ["alinea"],
    alinea: [],
  };

  if (tipo === "capitulo" && parentId) {
    return { error: "Capítulos são criados na raiz do documento, sem dispositivo pai." };
  }

  let pai = null;
  if (parentId) {
    pai = get<Provision>("SELECT * FROM provisions WHERE id = ?", [parentId]);
    if (!pai) return { error: "Dispositivo pai não encontrado." };
    if (!HIERARQUIA[pai.type]?.includes(tipo)) {
      return { error: `Não é possível criar ${tipo} dentro de ${pai.type}.` };
    }
  }

  const ts = now();
  const id = `novo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const posicao = pai ? `Após o atual ${provisionLabel(pai)}` : "Ao final do documento";

  transaction(() => {
    const maxOrdem = get<{ m: number }>("SELECT COALESCE(MAX(ordem), 0) m FROM provisions")?.m ?? 0;
    const maxOrdemPai = pai
      ? get<{ m: number }>("SELECT COALESCE(MAX(ordem_pai), -1) m FROM provisions WHERE parent_id = ?", [pai.id])?.m ?? -1
      : get<{ m: number }>("SELECT COALESCE(MAX(ordem_pai), -1) m FROM provisions WHERE parent_id IS NULL")?.m ?? -1;
    run(
      `INSERT INTO provisions
       (id, parent_id, type, ordem, ordem_pai, origem, alteracao_tipo, status,
        proposta_inicial, redacao_trabalho, justificativa, posicao_sugerida, version, updated_at, updated_by)
       VALUES (?, ?, ?, ?, ?, 'novo', 'novo', 'nao_iniciado', ?, ?, ?, ?, 0, ?, ?)`,
      [id, parentId, tipo, maxOrdem + 1, maxOrdemPai + 1, texto, texto, justificativa || "", posicao, ts, user.id]
    );
    audit(user.id, user.name, `Criou novo ${tipo}`, "provision", id, `Posição: ${posicao}`);
  });

  revalidatePath("/");
  if (parentId) revalidatePath(`/dispositivo/${parentId}`);
  return { ok: true, id, message: `${tipo} criado. Numeração definitiva será definida na consolidação.` };
}

export async function updateProvision(
  provisionId: string,
  data: { numero: string; titulo: string; posicaoSugerida: string }
): Promise<ActionState> {
  const user = await requireRole("coordenador", "admin");
  const prov = get<Provision>("SELECT * FROM provisions WHERE id = ?", [provisionId]);
  if (!prov) return { error: "Dispositivo não encontrado." };
  const ts = now();
  transaction(() => {
    run("UPDATE provisions SET numero = ?, titulo = ?, posicao_sugerida = ?, updated_at = ? WHERE id = ?", [
      data.numero.trim() || null,
      data.titulo.trim() || null,
      data.posicaoSugerida.trim() || null,
      ts,
      provisionId,
    ]);
    audit(user.id, user.name, "Editou dispositivo", "provision", provisionId, "Dados de numeração/posição atualizados");
  });
  revalidatePath(`/dispositivo/${provisionId}`);
  revalidatePath("/");
  return { ok: true, message: "Dispositivo atualizado." };
}

export async function deleteProvision(provisionId: string): Promise<ActionState> {
  const user = await requireRole("coordenador", "admin");
  const prov = get<Provision>("SELECT * FROM provisions WHERE id = ?", [provisionId]);
  if (!prov) return { error: "Dispositivo não encontrado." };
  if (prov.origem === "original") {
    return {
      error:
        "Dispositivo original do Estatuto registrado não pode ser excluído (documento histórico). Para removê-lo do texto final, altere o status para 'revogado'.",
    };
  }
  const descendentes = get<{ c: number }>(
    `WITH RECURSIVE desc AS (
       SELECT id FROM provisions WHERE id = ?
       UNION ALL
       SELECT p.id FROM provisions p JOIN desc d ON p.parent_id = d.id
     ) SELECT COUNT(*) - 1 AS c FROM desc`,
    [provisionId]
  )?.c ?? 0;

  transaction(() => {
    run("DELETE FROM provisions WHERE id = ?", [provisionId]);
    audit(
      user.id,
      user.name,
      "Excluiu dispositivo",
      "provision",
      provisionId,
      `Tipo: ${prov.type}${prov.numero ? `, número: ${prov.numero}` : ""}${descendentes > 0 ? `, ${descendentes} dispositivo(s) filho(s) removido(s) em cascata` : ""}`
    );
  });
  revalidatePath("/");
  revalidatePath(`/dispositivo/${provisionId}`);
  revalidatePath("/consolidado");
  return { ok: true, message: "Dispositivo excluído." };
}

export async function updateSuggestionStatus(suggestionId: number, status: string): Promise<ActionState> {
  const user = await requireRole("coordenador", "admin");
  const allowed = ["aberta", "em_discussao", "aceita", "aceita_parcialmente", "rejeitada", "retirada"];
  if (!allowed.includes(status)) return { error: "Status inválido." };
  const sug = get<{ provision_id: string }>("SELECT provision_id FROM suggestions WHERE id = ?", [suggestionId]);
  if (!sug) return { error: "Sugestão não encontrada." };
  run("UPDATE suggestions SET status = ? WHERE id = ?", [status, suggestionId]);
  audit(user.id, user.name, `Sugestão #${suggestionId} ${status}`, "suggestion", String(suggestionId));
  logMeetingEvent(status === "aceita" ? "sugestao_aceita" : "sugestao", `Sugestão #${suggestionId} ${status}`, user.id);
  revalidatePath(`/dispositivo/${sug.provision_id}`);
  return { ok: true };
}

export async function createComment(
  provisionId: string | null,
  suggestionId: number | null,
  content: string
): Promise<ActionState> {
  const user = await requireUser();
  if (!content.trim()) return { error: "Escreva um comentário." };
  run("INSERT INTO comments (author_id, provision_id, suggestion_id, content) VALUES (?, ?, ?, ?)", [
    user.id,
    provisionId,
    suggestionId,
    content,
  ]);
  audit(user.id, user.name, "Comentou", "provision", provisionId || "", content.slice(0, 120));
  revalidatePath(provisionId ? `/dispositivo/${provisionId}` : "/");
  return { ok: true };
}

export async function createPendingIssue(provisionId: string, categoria: string, descricao: string): Promise<ActionState> {
  const user = await requireRole("coordenador", "admin", "membro");
  if (!descricao.trim()) return { error: "Descreva a pendência." };
  const res = run("INSERT INTO pending_issues (provision_id, author_id, categoria, descricao) VALUES (?, ?, ?, ?)", [
    provisionId,
    user.id,
    categoria,
    descricao,
  ]);
  audit(user.id, user.name, "Registrou pendência #" + res.lastInsertRowid, "provision", provisionId);
  revalidatePath(`/dispositivo/${provisionId}`);
  return { ok: true };
}

export async function resolvePending(pendingId: number, provisionId: string): Promise<ActionState> {
  const user = await requireUser();
  run("UPDATE pending_issues SET status = 'resolvida' WHERE id = ?", [pendingId]);
  audit(user.id, user.name, "Pendência #" + pendingId + " resolvida", "provision", provisionId);
  revalidatePath(`/dispositivo/${provisionId}`);
  revalidatePath("/pendentes");
  return { ok: true };
}

export async function createReference(provisionId: string, tipo: string, texto: string): Promise<ActionState> {
  const user = await requireRole("coordenador", "admin", "membro");
  if (!texto.trim()) return { error: "Informe a referência." };
  run("INSERT INTO references_tb (provision_id, tipo, texto, author_id) VALUES (?, ?, ?, ?)", [
    provisionId,
    tipo,
    texto,
    user.id,
  ]);
  audit(user.id, user.name, "Adicionou referência " + tipo, "provision", provisionId);
  revalidatePath(`/dispositivo/${provisionId}`);
  return { ok: true };
}

export async function vote(provisionId: string, opinion: string): Promise<ActionState> {
  const user = await requireRole("coordenador", "admin", "membro");
  const allowed = ["concordo", "discordo", "ressalva"];
  if (!allowed.includes(opinion)) return { error: "Voto inválido." };
  run(
    `INSERT INTO votes (user_id, provision_id, opinion) VALUES (?, ?, ?)
     ON CONFLICT(user_id, provision_id) WHERE suggestion_id IS NULL
     DO UPDATE SET opinion = excluded.opinion, created_at = datetime('now')`,
    [user.id, provisionId, opinion]
  );
  revalidatePath(`/dispositivo/${provisionId}`);
  return { ok: true };
}

export async function removeVote(provisionId: string): Promise<ActionState> {
  const user = await requireUser();
  run("DELETE FROM votes WHERE user_id = ? AND provision_id = ?", [user.id, provisionId]);
  revalidatePath(`/dispositivo/${provisionId}`);
  return { ok: true };
}

export async function addProvisionRelation(provisionId: string, relatedId: string): Promise<ActionState> {
  const user = await requireRole("coordenador", "admin");
  run("INSERT OR IGNORE INTO provision_relations (provision_id, related_id) VALUES (?, ?)", [provisionId, relatedId]);
  audit(user.id, user.name, "Vinculou dispositivo", "provision", provisionId, "relacionado a " + relatedId);
  revalidatePath(`/dispositivo/${provisionId}`);
  return { ok: true };
}

export async function removeProvisionRelation(provisionId: string, relatedId: string): Promise<ActionState> {
  await requireUser();
  run("DELETE FROM provision_relations WHERE provision_id = ? AND related_id = ?", [provisionId, relatedId]);
  revalidatePath(`/dispositivo/${provisionId}`);
  return { ok: true };
}
