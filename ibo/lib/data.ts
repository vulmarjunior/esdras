import { get, all } from "./db";
import type { DocumentVersion, Provision, ProvisionPlacement, ProvisionStatus, VersaoTrabalho } from "./types";
import { ordenarIrmaos } from "./tree-order";
import { numerarSubordinados, resolverEra } from "./numeracao";
import { provisionLabel } from "./provision-label";
export { provisionLabel };

export interface TreeNode extends Provision {
  children: TreeNode[];
  child_count: number;
}

function buildTree(rows: Provision[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  for (const r of rows) map.set(r.id, { ...r, children: [], child_count: 0 });
  const roots: TreeNode[] = [];
  for (const node of map.values()) {
    if (node.parent_id && map.has(node.parent_id)) map.get(node.parent_id)!.children.push(node);
    else roots.push(node);
  }
  const ordenar = (nodes: TreeNode[]) => {
    for (const n of nodes) ordenar(n.children);
    return ordenarIrmaos(nodes);
  };
  ordenar(roots);
  const count = (n: TreeNode): number => {
    let c = 0;
    for (const ch of n.children) c += 1 + count(ch);
    n.child_count = c;
    return c;
  };
  roots.forEach(count);
  return roots;
}

export async function getTree(): Promise<TreeNode[]> {
  const rows = await all<Provision>("SELECT * FROM provisions ORDER BY ordem_pai, ordem");
  return buildTree(rows);
}

/** Árvore proposta com localização e numeração independentes da versão vigente. */
export async function getProposalTree(): Promise<TreeNode[]> {
  const rows = await all<Provision>(`
    SELECT
      p.id,
      CASE WHEN pp.id IS NULL THEN p.parent_id ELSE pp.parent_id END AS parent_id,
      p.project_id,
      p.type,
      CASE WHEN pp.id IS NULL THEN p.numero ELSE pp.numero END AS numero,
      CASE WHEN pp.id IS NULL THEN p.titulo ELSE pp.titulo END AS titulo,
      p.ordem,
      CASE WHEN pp.id IS NULL THEN p.ordem_pai ELSE pp.ordem_pai END AS ordem_pai,
      p.origem,
      p.origem_ref_id,
      p.sem_origem,
      p.alteracao_tipo,
      p.status,
      p.texto_vigente,
      p.proposta_inicial,
      p.redacao_trabalho,
      p.justificativa,
      p.redacao_consolidada,
      p.posicao_sugerida,
      p.version,
      p.updated_at,
      p.updated_by
    FROM provisions p
    LEFT JOIN provision_placements pp
      ON pp.provision_id = p.id AND pp.version_key = 'proposta'
    ORDER BY COALESCE(pp.ordem_pai, p.ordem_pai), p.ordem
  `);
  const tree = buildTree(rows);
  const subordinados = numerarSubordinados(tree);
  const aplicar = (nodes: TreeNode[]) => {
    for (const node of nodes) {
      node.numero = subordinados.get(node.id) ?? node.numero;
      aplicar(node.children);
    }
  };
  aplicar(tree);
  return tree;
}

/** Árvore histórica do Estatuto vigente, congelada no momento da importação. */
export async function getVigenteTree(): Promise<TreeNode[]> {
  const rows = await all<Provision>(`
    SELECT
      p.id,
      vp.parent_id,
      p.project_id,
      p.type,
      vp.numero,
      vp.titulo,
      p.ordem,
      vp.ordem_pai,
      p.origem,
      p.origem_ref_id,
      p.sem_origem,
      p.alteracao_tipo,
      p.status,
      p.texto_vigente,
      p.proposta_inicial,
      p.redacao_trabalho,
      p.justificativa,
      p.redacao_consolidada,
      p.posicao_sugerida,
      p.version,
      p.updated_at,
      p.updated_by
    FROM provisions p
    JOIN provision_placements vp
      ON vp.provision_id = p.id AND vp.version_key = 'vigente'
    ORDER BY vp.ordem_pai, p.ordem
  `);
  return buildTree(rows);
}

/** Árvore da versão de trabalho escolhida (vigente histórica × proposta). */
export async function getArvoreDaVersao(versao: VersaoTrabalho): Promise<TreeNode[]> {
  return versao === "proposta" ? getProposalTree() : getTree();
}

/**
 * Números da contraparte por dispositivo. Na versão vigente devolve a **era
 * efetiva**: referência manual de origem → número do dispositivo referenciado;
 * `sem_origem` → sem número; sem anotação → o próprio `provisions.numero`.
 * Na proposta, devolve os números armazenados nas placements.
 */
export async function getNumerosArmazenados(versao: VersaoTrabalho): Promise<Map<string, string>> {
  if (versao === "vigente") {
    const rows = await all<{
      id: string;
      numero: string | null;
      origem_ref_id: string | null;
      sem_origem: number;
      numero_referenciado: string | null;
    }>(`
      SELECT p.id, p.numero, p.origem_ref_id, p.sem_origem, r.numero AS numero_referenciado
        FROM provisions p
        LEFT JOIN provisions r ON r.id = p.origem_ref_id
    `);
    const numeros = new Map<string, string>();
    for (const row of rows) {
      const era = resolverEra(row, row.numero_referenciado);
      if (era) numeros.set(row.id, era);
    }
    return numeros;
  }
  const tree = await getProposalTree();
  const numeros = new Map<string, string>();
  const visitar = (nodes: TreeNode[]) => {
    for (const node of nodes) {
      if (node.numero) numeros.set(node.id, node.numero);
      visitar(node.children);
    }
  };
  visitar(tree);
  return numeros;
}

/**
 * Números registrados no Estatuto vigente (`provisions.numero`), sem as
 * anotações de trabalho (referência de origem/sem correspondente).
 */
export async function getNumerosVigentesRegistrados(): Promise<Map<string, string>> {
  const rows = await all<{ id: string; numero: string | null }>("SELECT id, numero FROM provisions");
  return new Map(rows.filter((r) => r.numero).map((r) => [r.id, r.numero!]));
}

export async function getProvisionPlacement(
  provisionId: string,
  version: DocumentVersion = "proposta"
): Promise<ProvisionPlacement | undefined> {
  return get<ProvisionPlacement>(
    "SELECT * FROM provision_placements WHERE provision_id = ? AND version_key = ?",
    [provisionId, version]
  );
}

export async function getFlatProvisions(): Promise<Provision[]> {
  return all<Provision>("SELECT * FROM provisions ORDER BY ordem");
}

export async function getProvision(id: string): Promise<Provision | undefined> {
  return get<Provision>("SELECT * FROM provisions WHERE id = ?", [id]);
}

export interface DispositivoOption {
  id: string;
  label: string;
  chapter: string;
}

/** Lista plana de dispositivos (rótulo + capítulo) para seletores de vínculo/origem. */
export function listarDispositivos(nodes: TreeNode[]): DispositivoOption[] {
  const byId = new Map<string, TreeNode>();
  const visitAll = (list: TreeNode[]) => {
    for (const node of list) {
      byId.set(node.id, node);
      visitAll(node.children);
    }
  };
  visitAll(nodes);
  const chapterOf = (node: TreeNode): string => {
    let cur = node;
    const seen = new Set<string>();
    while (cur.parent_id && !seen.has(cur.id)) {
      seen.add(cur.id);
      const parent = byId.get(cur.parent_id);
      if (!parent) break;
      cur = parent;
    }
    return cur.type === "capitulo" ? provisionLabel(cur) : "";
  };
  const out: DispositivoOption[] = [];
  const visit = (list: TreeNode[]) => {
    for (const node of list) {
      out.push({ id: node.id, label: provisionLabel(node), chapter: chapterOf(node) });
      visit(node.children);
    }
  };
  visit(nodes);
  return out;
}

export async function getStatusCounts() {
  const rows = await all<{ status: ProvisionStatus; c: number }>(
    "SELECT status, COUNT(*) c FROM provisions WHERE type = 'artigo' GROUP BY status"
  );
  const counts: Record<string, number> = {
    nao_iniciado: 0,
    em_analise: 0,
    em_discussao: 0,
    redacao_definida: 0,
    aprovado: 0,
    reaberto: 0,
  };
  for (const r of rows) counts[r.status] = r.c;
  return counts;
}

export async function getArticleCount(): Promise<number> {
  return (await get<{ c: number }>("SELECT COUNT(*) c FROM provisions WHERE type = 'artigo'"))?.c ?? 0;
}

/**
 * Contagem por status no escopo da proposta: exclui dispositivos revogados
 * (não farão parte do texto final) e inclui os novos.
 */
export async function getStatusCountsProposta() {
  const rows = await all<{ status: ProvisionStatus; c: number }>(
    "SELECT status, COUNT(*) c FROM provisions WHERE type = 'artigo' AND alteracao_tipo <> 'revogado' GROUP BY status"
  );
  const counts: Record<string, number> = {
    nao_iniciado: 0,
    em_analise: 0,
    em_discussao: 0,
    redacao_definida: 0,
    aprovado: 0,
    reaberto: 0,
  };
  for (const r of rows) counts[r.status] = r.c;
  return counts;
}

export async function getArticleCountProposta(): Promise<number> {
  return (
    (await get<{ c: number }>(
      "SELECT COUNT(*) c FROM provisions WHERE type = 'artigo' AND alteracao_tipo <> 'revogado'"
    ))?.c ?? 0
  );
}

export async function getActiveMeeting() {
  return get<{ id: number }>("SELECT id FROM meetings WHERE status = 'em_andamento' ORDER BY id DESC LIMIT 1");
}

/** IDs de dispositivos com pendência aberta (para filtros do painel). */
export async function getIdsComPendenciasAbertas(): Promise<string[]> {
  const rows = await all<{ provision_id: string }>(
    "SELECT DISTINCT provision_id FROM pending_issues WHERE status = 'aberta' AND provision_id IS NOT NULL"
  );
  return rows.map((r) => r.provision_id);
}

/** IDs dos dispositivos em que o usuário tem anotação pessoal (com conteúdo). */
export async function getPersonalNoteIds(userId: number): Promise<string[]> {
  const rows = await all<{ provision_id: string }>(
    "SELECT provision_id FROM personal_notes WHERE user_id = ? AND content != ''",
    [userId]
  );
  return rows.map((r) => r.provision_id);
}

export async function parentChain(id: string): Promise<Provision[]> {
  const chain: Provision[] = [];
  let cur = await getProvision(id);
  while (cur && cur.parent_id) {
    cur = await getProvision(cur.parent_id);
    if (cur) chain.unshift(cur);
  }
  return chain;
}
