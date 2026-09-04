import { get, all } from "./db";
import type { Provision, ProvisionStatus } from "./types";
import { ordenarIrmaos } from "./tree-order";
export { provisionLabel } from "./provision-label";

export interface TreeNode extends Provision {
  children: TreeNode[];
  child_count: number;
}

export async function getTree(): Promise<TreeNode[]> {
  const rows = await all<Provision>("SELECT * FROM provisions ORDER BY ordem_pai, ordem");
  const map = new Map<string, TreeNode>();
  for (const r of rows) {
    map.set(r.id, { ...r, children: [], child_count: 0 });
  }
  const roots: TreeNode[] = [];
  for (const node of map.values()) {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  // Hierarquia normativa: incisos → parágrafos → alíneas, preservando ordem_pai
  // dentro de cada grupo (ordenação estável, sem mutar o array original).
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

export async function getFlatProvisions(): Promise<Provision[]> {
  return all<Provision>("SELECT * FROM provisions ORDER BY ordem");
}

export async function getProvision(id: string): Promise<Provision | undefined> {
  return get<Provision>("SELECT * FROM provisions WHERE id = ?", [id]);
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

export async function getActiveMeeting() {
  return get<{ id: number }>("SELECT id FROM meetings WHERE status = 'em_andamento' ORDER BY id DESC LIMIT 1");
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