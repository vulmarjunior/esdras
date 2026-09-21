import { getProposalTree, getTree, provisionLabel, type TreeNode } from "./data";
import type { DocumentVersion } from "./types";
import { numerarArvore } from "./numeracao";
export {
  toRoman,
  ordinalArtigo,
  parseNumeroArtigo,
  renumerar,
  type ArtigoRenumeravel,
} from "./renumeracao-core";

/** Achatamento da árvore: artigos na ordem do documento (ordem_pai/ordem). */
export function flattenArtigos(nodes: TreeNode[]): TreeNode[] {
  const out: TreeNode[] = [];
  for (const n of nodes) {
    if (n.type === "artigo") out.push(n);
    out.push(...flattenArtigos(n.children));
  }
  return out;
}

/** Mapa id -> rótulo do capítulo (ancestral topo do artigo). */
export function chapterFor(node: TreeNode, allNodes: Map<string, TreeNode>): string {
  let cur = node;
  const seen = new Set<string>();
  while (cur.parent_id && allNodes.has(cur.parent_id)) {
    if (seen.has(cur.id)) break;
    seen.add(cur.id);
    const parent = allNodes.get(cur.parent_id)!;
    cur = parent;
  }
  if (cur.type === "capitulo") return provisionLabel(cur);
  return "—";
}

/** Lista os artigos da árvore na ordem atual, com rótulo de capítulo. */
export async function getArtigosOrdenados(version: DocumentVersion = "proposta") {
  const tree = version === "proposta" ? await getProposalTree() : await getTree();
  const allNodes = new Map<string, TreeNode>();
  const visit = (n: TreeNode) => {
    allNodes.set(n.id, n);
    n.children.forEach(visit);
  };
  tree.forEach(visit);
  return flattenArtigos(tree)
    .filter((n) => n.alteracao_tipo !== "revogado")
    .map((n) => ({
      id: n.id,
      numeroAtual: n.numero,
      label: provisionLabel(n),
      chapter: chapterFor(n, allNodes),
    }));
}

export interface NumeravelOrdenado {
  id: string;
  type: "artigo" | "capitulo";
  /** Número gravado em `provision_placements` (documento original da proposta). */
  numeroArmazenado: string | null;
  /** Número derivado da ordem atual (numeração de trabalho). */
  derivado: string;
  /** Rótulo com a numeração de trabalho. */
  label: string;
  chapter: string;
}

/**
 * Artigos e capítulos na ordem atual, com a numeração armazenada (documento
 * original) e a derivada da ordem (numeração de trabalho da proposta).
 */
export async function getNumeraveisOrdenados(version: DocumentVersion = "proposta"): Promise<NumeravelOrdenado[]> {
  const tree = version === "proposta" ? await getProposalTree() : await getTree();
  const allNodes = new Map<string, TreeNode>();
  const visit = (n: TreeNode) => {
    allNodes.set(n.id, n);
    n.children.forEach(visit);
  };
  tree.forEach(visit);

  const derivados = numerarArvore(tree);
  const out: NumeravelOrdenado[] = [];
  const walk = (nodes: TreeNode[]) => {
    for (const n of nodes) {
      if (n.type === "artigo" || n.type === "capitulo") {
        const derivado = derivados.get(n.id);
        if (derivado) {
          out.push({
            id: n.id,
            type: n.type,
            numeroArmazenado: n.numero,
            derivado,
            label: provisionLabel({ ...n, numero: derivado } as never),
            chapter: chapterFor(n, allNodes),
          });
        }
      }
      walk(n.children);
    }
  };
  walk(tree);
  return out;
}
