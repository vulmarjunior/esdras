"use server";

import { revalidatePath } from "next/cache";
import { get, all, run, transaction, now } from "@/lib/db";
import { getActiveMeeting, provisionLabel } from "@/lib/data";
import type { Provision } from "@/lib/types";
import { requireRole } from "@/lib/auth";
import { sanitizeHtml } from "@/lib/rich-text";
import { inserirApos, validarMovimento, type NoEstrutural } from "@/lib/reorder-core";
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
  await publishRealtime({ entity: "provision", id, action: "criado" });
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
  await publishRealtime({ entity: "provision", id: provisionId, action: "editado" });
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
  await publishRealtime({ entity: "provision", id: provisionId, action: "movido" });
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
  await publishRealtime({ entity: "provision", id: provisionId, action: "excluido" });
  return { ok: true, message: "Dispositivo excluído." };
}