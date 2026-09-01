import { get, all } from "./db";
import type { Provision, ProvisionStatus } from "./types";

export interface TreeNode extends Provision {
  children: TreeNode[];
  child_count: number;
}

export function getTree(): TreeNode[] {
  const rows = all<Provision>("SELECT * FROM provisions ORDER BY ordem_pai, ordem");
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
  const count = (n: TreeNode): number => {
    let c = 0;
    for (const ch of n.children) c += 1 + count(ch);
    n.child_count = c;
    return c;
  };
  roots.forEach(count);
  return roots;
}

export function getFlatProvisions(): Provision[] {
  return all<Provision>("SELECT * FROM provisions ORDER BY ordem");
}

export function getProvision(id: string): Provision | undefined {
  return get<Provision>("SELECT * FROM provisions WHERE id = ?", [id]);
}

export function getStatusCounts() {
  const rows = all<{ status: ProvisionStatus; c: number }>(
    "SELECT status, COUNT(*) c FROM provisions GROUP BY status"
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

export function getArticleCount(): number {
  return get<{ c: number }>("SELECT COUNT(*) c FROM provisions WHERE type = 'artigo'")?.c ?? 0;
}

export function getActiveMeeting() {
  return get<{ id: number }>("SELECT id FROM meetings WHERE status = 'em_andamento' ORDER BY id DESC LIMIT 1");
}

export function provisionLabel(p: Provision): string {
  const novoTipo = (tipo: string) => `NOVO ${tipo}`;
  switch (p.type) {
    case "capitulo":
      return p.numero ? `Capítulo ${p.numero}` : novoTipo("CAPÍTULO");
    case "secao":
      return p.numero ? `Seção ${p.numero}` : novoTipo("SEÇÃO");
    case "artigo":
      return p.numero ? `Art. ${p.numero}` : novoTipo("ARTIGO");
    case "paragrafo":
      return p.numero ? `Parágrafo ${p.numero}` : novoTipo("PARÁGRAFO");
    case "inciso":
      return p.numero ? `${p.numero}` : novoTipo("INCISO");
    case "alinea":
      return p.numero ? `Alínea ${p.numero}` : novoTipo("ALÍNEA");
    default:
      return p.id;
  }
}

export function parentChain(id: string): Provision[] {
  const chain: Provision[] = [];
  let cur = getProvision(id);
  while (cur && cur.parent_id) {
    cur = getProvision(cur.parent_id);
    if (cur) chain.unshift(cur);
  }
  return chain;
}
