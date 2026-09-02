import { getTree, provisionLabel, type TreeNode } from "./data";
import { all } from "./db";
import { htmlToText } from "./rich-text";
export {
  toRoman,
  ordinalArtigo,
  parseNumeroArtigo,
  renumerar,
  type ArtigoRenumeravel,
  type ReferenciaDetectada,
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
export async function getArtigosOrdenados() {
  const tree = await getTree();
  const allNodes = new Map<string, TreeNode>();
  const visit = (n: TreeNode) => {
    allNodes.set(n.id, n);
    n.children.forEach(visit);
  };
  tree.forEach(visit);
  return flattenArtigos(tree).map((n) => ({
    id: n.id,
    numeroAtual: n.numero,
    label: provisionLabel(n),
    chapter: chapterFor(n, allNodes),
  }));
}

const REF_RE = /\b(?:arts?\.?|artigos?)\s+(\d+)\s*(?:º|°)?/gi;

/** Detecta menções a números de artigo nos textos dos dispositivos. */
export async function detectarReferencias() {
  const rows = await all<{ id: string; numero: string | null; texto_vigente: string; proposta_inicial: string; redacao_trabalho: string; redacao_consolidada: string; justificativa: string }>(`
    SELECT id, numero, texto_vigente, proposta_inicial, redacao_trabalho, redacao_consolidada, justificativa
    FROM provisions`);
  const out: {
    provisionId: string;
    provisionLabel: string;
    campo: string;
    excerpt: string;
    numero: number;
  }[] = [];
  const campos = [
    { key: "texto_vigente", label: "Texto vigente" },
    { key: "proposta_inicial", label: "Proposta inicial" },
    { key: "redacao_trabalho", label: "Redação de trabalho" },
    { key: "redacao_consolidada", label: "Redação consolidada" },
    { key: "justificativa", label: "Justificativa" },
  ] as const;
  for (const r of rows) {
    const label = provisionLabel(r as never);
    for (const c of campos) {
      const text = htmlToText(r[c.key]);
      REF_RE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = REF_RE.exec(text))) {
        const numero = parseInt(m[1], 10);
        const start = Math.max(0, m.index - 40);
        const end = Math.min(text.length, m.index + m[0].length + 40);
        out.push({
          provisionId: r.id,
          provisionLabel: label,
          campo: c.label,
          excerpt: text.slice(start, end).trim(),
          numero,
        });
      }
    }
  }
  return out;
}