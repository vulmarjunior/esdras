import type { TreeNode } from "./data";

/** True se o nó (ou qualquer descendente) tem anotação pessoal. */
export function contemAnotacao(node: TreeNode, notas: ReadonlySet<string>): boolean {
  if (notas.has(node.id)) return true;
  return node.children.some((c) => contemAnotacao(c, notas));
}

/**
 * Filtra a árvore mantendo apenas nós com anotação pessoal e seus ancestrais.
 * Retorna null quando o nó e todos os descendentes ficam sem anotação.
 */
export function filtrarPorAnotacao(node: TreeNode, notas: ReadonlySet<string>): TreeNode | null {
  const temNota = notas.has(node.id);
  const filhos = node.children
    .map((c) => filtrarPorAnotacao(c, notas))
    .filter((c): c is TreeNode => c !== null);
  if (!temNota && filhos.length === 0) return null;
  return { ...node, children: filhos };
}