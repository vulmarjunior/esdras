import { formatarNumeroArtigo } from "./numeracao";

export interface WorkbenchMoveNode {
  id: string;
  type: string;
  alteracaoTipo?: string;
  children: WorkbenchMoveNode[];
}

export interface ArticleMoveEffect {
  id: string;
  from: string;
  to: string;
}

export interface WorkbenchSelectableNode {
  id: string;
  parentId: string | null;
}

/**
 * Escolhe o dispositivo a selecionar depois de excluir `removidoId` da lista
 * achatada (ordem do documento): o item imediatamente anterior ou, na falta
 * dele, o pai. Retorna null quando o item não está na lista.
 */
export function escolherSelecaoAposExclusao(
  nodes: WorkbenchSelectableNode[],
  removidoId: string,
): string | null {
  const index = nodes.findIndex((node) => node.id === removidoId);
  if (index === -1) return null;
  if (index > 0) return nodes[index - 1].id;
  return nodes[index].parentId;
}

function articleNumbers(nodes: WorkbenchMoveNode[]): Map<string, string> {
  const result = new Map<string, string>();
  let article = 0;
  const visit = (list: WorkbenchMoveNode[]) => {
    for (const node of list) {
      if (node.alteracaoTipo === "revogado") continue;
      if (node.type === "artigo") {
        article++;
        result.set(node.id, formatarNumeroArtigo(article));
      }
      visit(node.children);
    }
  };
  visit(nodes);
  return result;
}

function removeNode(
  nodes: WorkbenchMoveNode[],
  id: string,
): { nodes: WorkbenchMoveNode[]; moved: WorkbenchMoveNode | null } {
  let moved: WorkbenchMoveNode | null = null;
  const next: WorkbenchMoveNode[] = [];
  for (const node of nodes) {
    if (node.id === id) {
      moved = node;
      continue;
    }
    const childResult = removeNode(node.children, id);
    if (childResult.moved) moved = childResult.moved;
    next.push({ ...node, children: childResult.nodes });
  }
  return { nodes: next, moved };
}

function insertAmong(
  nodes: WorkbenchMoveNode[],
  moved: WorkbenchMoveNode,
  afterId: string | null,
): WorkbenchMoveNode[] {
  const result = nodes.filter((node) => node.id !== moved.id);
  if (afterId === null) return [moved, ...result];
  const index = result.findIndex((node) => node.id === afterId);
  if (index === -1) return [...result, moved];
  result.splice(index + 1, 0, moved);
  return result;
}

function insertNode(
  nodes: WorkbenchMoveNode[],
  parentId: string | null,
  moved: WorkbenchMoveNode,
  afterId: string | null,
): WorkbenchMoveNode[] {
  if (parentId === null) return insertAmong(nodes, moved, afterId);
  return nodes.map((node) =>
    node.id === parentId
      ? { ...node, children: insertAmong(node.children, moved, afterId) }
      : { ...node, children: insertNode(node.children, parentId, moved, afterId) },
  );
}

/**
 * Simula a consequência numérica de uma movimentação sem alterar a árvore.
 * A ação real continua sendo validada e registrada no servidor.
 */
export function simulateArticleMove(
  nodes: WorkbenchMoveNode[],
  movedId: string,
  newParentId: string | null,
  afterId: string | null,
): ArticleMoveEffect[] {
  const before = articleNumbers(nodes);
  const removed = removeNode(nodes, movedId);
  if (!removed.moved) return [];
  const simulated = insertNode(removed.nodes, newParentId, removed.moved, afterId);
  const after = articleNumbers(simulated);
  const effects: ArticleMoveEffect[] = [];
  for (const [id, from] of before) {
    const to = after.get(id);
    if (to && from !== to) effects.push({ id, from, to });
  }
  return effects;
}
