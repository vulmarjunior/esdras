"use server";

import { revalidatePath } from "next/cache";
import { get, all, run, transaction, now } from "@/lib/db";
import { provisionLabel } from "@/lib/data";
import type { Provision } from "@/lib/types";
import { ORIGIN_LABELS } from "@/lib/labels";
import { requireRole } from "@/lib/auth";
import { sanitizeHtml } from "@/lib/rich-text";
import { inserirApos, validarMovimento, type NoEstrutural } from "@/lib/reorder-core";
import { rolesCom } from "@/lib/permissions";
import { publishRealtime } from "@/lib/realtime";
import { numerarSubordinados } from "@/lib/numeracao";
import type { ActionState } from "./state";

async function audit(userId: number, user_name: string, action: string, entity: string, entity_id: string, detail?: string) {
  await run(
    "INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, detail) VALUES (?, ?, ?, ?, ?, ?)",
    [userId, user_name, action, entity, entity_id, detail || ""]
  );
}

/**
 * O dispositivo pertence ao Estatuto registrado (histórico)? Critério usado pela
 * exclusão e pela referência de origem: placement vigente ou texto vigente.
 * Não depende da tag `origem`, que é anotação de trabalho do operador.
 */
async function pertenceAoEstatutoRegistrado(provisionId: string): Promise<boolean> {
  const placement = await get<{ id: number }>(
    "SELECT id FROM provision_placements WHERE provision_id = ? AND version_key = 'vigente'",
    [provisionId]
  );
  if (placement) return true;
  const prov = await get<{ texto_vigente: string }>(
    "SELECT texto_vigente FROM provisions WHERE id = ?",
    [provisionId]
  );
  return Boolean(prov?.texto_vigente.trim());
}

export async function createProvision(
  parentId: string | null,
  tipo: string,
  texto: string,
  justificativa: string,
  titulo?: string,
  numero?: string,
  origemRefId?: string,
  afterId?: string | null
): Promise<ActionState & { id?: string }> {
  const user = await requireRole(...rolesCom("gerenciar_dispositivos"));
  const tipos = ["capitulo", "secao", "artigo", "paragrafo", "inciso", "alinea", "item"];
  if (!tipos.includes(tipo)) return { error: "Tipo de dispositivo inválido." };
  const estrutural = tipo === "capitulo" || tipo === "secao";
  if (estrutural && !titulo?.trim()) {
    return { error: "Informe o título do novo capítulo ou seção." };
  }
  if (!estrutural && !texto.trim()) return { error: "Informe o texto do novo dispositivo." };

  const HIERARQUIA: Record<string, string[]> = {
    capitulo: ["secao", "artigo"],
    secao: ["artigo"],
    artigo: ["paragrafo", "inciso", "alinea"],
    paragrafo: ["inciso", "alinea"],
    inciso: ["alinea"],
    alinea: ["item"],
    item: [],
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
  const cleanTexto = sanitizeHtml(texto);
  const refId = origemRefId?.trim() || null;
  if (refId) {
    const ref = await get<Provision>("SELECT * FROM provisions WHERE id = ?", [refId]);
    if (!ref) return { error: "Dispositivo de origem não encontrado." };
    if (!(await pertenceAoEstatutoRegistrado(refId))) {
      return { error: "A origem deve ser um dispositivo do Estatuto registrado." };
    }
  }

  const irmaos = await irmaosAtivos(parentId);
  let afterEfetivo: string | null;
  if (afterId === undefined) {
    afterEfetivo = irmaos.length ? irmaos[irmaos.length - 1].id : null;
  } else {
    afterEfetivo = afterId;
    if (afterEfetivo !== null && !irmaos.some((item) => item.id === afterEfetivo)) {
      return { error: "Posição de referência inválida para a inserção." };
    }
  }
  const novaOrdem = inserirApos(irmaos.map((item) => item.id), id, afterEfetivo);
  const ordemPai = novaOrdem.indexOf(id);
  const anterior = afterEfetivo
    ? await get<Provision>("SELECT * FROM provisions WHERE id = ?", [afterEfetivo])
    : null;
  const labelAnterior = anterior ? provisionLabel(anterior) : afterEfetivo;
  const posicao = afterEfetivo === null
    ? (irmaos.length === 0 ? "Primeiro dispositivo do trecho" : "No início do trecho")
    : afterId === undefined
      ? `Ao final do trecho, após ${labelAnterior}`
      : `Após ${labelAnterior}`;

  await transaction(async () => {
    const maxOrdem = (await get<{ m: number }>("SELECT COALESCE(MAX(ordem), 0) m FROM provisions"))?.m ?? 0;
    await run(
      `INSERT INTO provisions
       (id, parent_id, type, numero, titulo, ordem, ordem_pai, origem, origem_ref_id, alteracao_tipo, status,
        proposta_inicial, redacao_trabalho, justificativa, posicao_sugerida, version, updated_at, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'novo', ?, 'novo', 'nao_iniciado', ?, ?, ?, ?, 0, ?, ?)`,
      [id, parentId, tipo, numero?.trim() || null, titulo?.trim() || null, maxOrdem + 1, ordemPai, refId, cleanTexto, cleanTexto, sanitizeHtml(justificativa || ""), posicao, ts, user.id]
    );
    await run(
      `INSERT INTO provision_placements
       (provision_id, version_key, parent_id, numero, titulo, ordem_pai, updated_at, updated_by)
       VALUES (?, 'proposta', ?, ?, ?, ?, ?, ?)`,
      [id, parentId, numero?.trim() || null, titulo?.trim() || null, ordemPai, ts, user.id]
    );
    for (const [indice, irmaoId] of novaOrdem.entries()) {
      if (irmaoId === id) continue;
      const atual = irmaos.find((item) => item.id === irmaoId);
      if (atual && atual.ordem_pai !== indice) {
        await run(
          "UPDATE provision_placements SET ordem_pai = ?, updated_at = ?, updated_by = ? WHERE version_key = 'proposta' AND provision_id = ?",
          [indice, ts, user.id, irmaoId]
        );
      }
    }
    await atualizarNumerosSubordinados(parentId, user.id, ts);
    await audit(user.id, user.name, `Criou novo ${tipo}`, "provision", id, `Posição: ${posicao}${refId ? `; origem: ${refId}` : ""}`);
  });

  revalidatePath("/");
  if (parentId) revalidatePath(`/dispositivo/${parentId}`);
  await publishRealtime({ entity: "provision", id, action: "criado" });
  return { ok: true, id, message: `${tipo} criado. Numeração definitiva será definida na consolidação.` };
}

export async function updateProvision(
  provisionId: string,
  data: { numero: string; titulo: string; posicaoSugerida: string; type?: string }
): Promise<ActionState> {
  const user = await requireRole(...rolesCom("gerenciar_dispositivos"));
  const prov = await get<Provision>("SELECT * FROM provisions WHERE id = ?", [provisionId]);
  if (!prov) return { error: "Dispositivo não encontrado." };

  const HIERARQUIA: Record<string, string[]> = {
    capitulo: ["secao", "artigo"],
    secao: ["artigo"],
    artigo: ["paragrafo", "inciso", "alinea"],
    paragrafo: ["inciso", "alinea"],
    inciso: ["alinea"],
    alinea: ["item"],
    item: [],
  };
  const tipos = ["capitulo", "secao", "artigo", "paragrafo", "inciso", "alinea", "item"];

  let novoType: Provision["type"] = prov.type;
  if (data.type !== undefined) {
    if (!tipos.includes(data.type)) return { error: "Tipo de dispositivo inválido." };
    if (data.type !== prov.type) {
      // Novo tipo deve ser compatível com o pai atual.
      const pai = prov.parent_id ? await get<Provision>("SELECT * FROM provisions WHERE id = ?", [prov.parent_id]) : null;
      const parentType = pai?.type ?? null;
      if (parentType !== null && !(HIERARQUIA[parentType] ?? []).includes(data.type)) {
        return { error: `Não é possível classificar ${data.type} dentro de ${parentType}.` };
      }
      // Filhos existentes devem continuar compatíveis com o novo tipo.
      const filhos = await all<{ type: string }>("SELECT type FROM provisions WHERE parent_id = ?", [provisionId]);
      const aceitos = HIERARQUIA[data.type] ?? [];
      const invalidos = filhos.filter((f) => !aceitos.includes(f.type));
      if (invalidos.length) {
        return {
          error: `A troca de classificação deixaria ${invalidos.length} dispositivo(s) filho(s) incompatível(is). Ajuste os filhos antes.`,
        };
      }
      novoType = data.type as Provision["type"];
    }
  }

  const ts = now();
  await transaction(async () => {
    await run("UPDATE provisions SET posicao_sugerida = ?, updated_at = ? WHERE id = ?", [
      data.posicaoSugerida.trim() || null,
      ts,
      provisionId,
    ]);
    await run(
      `UPDATE provision_placements
          SET numero = ?, titulo = ?, updated_at = ?, updated_by = ?
        WHERE version_key = 'proposta' AND provision_id = ?`,
      [data.numero.trim() || null, data.titulo.trim() || null, ts, user.id, provisionId]
    );
    if (novoType !== prov.type) {
      await run("UPDATE provisions SET type = ?, updated_at = ? WHERE id = ?", [novoType, ts, provisionId]);
    }
    const detalhe =
      novoType !== prov.type
        ? `Classificação alterada: ${prov.type} → ${novoType}; dados de numeração da proposta atualizados`
        : "Dados de numeração e posição da proposta atualizados";
    await audit(user.id, user.name, "Editou dispositivo", "provision", provisionId, detalhe);
  });
  revalidatePath(`/dispositivo/${provisionId}`);
  revalidatePath("/");
  await publishRealtime({ entity: "provision", id: provisionId, action: "editado" });
  return { ok: true, message: "Dispositivo atualizado." };
}

/** Atualiza apenas o título estrutural da versão proposta, sem tocar em número ou posição. */
export async function updateProvisionTitle(provisionId: string, titulo: string): Promise<ActionState> {
  const user = await requireRole(...rolesCom("gerenciar_dispositivos"));
  const prov = await get<Provision>("SELECT * FROM provisions WHERE id = ?", [provisionId]);
  if (!prov) return { error: "Dispositivo não encontrado." };
  if (prov.type !== "capitulo" && prov.type !== "secao") {
    return { error: "A edição de título está disponível apenas para capítulos e seções." };
  }

  const novoTitulo = titulo.trim() || null;
  const ts = now();
  await transaction(async () => {
    await run(
      `UPDATE provision_placements
          SET titulo = ?, updated_at = ?, updated_by = ?
        WHERE version_key = 'proposta' AND provision_id = ?`,
      [novoTitulo, ts, user.id, provisionId],
    );
    await audit(
      user.id,
      user.name,
      "Editou título estrutural",
      "provision",
      provisionId,
      `${provisionLabel(prov)}: ${prov.titulo || "sem título"} → ${novoTitulo || "sem título"}`,
    );
  });
  revalidatePath("/");
  revalidatePath(`/dispositivo/${provisionId}`);
  revalidatePath("/mesa-trabalho");
  revalidatePath("/consolidado");
  revalidatePath("/comparativo");
  await publishRealtime({ entity: "provision_placement", id: provisionId, action: "titulo_editado" });
  return { ok: true, message: "Título atualizado." };
}

/**
 * Anotação de trabalho: liga/desliga o selo "novo". Não altera o histórico, os
 * placements nem as regras de exclusão/revogação (que seguem o Estatuto registrado).
 */
export async function setTagNovo(provisionId: string, novo: boolean): Promise<ActionState> {
  const user = await requireRole(...rolesCom("classificar_alteracao"));
  const prov = await get<Provision>("SELECT * FROM provisions WHERE id = ?", [provisionId]);
  if (!prov) return { error: "Dispositivo não encontrado." };
  const destino: Provision["origem"] = novo ? "novo" : "original";
  if (prov.origem === destino) {
    return {
      ok: true,
      message: novo ? "O dispositivo já está marcado como novo." : "O dispositivo já está marcado como original.",
    };
  }
  const ts = now();
  await transaction(async () => {
    await run("UPDATE provisions SET origem = ?, updated_at = ?, updated_by = ? WHERE id = ?", [
      destino,
      ts,
      user.id,
      provisionId,
    ]);
    await audit(
      user.id,
      user.name,
      novo ? "Marcou dispositivo como novo" : "Desmarcou dispositivo novo",
      "provision",
      provisionId,
      `${provisionLabel(prov)}: ${ORIGIN_LABELS[prov.origem]} → ${ORIGIN_LABELS[destino]}`
    );
  });
  revalidatePath("/");
  revalidatePath("/mesa-trabalho");
  revalidatePath(`/dispositivo/${provisionId}`);
  revalidatePath("/consolidado");
  revalidatePath("/comparativo");
  revalidatePath("/revisao");
  revalidatePath("/renumeracao");
  await publishRealtime({ entity: "provision", id: provisionId, action: "tag_novo" });
  return { ok: true, message: novo ? "Dispositivo marcado como novo." : "Marcação de novo removida." };
}

/**
 * Anotação de trabalho: define a origem no Estatuto registrado.
 * `__auto__` volta ao próprio número vigente; `__nenhuma__` declara que não há
 * correspondente; um id aponta o dispositivo de origem (define o chip "era N"
 * e o texto apresentado na aba Origem da Mesa).
 */
export async function setOrigemReferencia(
  provisionId: string,
  destino: "__auto__" | "__nenhuma__" | string
): Promise<ActionState> {
  const user = await requireRole(...rolesCom("gerenciar_dispositivos"));
  const prov = await get<Provision>("SELECT * FROM provisions WHERE id = ?", [provisionId]);
  if (!prov) return { error: "Dispositivo não encontrado." };

  let refId: string | null = null;
  let semOrigem = 0;
  let mensagem = "Correspondência automática restaurada.";

  if (destino === "__auto__") {
    refId = null;
    semOrigem = 0;
  } else if (destino === "__nenhuma__") {
    refId = null;
    semOrigem = 1;
    mensagem = "Dispositivo marcado como sem correspondente no Estatuto vigente.";
  } else {
    refId = destino.trim();
    if (!refId) return { error: "Dispositivo de origem inválido." };
    if (refId === provisionId) return { error: "O dispositivo não pode ter a si mesmo como origem." };
    const ref = await get<Provision>("SELECT * FROM provisions WHERE id = ?", [refId]);
    if (!ref) return { error: "Dispositivo de origem não encontrado." };
    if (!(await pertenceAoEstatutoRegistrado(refId))) {
      return { error: "A origem deve ser um dispositivo do Estatuto registrado." };
    }
    let atual: string | null = refId;
    for (let i = 0; i < 20 && atual; i++) {
      const linha: { origem_ref_id: string | null } | undefined = await get(
        "SELECT origem_ref_id FROM provisions WHERE id = ?",
        [atual]
      );
      atual = linha?.origem_ref_id ?? null;
      if (atual === provisionId) return { error: "Referência circular de origem não é permitida." };
    }
    mensagem = `Origem definida: ${provisionLabel(ref)}.`;
  }

  const ts = now();
  const anterior = prov.origem_ref_id ?? (prov.sem_origem ? "sem correspondente" : "automático");
  const novo = refId ?? (semOrigem ? "sem correspondente" : "automático");
  await transaction(async () => {
    await run(
      "UPDATE provisions SET origem_ref_id = ?, sem_origem = ?, updated_at = ?, updated_by = ? WHERE id = ?",
      [refId, semOrigem, ts, user.id, provisionId]
    );
    await audit(
      user.id,
      user.name,
      "Definiu origem referenciada",
      "provision",
      provisionId,
      `${provisionLabel(prov)}: ${anterior} → ${novo}`
    );
  });
  revalidatePath("/");
  revalidatePath("/mesa-trabalho");
  revalidatePath(`/dispositivo/${provisionId}`);
  revalidatePath("/consolidado");
  revalidatePath("/comparativo");
  revalidatePath("/renumeracao");
  await publishRealtime({ entity: "provision", id: provisionId, action: "origem_referencia" });
  return { ok: true, message: mensagem };
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
  revalidatePath("/");
  revalidatePath(`/dispositivo/${provisionId}`);
  revalidatePath("/mesa-trabalho");
  revalidatePath("/renumeracao");
  revalidatePath("/consolidado");
  await publishRealtime({ entity: "provision", id: provisionId, action: "movido" });
  return { ok: true, message: `${provisionLabel(prov)} movido para ${paiNovo}.` };
}

/** Recalcula apenas os números subordinados no pai afetado, preservando o vigente. */
async function atualizarNumerosSubordinados(
  parentId: string | null,
  userId: number,
  ts: string,
): Promise<void> {
  const where = parentId === null ? "pp.parent_id IS NULL" : "pp.parent_id = ?";
  const rows = await all<{
    id: string; type: Provision["type"]; alteracao_tipo: string;
    numero: string | null; status: string;
  }>(`
    SELECT pp.provision_id AS id, p.type, p.alteracao_tipo, pp.numero, p.status
    FROM provision_placements pp JOIN provisions p ON p.id = pp.provision_id
    WHERE pp.version_key = 'proposta' AND p.deleted_at IS NULL AND ${where}
    ORDER BY pp.ordem_pai, p.ordem, p.id
  `, parentId === null ? [] : [parentId]);
  const novos = numerarSubordinados(rows.map((r) => ({ ...r, children: [] })));
  for (const row of rows) {
    const novo = novos.get(row.id);
    if (!novo || novo === row.numero) continue;
    await run(
      "UPDATE provision_placements SET numero = ?, updated_at = ?, updated_by = ? WHERE version_key = 'proposta' AND provision_id = ?",
      [novo, ts, userId, row.id],
    );
    if (row.status === "aprovado") {
      const descricao = `Revisar referências: ${row.type} da proposta renumerado de ${row.numero || "(sem número)"} para ${novo}`;
      const existente = await get<{ id: number }>(
        "SELECT id FROM pending_issues WHERE provision_id = ? AND categoria = 'referencia_cruzada' AND descricao = ? AND status = 'aberta'",
        [row.id, descricao],
      );
      if (!existente) await run(
        "INSERT INTO pending_issues (provision_id, author_id, categoria, descricao, status) VALUES (?, ?, 'referencia_cruzada', ?, 'aberta')",
        [row.id, userId, descricao],
      );
    }
  }
}

/** Move um dispositivo apenas na estrutura da proposta, preservando a árvore vigente. */
export async function moveProposalProvision(
  provisionId: string,
  newParentId: string | null,
  afterId: string | null
): Promise<ActionState> {
  const user = await requireRole(...rolesCom("gerenciar_dispositivos"));
  const prov = await get<Provision>("SELECT * FROM provisions WHERE id = ?", [provisionId]);
  if (!prov) return { error: "Dispositivo não encontrado." };

  const rows = await all<NoEstrutural>(`
    SELECT p.id, p.type,
           CASE WHEN pp.id IS NULL THEN p.parent_id ELSE pp.parent_id END AS parent_id
      FROM provisions p
      LEFT JOIN provision_placements pp
        ON pp.provision_id = p.id AND pp.version_key = 'proposta'`);
  const mapa = new Map(rows.map((r) => [r.id, r]));
  const erro = validarMovimento(mapa, provisionId, newParentId, afterId);
  if (erro) return { error: erro };

  const irmaos = async (parentId: string | null) => {
    const where = parentId === null ? "pp.parent_id IS NULL" : "pp.parent_id = ?";
    const params = parentId === null ? [] : [parentId];
    return all<{ id: string; ordem_pai: number }>(`
      SELECT pp.provision_id AS id, pp.ordem_pai
        FROM provision_placements pp
        JOIN provisions p ON p.id = pp.provision_id
       WHERE pp.version_key = 'proposta' AND p.deleted_at IS NULL AND ${where}
       ORDER BY pp.ordem_pai`, params);
  };

  const irmaosAntigos = await irmaos(mapa.get(provisionId)!.parent_id);
  const irmaosNovos = newParentId === mapa.get(provisionId)!.parent_id ? irmaosAntigos : await irmaos(newParentId);
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
  const sameParent = newParentId === mapa.get(provisionId)!.parent_id;
  const noOp = sameParent && irmaosAntigos.map((x) => x.id).every((id, i) => novaOrdem[i] === id);
  if (noOp) return { ok: true, message: "O dispositivo já está nesta posição na proposta." };

  const labelPai = async (parentId: string | null) => {
    if (!parentId) return "raiz da proposta";
    const p = await get<Provision>("SELECT * FROM provisions WHERE id = ?", [parentId]);
    const placement = await get<{ numero: string | null; titulo: string | null }>(
      "SELECT numero, titulo FROM provision_placements WHERE provision_id = ? AND version_key = 'proposta'",
      [parentId]
    );
    return p ? provisionLabel({ ...p, numero: placement?.numero ?? p.numero, titulo: placement?.titulo ?? p.titulo }) : parentId;
  };
  const paiAntigo = await labelPai(mapa.get(provisionId)!.parent_id);
  const paiNovo = await labelPai(newParentId);
  const posicao = novaOrdem.indexOf(provisionId) + 1;
  const ts = now();

  await transaction(async () => {
    if (!sameParent) {
      await run(
        "UPDATE provision_placements SET parent_id = ?, updated_at = ?, updated_by = ? WHERE version_key = 'proposta' AND provision_id = ?",
        [newParentId, ts, user.id, provisionId]
      );
    }
    for (const [id, ordem_pai] of novaOrdemPai) {
      if (ordemAtualPorId.get(id) === ordem_pai && !(id === provisionId && !sameParent)) continue;
      await run(
        "UPDATE provision_placements SET ordem_pai = ?, updated_at = ?, updated_by = ? WHERE version_key = 'proposta' AND provision_id = ?",
        [ordem_pai, ts, user.id, id]
      );
    }
    await atualizarNumerosSubordinados(mapa.get(provisionId)!.parent_id, user.id, ts);
    if (!sameParent) await atualizarNumerosSubordinados(newParentId, user.id, ts);
    await audit(
      user.id,
      user.name,
      "Moveu dispositivo na proposta",
      "provision_placement",
      provisionId,
      `${provisionLabel(prov)}: ${paiAntigo} → ${paiNovo}, posição ${posicao}`
    );
    if (prov.status === "aprovado") {
      const descricao = `Revisar referências após reordenação na proposta: ${provisionLabel(prov)} movido de ${paiAntigo} para ${paiNovo}`;
      const existente = await get<{ id: number }>(
        "SELECT id FROM pending_issues WHERE provision_id = ? AND categoria = 'referencia_cruzada' AND descricao = ? AND status = 'aberta'",
        [provisionId, descricao]
      );
      if (!existente) {
        await run(
          "INSERT INTO pending_issues (provision_id, author_id, categoria, descricao, status) VALUES (?, ?, 'referencia_cruzada', ?, 'aberta')",
          [provisionId, user.id, descricao]
        );
      }
    }
  });
  revalidatePath("/");
  revalidatePath(`/dispositivo/${provisionId}`);
  revalidatePath("/mesa-trabalho");
  revalidatePath("/renumeracao");
  revalidatePath("/revisao");
  revalidatePath("/consolidado");
  await publishRealtime({ entity: "provision_placement", id: provisionId, action: "movido" });
  return { ok: true, message: `${provisionLabel(prov)} movido na estrutura da proposta.` };
}

/**
 * Exclusão editorial reversível (RF-07): marca o dispositivo com tombstone.
 * Nada é apagado — conteúdo, relações, versões, referências e a posição original
 * permanecem e podem ser restaurados.
 */
export async function deleteProvision(provisionId: string): Promise<ActionState> {
  const user = await requireRole(...rolesCom("gerenciar_dispositivos"));
  const prov = await get<Provision>("SELECT * FROM provisions WHERE id = ?", [provisionId]);
  if (!prov) return { error: "Dispositivo não encontrado." };
  if (prov.deleted_at) return { error: "Este dispositivo já está retirado da minuta." };
  const descendentes = (await get<{ c: number }>(
    `WITH RECURSIVE sub AS (
       SELECT id FROM provisions WHERE id = ?
       UNION ALL
       SELECT p.id FROM provisions p JOIN sub d ON p.parent_id = d.id
     ) SELECT COUNT(*) - 1 AS c FROM sub`,
    [provisionId]
  ))?.c ?? 0;

  const ts = now();
  await transaction(async () => {
    await run(
      "UPDATE provisions SET deleted_at = ?, deleted_by = ?, updated_at = ?, updated_by = ? WHERE id = ?",
      [ts, user.id, ts, user.id, provisionId]
    );
    await audit(
      user.id,
      user.name,
      "Retirou dispositivo da minuta (exclusão reversível)",
      "provision",
      provisionId,
      `Tipo: ${prov.type}${prov.numero ? `, número: ${prov.numero}` : ""}${descendentes > 0 ? `, ${descendentes} descendente(s) acompanham a exclusão` : ""}`
    );
  });
  revalidatePath("/");
  revalidatePath(`/dispositivo/${provisionId}`);
  revalidatePath("/consolidado");
  revalidatePath("/mesa-trabalho");
  revalidatePath("/comparativo");
  revalidatePath("/revisao");
  revalidatePath("/renumeracao");
  await publishRealtime({ entity: "provision", id: provisionId, action: "excluido" });
  return { ok: true, message: "Dispositivo retirado da minuta. A restauração está disponível em Retirados da minuta." };
}

interface NoComExclusao extends NoEstrutural {
  deleted_at: string | null;
}

/** Estrutura da proposta com o estado de exclusão de cada dispositivo. */
async function mapaDaProposta(): Promise<Map<string, NoComExclusao>> {
  const rows = await all<NoComExclusao>(`
    SELECT p.id, p.type, p.deleted_at,
           CASE WHEN pp.id IS NULL THEN p.parent_id ELSE pp.parent_id END AS parent_id
      FROM provisions p
      LEFT JOIN provision_placements pp
        ON pp.provision_id = p.id AND pp.version_key = 'proposta'`);
  return new Map(rows.map((r) => [r.id, r]));
}

/** Irmãos ativos (não retirados) de um pai, na ordem da proposta. */
async function irmaosAtivos(parentId: string | null): Promise<{ id: string; ordem_pai: number }[]> {
  const where = parentId === null ? "pp.parent_id IS NULL" : "pp.parent_id = ?";
  const params = parentId === null ? [] : [parentId];
  return all<{ id: string; ordem_pai: number }>(`
    SELECT pp.provision_id AS id, pp.ordem_pai
      FROM provision_placements pp
      JOIN provisions p ON p.id = pp.provision_id
     WHERE pp.version_key = 'proposta' AND p.deleted_at IS NULL AND ${where}
     ORDER BY pp.ordem_pai`, params);
}

/**
 * Restaura um dispositivo retirado (RF-07). Sem destino, volta à posição
 * original; se o pai original também estiver retirado, devolve conflito para o
 * operador escolher um novo destino — nunca reposiciona em silêncio.
 */
export async function restoreProvision(
  provisionId: string,
  destino?: { parentId: string | null; afterId: string | null },
): Promise<ActionState> {
  const user = await requireRole(...rolesCom("gerenciar_dispositivos"));
  const prov = await get<Provision>("SELECT * FROM provisions WHERE id = ?", [provisionId]);
  if (!prov) return { error: "Dispositivo não encontrado." };
  if (!prov.deleted_at) return { error: "Este dispositivo não está retirado da minuta." };

  const mapa = await mapaDaProposta();
  const placement = await get<{ parent_id: string | null; ordem_pai: number }>(
    "SELECT parent_id, ordem_pai FROM provision_placements WHERE provision_id = ? AND version_key = 'proposta'",
    [provisionId],
  );
  const parentOriginal = placement?.parent_id ?? prov.parent_id;

  let parentId: string | null;
  let afterId: string | null;
  if (destino) {
    const erro = validarMovimento(mapa, provisionId, destino.parentId, destino.afterId);
    if (erro) return { error: erro };
    if (destino.parentId && mapa.get(destino.parentId)?.deleted_at) {
      return { error: "O destino escolhido também está retirado da minuta." };
    }
    parentId = destino.parentId;
    afterId = destino.afterId;
  } else {
    const pai = parentOriginal ? mapa.get(parentOriginal) : null;
    if (parentOriginal !== null && (!pai || pai.deleted_at)) {
      return {
        conflict: true,
        error: "O destino original deste dispositivo também está retirado da minuta. Escolha um novo destino para restaurá-lo.",
      };
    }
    parentId = parentOriginal;
    const irmaos = await irmaosAtivos(parentId);
    const indiceOriginal = Math.min(Math.max(placement?.ordem_pai ?? irmaos.length, 0), irmaos.length);
    afterId = indiceOriginal > 0 ? irmaos[indiceOriginal - 1].id : null;
  }

  const irmaos = await irmaosAtivos(parentId);
  const novaOrdem = inserirApos(irmaos.map((x) => x.id), provisionId, afterId);
  const ts = now();
  const labelPai = parentId
    ? provisionLabel((await get<Provision>("SELECT * FROM provisions WHERE id = ?", [parentId])) ?? prov)
    : "raiz da proposta";

  await transaction(async () => {
    await run(
      "UPDATE provisions SET deleted_at = NULL, deleted_by = NULL, updated_at = ?, updated_by = ? WHERE id = ?",
      [ts, user.id, provisionId],
    );
    await run(
      "UPDATE provision_placements SET parent_id = ?, ordem_pai = ?, updated_at = ?, updated_by = ? WHERE version_key = 'proposta' AND provision_id = ?",
      [parentId, novaOrdem.indexOf(provisionId), ts, user.id, provisionId],
    );
    for (const [i, id] of novaOrdem.entries()) {
      if (id === provisionId) continue;
      if (irmaos.find((x) => x.id === id)?.ordem_pai !== i) {
        await run(
          "UPDATE provision_placements SET ordem_pai = ?, updated_at = ?, updated_by = ? WHERE version_key = 'proposta' AND provision_id = ?",
          [i, ts, user.id, id],
        );
      }
    }
    await atualizarNumerosSubordinados(parentId, user.id, ts);
    await audit(
      user.id,
      user.name,
      "Restaurou dispositivo retirado",
      "provision",
      provisionId,
      `${provisionLabel(prov)} em ${labelPai}`,
    );
  });
  revalidatePath("/");
  revalidatePath(`/dispositivo/${provisionId}`);
  revalidatePath("/consolidado");
  revalidatePath("/mesa-trabalho");
  revalidatePath("/comparativo");
  revalidatePath("/revisao");
  revalidatePath("/renumeracao");
  await publishRealtime({ entity: "provision", id: provisionId, action: "restaurado" });
  return { ok: true, message: "Dispositivo restaurado na minuta." };
}
