import { htmlToText } from "./rich-text";
import { provisionLabel } from "./provision-label";
import { ordenarIrmaos } from "./tree-order";
import type { Provision } from "./types";
import type { OriginalPosition } from "./review-original";

export type ReviewChange = "Não alterado" | "Alterado" | "Novo" | "Revogado";
export interface ReviewNode extends Provision { children: ReviewNode[] }
export interface DiffPart { text: string; changed: boolean }
export interface ReviewRow {
  id: string; label: string; originalLabel: string | null;
  title: string; originalTitle: string; context: string;
  chapterId: string; chapterLabel: string; depth: number;
  before: string; after: string; source: string; status: string;
  change: ReviewChange; moved: boolean; renumbered: boolean;
  beforeParts: DiffPart[]; afterParts: DiffPart[];
}

export function normalizeText(text: string): string {
  return htmlToText(text).replace(/&#(x[0-9a-f]+|[0-9]+);/gi, (match, code: string) => {
    const value = code.toLowerCase().startsWith("x") ? parseInt(code.slice(1), 16) : Number(code);
    return value > 0 && value <= 0x10ffff ? String.fromCodePoint(value) : match;
  }).normalize("NFC").replace(/\s+/g, " ").trim();
}

/** Word-level LCS; bounded memory for unusually large imported provisions. */
export function diffWords(before: string, after: string): [DiffPart[], DiffPart[]] {
  if (before === after) return [[{ text: before, changed: false }], [{ text: after, changed: false }]];
  const a = before.match(/\S+\s*/g) ?? [];
  const b = after.match(/\S+\s*/g) ?? [];
  if (a.length * b.length > 1_000_000) return [[{ text: before, changed: true }], [{ text: after, changed: true }]];
  const dp = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = a[i].trim() === b[j].trim() ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const left: DiffPart[] = [], right: DiffPart[] = [];
  let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i].trim() === b[j].trim()) {
      left.push({ text: a[i++], changed: false }); right.push({ text: b[j++], changed: false });
    } else if (i < a.length && (j === b.length || dp[i + 1][j] >= dp[i][j + 1])) {
      left.push({ text: a[i++], changed: true });
    } else right.push({ text: b[j++], changed: true });
  }
  return [left, right];
}

export function buildReview(tree: ReviewNode[], originals: ReadonlyMap<string, OriginalPosition>): ReviewRow[] {
  const rows: ReviewRow[] = [];
  function walk(nodes: ReviewNode[], depth: number, chapterId: string, chapterLabel: string, context: string) {
    const ordered = ordenarIrmaos(nodes);
    // Compare relative order of surviving original siblings; additions do not mark others as moved.
    // A identidade histórica vem da importação (`originals`), não da tag "novo" do operador.
    const siblings = ordered.filter(n => originals.get(n.id)?.parentId === n.parent_id);
    const historical = [...siblings].sort((a, b) => originals.get(a.id)!.order - originals.get(b.id)!.order);
    for (const node of ordered) {
      const original = originals.get(node.id);
      const label = provisionLabel(node);
      const groupId = depth === 0 || node.type === "capitulo" ? node.id : chapterId;
      const groupLabel = depth === 0 || node.type === "capitulo" ? label : chapterLabel;
      const before = normalizeText(node.texto_vigente);
      const working = normalizeText(node.redacao_trabalho);
      const proposal = normalizeText(node.proposta_inicial);
      const revoked = node.alteracao_tipo === "revogado";
      const after = revoked ? "" : working || proposal || before;
      const titleChanged = original ? normalizeText(original.titulo ?? "") !== normalizeText(node.titulo ?? "") : false;
      const change: ReviewChange = revoked ? "Revogado" : !original && !before ? "Novo" : before === after && !titleChanged ? "Não alterado" : "Alterado";
      const [beforeParts, afterParts] = diffWords(before, after);
      rows.push({
        id: node.id, label, originalLabel: original ? provisionLabel({ ...node, numero: original.numero }) : null,
        title: node.titulo ?? "", originalTitle: original?.titulo ?? "", context,
        chapterId: groupId, chapterLabel: groupLabel, depth, before, after,
        source: revoked ? "Retirada indicada" : working ? "Redação de trabalho" : proposal ? "Proposta inicial" : "Texto vigente",
        status: node.status, change,
        moved: !!original && (original.parentId !== node.parent_id || siblings.indexOf(node) !== historical.indexOf(node)),
        renumbered: !!original && original.numero !== node.numero,
        beforeParts, afterParts,
      });
      walk(node.children, depth + 1, groupId, groupLabel, context ? `${context} / ${label}` : label);
    }
  }
  walk(tree, 0, "", "", "");
  return rows;
}
