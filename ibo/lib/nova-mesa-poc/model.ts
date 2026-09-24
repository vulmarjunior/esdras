/** Modelo experimental isolado: não usa nem modifica dispositivos históricos. */
export type NodeType = "chapter" | "article" | "paragraph" | "inciso" | "alinea" | "free";
export type DraftNode = { id: string; type: NodeType; text: string; children: DraftNode[] };
export type Draft = { id: string; nodes: DraftNode[] };

const letters = "abcdefghijklmnopqrstuvwxyz";
const roman = (n: number): string => {
  const parts: [number, string][] = [[1000,"M"],[900,"CM"],[500,"D"],[400,"CD"],[100,"C"],[90,"XC"],[50,"L"],[40,"XL"],[10,"X"],[9,"IX"],[5,"V"],[4,"IV"],[1,"I"]];
  let result = ""; for (const [value, label] of parts) { while (n >= value) {result += label; n -= value;} } return result;
};
export function labelFor(node: DraftNode, siblings: DraftNode[], articleNumber: number, chapterNumber: number): string {
  if (node.type === "free") return "";
  if (node.type === "chapter") return "CAPÍTULO " + roman(chapterNumber);
  if (node.type === "article") return "Art. " + articleNumber + (articleNumber <= 9 ? "º" : "") + " ";
  const same = siblings.filter(n => n.type === node.type);
  const ordinal = same.findIndex(n => n.id === node.id) + 1;
  if (node.type === "paragraph") return same.length === 1 ? "Parágrafo único. " : "§ " + ordinal + "º ";
  if (node.type === "inciso") return roman(ordinal) + " – ";
  return (letters[ordinal - 1] ?? "(" + ordinal + ")") + ") ";
}
export function findNode(nodes: DraftNode[], id: string): DraftNode | undefined {
  for (const n of nodes) { if (n.id === id) return n; const child = findNode(n.children,id); if(child) return child; }
}
export function changeText(draft: Draft, id: string, text: string): Draft {
  const visit = (nodes: DraftNode[]): DraftNode[] => nodes.map(n=>n.id===id?{...n,text}:{...n,children:visit(n.children)});
  return {...draft,nodes:visit(draft.nodes)};
}
/** Validação de hierarquia no modelo, não apenas na interface. */
export function canContain(parent: NodeType | null, child: NodeType): boolean {
  if (child === "free") return parent === null || parent === "chapter" || parent === "article";
  if (child === "chapter") return parent === null;
  if (child === "article") return parent === null || parent === "chapter";
  if (child === "paragraph" || child === "inciso") return parent === "article";
  if (child === "alinea") return parent === "inciso";
  return false;
}
function assertSubtree(node: DraftNode, seen: Set<string>): void {
  if (!node.id || seen.has(node.id)) throw new Error("Identidade inválida ou duplicada");
  seen.add(node.id);
  for (const child of node.children) {
    if (!canContain(node.type, child.type)) throw new Error("Hierarquia normativa inválida");
    assertSubtree(child, seen);
  }
}
export function insertAfter(draft: Draft, parentId: string | null, afterId: string | null, node: DraftNode): Draft {
  const parent = parentId === null ? null : findNode(draft.nodes, parentId);
  if (parentId !== null && !parent) throw new Error("Pai não encontrado");
  if (!canContain(parent?.type ?? null, node.type)) throw new Error("Hierarquia normativa inválida");
  const ids = new Set<string>();
  const collect = (nodes: DraftNode[]): void => { for (const item of nodes) { ids.add(item.id); collect(item.children); } };
  collect(draft.nodes);
  assertSubtree(node, ids);
  const insert = (siblings: DraftNode[]) => {
    const index = afterId === null ? -1 : siblings.findIndex(n=>n.id===afterId);
    if (afterId !== null && index < 0) throw new Error("Posição não encontrada");
    return [...siblings.slice(0,index+1),node,...siblings.slice(index+1)];
  };
  if (parentId===null) return {...draft,nodes:insert(draft.nodes)};

  const visit=(nodes:DraftNode[]):DraftNode[]=>nodes.map(n=>n.id===parentId?{...n,children:insert(n.children)}:{...n,children:visit(n.children)});
  return {...draft,nodes:visit(draft.nodes)};
}
export function removeNode(draft: Draft,id: string): Draft {
  const visit=(nodes:DraftNode[]):DraftNode[]=>nodes.filter(n=>n.id!==id).map(n=>({...n,children:visit(n.children)}));
  return {...draft,nodes:visit(draft.nodes)};
}
export function moveNode(draft: Draft,id:string,parentId:string|null,afterId:string|null):Draft {
  const node=findNode(draft.nodes,id);
  if (!node) throw new Error("Dispositivo não encontrado");
  if (id===parentId || (parentId && findNode(node.children,parentId))) throw new Error("Movimento circular");
  if (id===afterId) throw new Error("Não pode mover após si mesmo");
  if (afterId && findNode(node.children,afterId)) throw new Error("Não pode mover após descendente");
  const without=removeNode(draft,id);
  return insertAfter(without,parentId,afterId,node);
}
export const newNode=(type:NodeType):DraftNode=>({id:crypto.randomUUID(),type,text:"",children:[]});
