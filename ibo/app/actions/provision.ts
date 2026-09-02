"use server";

import { revalidatePath } from "next/cache";
import { get, run, transaction, now, all } from "@/lib/db";
import { getActiveMeeting, provisionLabel } from "@/lib/data";
import type { Provision } from "@/lib/types";
import { requireRole, requireUser } from "@/lib/auth";
import { ALTERACAO_TYPE_LABELS } from "@/lib/labels";
import { sanitizeHtml, htmlToText } from "@/lib/rich-text";
import { inserirApos, validarMovimento, type NoEstrutural } from "@/lib/reorder-core";
import { rolesCom } from "@/lib/permissions";
import { avaliarConflito } from "@/lib/version-guard";

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

export type ActionState = { error?: string; conflict?: boolean; ok?: boolean; message?: string };

export async function updateRedacao(
  provisionId: string,
  content: string,
  expectedVersion: number,
  reason: string
): Promise<ActionState> {
  const user = await requireRole(...rolesCom("editar_redacao"));
  const prov = await get<{ version: number; redacao_trabalho: string }>(
    "SELECT version, redacao_trabalho FROM provisions WHERE id = ?",
    [provisionId]
  );
  if (!prov) return { error: "Dispositivo não encontrado." };
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
  await logMeetingEvent("redacao_atualizada", `Redação de ${provisionId} atualizada`, user.id);
  revalidatePath(`/dispositivo/${provisionId}`);
  return { ok: true, message: "Redação salva. Nova versão criada." };
}

export async function updateJustificativa(provisionId: string, justificativa: string): Promise<ActionState> {
  const user = await requireRole(...rolesCom("editar_justificativa"));
  await run("UPDATE provisions SET justificativa = ?, updated_at = ? WHERE id = ?", [sanitizeHtml(justificativa), now(), provisionId]);
  await audit(user.id, user.name, "Justificativa atualizada", "provision", provisionId);
  revalidatePath(`/dispositivo/${provisionId}`);
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
  return { ok: true, message: `${rotulo} corrigido e registrado em auditoria.` };
}

export async function setStatus(provisionId: string, status: string): Promise<ActionState> {
  const user = await requireRole(...rolesCom("gerenciar_status"));
  const allowed = ["nao_iniciado", "em_analise", "em_discussao", "redacao_definida", "aprovado", "reaberto"];
  if (!allowed.includes(status)) return { error: "Status inválido." };

  await transaction(async () => {
    if (status === "aprovado") {
      await run("UPDATE provisions SET status = 'aprovado', redacao_consolidada = redacao_trabalho, updated_at = ? WHERE id = ?", [now(), provisionId]);
    } else {
      await run("UPDATE provisions SET status = ?, updated_at = ? WHERE id = ?", [status, now(), provisionId]);
    }
    await audit(user.id, user.name, "Status alterado para " + status, "provision", provisionId);
  });
  await logMeetingEvent(status === "aprovado" ? "aprovado" : "status", `${provisionId} ${status === "aprovado" ? "aprovado" : "marcado como " + status}`, user.id);
  revalidatePath(`/dispositivo/${provisionId}`);
  revalidatePath("/");
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
  await logMeetingEvent("alteracao", `Dispositivo ${provisionId} classificado como ${tipo}`, user.id);
  revalidatePath(`/dispositivo/${provisionId}`);
  revalidatePath("/");
  return { ok: true, message: `Classificação: ${ALTERACAO_TYPE_LABELS[tipo] || tipo}.` };
}

export async function createSuggestion(
  provisionId: string,
  texto: string,
  justificativa: string,
  ondeEsta: string
): Promise<ActionState> {
  const user = await requireRole(...rolesCom("contribuir"));
  if (!texto.trim()) return { error: "Informe o texto da sugestão." };
  const res = await run(
    "INSERT INTO suggestions (provision_id, author_id, texto, justificativa, onde_esta, status) VALUES (?, ?, ?, ?, ?, 'aberta')",
    [provisionId, user.id, texto, justificativa || "", ondeEsta || ""]
  );
  await audit(user.id, user.name, "Criou sugestão #" + res.lastInsertRowid, "provision", provisionId);
  await logMeetingEvent("sugestao", `Sugestão #${res.lastInsertRowid} criada em ${provisionId}`, user.id);
  revalidatePath(`/dispositivo/${provisionId}`);
  return { ok: true, message: "Sugestão registrada." };
}

export async function createProvision(
  parentId: string | null,
  tipo: string,
  texto: string,
  justificativa: string,
  titulo?: string,
  numero?: string
): Promise<ActionState & { id?: string }> {
  const user = await requireRole(...rolesCom("gerenciar_dispositivos"));
  const tipos = ["capitulo", "secao", "artigo", "paragrafo", "inciso", "alinea"];
  if (!tipos.includes(tipo)) return { error: "Tipo de dispositivo inválido." };
  if (!texto.trim()) return { error: "Informe o texto do novo dispositivo." };

  const HIERARQUIA: Record<string, string[]> = {
    capitulo: ["secao", "artigo"],
    secao: ["artigo"],
    artigo: ["paragrafo", "inciso", "alinea"],
    paragrafo: ["inciso", "alinea"],
    inciso: ["alinea"],
    alinea: [],
  };

  if (tipo === "capitulo" && parentId) {
    return { error: "Capítulos são criados na raiz do documento, sem dispositivo pai." };
  }

  let pai = null;
  if (parentId) {
    pai = await get<Provision>("SELECT * FROM provisions WHERE id = ?", [parentId]);
    if (!pai) return { error: "Dispositivo pai não encontrado." };
    if (!HIERARQUIA[pai.type]?.includes(tipo)) {
      return { error: `Não é possível criar ${tipo} dentro de ${pai.type}.` };
    }
  }

  const ts = now();
  const id = `novo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const posicao = pai ? `Após o atual ${provisionLabel(pai)}` : "Ao final do documento";
  const cleanTexto = sanitizeHtml(texto);

  await transaction(async () => {
    const maxOrdem = (await get<{ m: number }>("SELECT COALESCE(MAX(ordem), 0) m FROM provisions"))?.m ?? 0;
    const maxOrdemPai = pai
      ? (await get<{ m: number }>("SELECT COALESCE(MAX(ordem_pai), -1) m FROM provisions WHERE parent_id = ?", [pai.id]))?.m ?? -1
      : (await get<{ m: number }>("SELECT COALESCE(MAX(ordem_pai), -1) m FROM provisions WHERE parent_id IS NULL"))?.m ?? -1;
    await run(
      `INSERT INTO provisions
       (id, parent_id, type, numero, titulo, ordem, ordem_pai, origem, alteracao_tipo, status,
        proposta_inicial, redacao_trabalho, justificativa, posicao_sugerida, version, updated_at, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'novo', 'novo', 'nao_iniciado', ?, ?, ?, ?, 0, ?, ?)`,
      [id, parentId, tipo, numero?.trim() || null, titulo?.trim() || null, maxOrdem + 1, maxOrdemPai + 1, cleanTexto, cleanTexto, sanitizeHtml(justificativa || ""), posicao, ts, user.id]
    );
    await audit(user.id, user.name, `Criou novo ${tipo}`, "provision", id, `Posição: ${posicao}`);
  });

  revalidatePath("/");
  if (parentId) revalidatePath(`/dispositivo/${parentId}`);
  return { ok: true, id, message: `${tipo} criado. Numeração definitiva será definida na consolidação.` };
}

export async function updateProvision(
  provisionId: string,
  data: { numero: string; titulo: string; posicaoSugerida: string }
): Promise<ActionState> {
  const user = await requireRole(...rolesCom("gerenciar_dispositivos"));
  const prov = await get<Provision>("SELECT * FROM provisions WHERE id = ?", [provisionId]);
  if (!prov) return { error: "Dispositivo não encontrado." };
  const ts = now();
  await transaction(async () => {
    await run("UPDATE provisions SET numero = ?, titulo = ?, posicao_sugerida = ?, updated_at = ? WHERE id = ?", [
      data.numero.trim() || null,
      data.titulo.trim() || null,
      data.posicaoSugerida.trim() || null,
      ts,
      provisionId,
    ]);
    await audit(user.id, user.name, "Editou dispositivo", "provision", provisionId, "Dados de numeração/posição atualizados");
  });
  revalidatePath(`/dispositivo/${provisionId}`);
  revalidatePath("/");
  return { ok: true, message: "Dispositivo atualizado." };
}

/**
 * PRD §17 (2ª etapa) — reordenação física: move um dispositivo para outro pai
 * (`newParentId`, null = raiz do documento) e para uma posição entre irmãos
 * (`afterId`, null = primeiro). Valida hierarquia e ciclos, renumera `ordem_pai`
 * dos irmãos afetados e registra auditoria/evento de reunião. Nunca altera textos.
 */
export async function moveProvision(
  provisionId: string,
  newParentId: string | null,
  afterId: string | null
): Promise<ActionState> {
  const user = await requireRole(...rolesCom("gerenciar_dispositivos"));
  const prov = await get<Provision>("SELECT * FROM provisions WHERE id = ?", [provisionId]);
  if (!prov) return { error: "Dispositivo não encontrado." };

  const rows = await all<NoEstrutural>("SELECT id, type, parent_id FROM provisions");
  const mapa = new Map(rows.map((r) => [r.id, r]));
  const erro = validarMovimento(mapa, provisionId, newParentId, afterId);
  if (erro) return { error: erro };

  const irmaos = async (parentId: string | null) => {
    const where = parentId === null ? "parent_id IS NULL" : "parent_id = ?";
    const params = parentId === null ? [] : [parentId];
    return all<{ id: string; ordem_pai: number }>(
      `SELECT id, ordem_pai FROM provisions WHERE ${where} ORDER BY ordem_pai`,
      params
    );
  };

  const irmaosAntigos = await irmaos(prov.parent_id);
  const irmaosNovos = newParentId === prov.parent_id ? irmaosAntigos : await irmaos(newParentId);

  const novaOrdem = inserirApos(irmaosNovos.map((x) => x.id), provisionId, afterId);
  const semMoved = irmaosAntigos.map((x) => x.id).filter((x) => x !== provisionId);

  const novaOrdemPai = new Map<string, number>();
  semMoved.forEach((id, i) => novaOrdemPai.set(id, i));
  novaOrdem.forEach((id, i) => novaOrdemPai.set(id, i));

  const ordemAtualPorId = new Map<string, number>();
  irmaosAntigos.forEach((x) => ordemAtualPorId.set(x.id, x.ordem_pai));
  irmaosNovos.forEach((x) => {
    if (!ordemAtualPorId.has(x.id)) ordemAtualPorId.set(x.id, x.ordem_pai);
  });

  const sameParent = newParentId === prov.parent_id;
  const noOp =
    sameParent &&
    irmaosAntigos.map((x) => x.id).every((id, i) => novaOrdem[i] === id);

  if (noOp) {
    return { ok: true, message: "O dispositivo já está nesta posição." };
  }

  const labelPai = async (parentId: string | null) => {
    if (!parentId) return "raiz do documento";
    const p = await get<Provision>("SELECT * FROM provisions WHERE id = ?", [parentId]);
    return p ? provisionLabel(p) : parentId;
  };
  const paiAntigo = await labelPai(prov.parent_id);
  const paiNovo = await labelPai(newParentId);
  const posicao = novaOrdem.indexOf(provisionId) + 1;

  const ts = now();
  await transaction(async () => {
    if (!sameParent) {
      await run("UPDATE provisions SET parent_id = ?, updated_at = ?, updated_by = ? WHERE id = ?", [
        newParentId,
        ts,
        user.id,
        provisionId,
      ]);
    }
    for (const [id, ordem_pai] of novaOrdemPai) {
      if (ordemAtualPorId.get(id) === ordem_pai && !(id === provisionId && !sameParent)) continue;
      await run("UPDATE provisions SET ordem_pai = ?, updated_at = ? WHERE id = ?", [ordem_pai, ts, id]);
    }
    await audit(
      user.id,
      user.name,
      "Moveu dispositivo",
      "provision",
      provisionId,
      `${provisionLabel(prov)}: ${paiAntigo} → ${paiNovo}, posição ${posicao}`
    );
  });
  await logMeetingEvent(
    "reordenacao",
    `${provisionLabel(prov)} movido: ${paiAntigo} → ${paiNovo}`,
    user.id
  );

  revalidatePath("/");
  revalidatePath(`/dispositivo/${provisionId}`);
  revalidatePath("/renumeracao");
  revalidatePath("/consolidado");
  return { ok: true, message: `${provisionLabel(prov)} movido para ${paiNovo}.` };
}

export async function deleteProvision(provisionId: string): Promise<ActionState> {
  const user = await requireRole(...rolesCom("gerenciar_dispositivos"));
  const prov = await get<Provision>("SELECT * FROM provisions WHERE id = ?", [provisionId]);
  if (!prov) return { error: "Dispositivo não encontrado." };
  if (prov.origem === "original") {
    return {
      error:
        "Dispositivo original do Estatuto registrado não pode ser excluído (documento histórico). Para removê-lo do texto final, altere o status para 'revogado'.",
    };
  }
  const descendentes = (await get<{ c: number }>(
    `WITH RECURSIVE sub AS (
       SELECT id FROM provisions WHERE id = ?
       UNION ALL
       SELECT p.id FROM provisions p JOIN sub d ON p.parent_id = d.id
     ) SELECT COUNT(*) - 1 AS c FROM sub`,
    [provisionId]
  ))?.c ?? 0;

  await transaction(async () => {
    await run("DELETE FROM provisions WHERE id = ?", [provisionId]);
    await audit(
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
  const user = await requireRole(...rolesCom("gerenciar_sugestoes"));
  const allowed = ["aberta", "em_discussao", "aceita", "aceita_parcialmente", "rejeitada", "retirada"];
  if (!allowed.includes(status)) return { error: "Status inválido." };
  const sug = await get<{ provision_id: string }>("SELECT provision_id FROM suggestions WHERE id = ?", [suggestionId]);
  if (!sug) return { error: "Sugestão não encontrada." };
  await run("UPDATE suggestions SET status = ? WHERE id = ?", [status, suggestionId]);
  await audit(user.id, user.name, `Sugestão #${suggestionId} ${status}`, "suggestion", String(suggestionId));
  await logMeetingEvent(status === "aceita" ? "sugestao_aceita" : "sugestao", `Sugestão #${suggestionId} ${status}`, user.id);
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
  await run("INSERT INTO comments (author_id, provision_id, suggestion_id, content) VALUES (?, ?, ?, ?)", [
    user.id,
    provisionId,
    suggestionId,
    content,
  ]);
  await audit(user.id, user.name, "Comentou", "provision", provisionId || "", content.slice(0, 120));
  revalidatePath(provisionId ? `/dispositivo/${provisionId}` : "/");
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
  return { ok: true };
}

export async function removeProvisionRelation(provisionId: string, relatedId: string): Promise<ActionState> {
  await requireRole(...rolesCom("vincular_dispositivos"));
  await run("DELETE FROM provision_relations WHERE provision_id = ? AND related_id = ?", [provisionId, relatedId]);
  revalidatePath(`/dispositivo/${provisionId}`);
  return { ok: true };
}