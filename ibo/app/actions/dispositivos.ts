"use server";

import { revalidatePath } from "next/cache";
import { get, all, run, transaction, now } from "@/lib/db";
import { provisionLabel } from "@/lib/data";
import type { Provision } from "@/lib/types";
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
      ? (await get<{ m: number }>("SELECT COALESCE(MAX(ordem_pai), -1) m FROM provision_placements WHERE version_key = 'proposta' AND parent_id = ?", [pai.id]))?.m ?? -1
      : (await get<{ m: number }>("SELECT COALESCE(MAX(ordem_pai), -1) m FROM provision_placements WHERE version_key = 'proposta' AND parent_id IS NULL"))?.m ?? -1;
    await run(
      `INSERT INTO provisions
       (id, parent_id, type, numero, titulo, ordem, ordem_pai, origem, alteracao_tipo, status,
        proposta_inicial, redacao_trabalho, justificativa, posicao_sugerida, version, updated_at, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'novo', 'novo', 'nao_iniciado', ?, ?, ?, ?, 0, ?, ?)`,
      [id, parentId, tipo, numero?.trim() || null, titulo?.trim() || null, maxOrdem + 1, maxOrdemPai + 1, cleanTexto, cleanTexto, sanitizeHtml(justificativa || ""), posicao, ts, user.id]
    );
    await run(
      `INSERT INTO provision_placements
       (provision_id, version_key, parent_id, numero, titulo, ordem_pai, updated_at, updated_by)
       VALUES (?, 'proposta', ?, ?, ?, ?, ?, ?)
       ON CONFLICT (version_key, provision_id) DO UPDATE SET
         parent_id = EXCLUDED.parent_id,
         numero = EXCLUDED.numero,
         titulo = EXCLUDED.titulo,
         ordem_pai = EXCLUDED.ordem_pai,
         updated_at = EXCLUDED.updated_at,
         updated_by = EXCLUDED.updated_by`,
      [id, parentId, numero?.trim() || null, titulo?.trim() || null, maxOrdemPai + 1, ts, user.id]
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
    alinea: [],
  };
  const tipos = ["capitulo", "secao", "artigo", "paragrafo", "inciso", "alinea"];

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
    WHERE pp.version_key = 'proposta' AND ${where}
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
       WHERE pp.version_key = 'proposta' AND ${where}
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
  revalidatePath("/mesa-trabalho");
  revalidatePath("/comparativo");
  revalidatePath("/revisao");
  revalidatePath("/renumeracao");
  await publishRealtime({ entity: "provision", id: provisionId, action: "excluido" });
  return { ok: true, message: "Dispositivo excluído." };
}
