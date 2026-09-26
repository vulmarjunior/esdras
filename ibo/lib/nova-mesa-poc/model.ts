import { Alignment, Mark, normalizeRuns, plainText, TextRun, toRuns, markRange } from "./rich-text";
/** Modelo experimental isolado: não usa nem modifica dispositivos históricos. */
export type NodeType = "chapter" | "section" | "subsection" | "article" | "paragraph" | "inciso" | "alinea" | "free";
export type NovaMesaStatus = "pendente" | "em_analise" | "aprovado";
export type DraftNode = { id: string; type: NodeType; text: string; runs?: TextRun[]; alignment?: Alignment; status?: NovaMesaStatus; children: DraftNode[] };
export type Draft = { id: string; nodes: DraftNode[] };
export type FlatRow = { node: DraftNode; siblings: DraftNode[]; parentId: string | null; articleNumber: number; chapterNumber: number; depth: number };

const letters = "abcdefghijklmnopqrstuvwxyz";
const roman = (n: number): string => {
  const parts: [number, string][] = [[1000,"M"],[900,"CM"],[500,"D"],[400,"CD"],[100,"C"],[90,"XC"],[50,"L"],[40,"XL"],[10,"X"],[9,"IX"],[5,"V"],[4,"IV"],[1,"I"]];
  let result = ""; for (const [value, label] of parts) { while (n >= value) {result += label; n -= value;} } return result;
};
export function labelFor(node: DraftNode, siblings: DraftNode[], articleNumber: number, chapterNumber: number): string {
  if (node.type === "free") return "";
  if (node.type === "chapter") return "CAPÍTULO " + roman(chapterNumber);
  if (node.type === "section") return "Seção " + roman(siblings.filter(n=>n.type==="section").findIndex(n=>n.id===node.id)+1);
  if (node.type === "subsection") return "Subseção " + roman(siblings.filter(n=>n.type==="subsection").findIndex(n=>n.id===node.id)+1);
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
export function flattenDraft(draft: Draft): FlatRow[] {
  const rows: FlatRow[] = []; let articleNumber = 0, chapterNumber = 0;
  const visit = (siblings: DraftNode[], parentId: string | null, depth: number) => {
    for (const node of siblings) {
      if (node.type === "chapter") chapterNumber++;
      if (node.type === "article") articleNumber++;
      rows.push({ node, siblings, parentId, articleNumber, chapterNumber, depth });
      visit(node.children, node.id, depth + 1);
    }
  };
  visit(draft.nodes, null, 0);
  return rows;
}
export const statusOf = (node: DraftNode): NovaMesaStatus =>
  node.status === "em_analise" || node.status === "aprovado" ? node.status : "pendente";
/** Edição do texto derruba a apreciação anterior para revisão. */
const rebaixar = (status: NovaMesaStatus | undefined): NovaMesaStatus | undefined => (status === "aprovado" ? "em_analise" : status);
export function changeText(draft: Draft, id: string, text: string): Draft {
  const visit = (nodes: DraftNode[]): DraftNode[] => nodes.map(n=>n.id===id?{...n,text,runs:toRuns(text),status:text===n.text?n.status:rebaixar(n.status)}:{...n,children:visit(n.children)});
  return {...draft,nodes:visit(draft.nodes)};
}
/** Atualiza apenas as marcas do texto do dispositivo, sem tocar em seus filhos. */
export function formatSelection(draft:Draft,id:string,start:number,end:number,mark:Mark):Draft {
  const node=findNode(draft.nodes,id);
  if(!node)throw new Error("Dispositivo não encontrado");
  const runs=markRange(node.runs??toRuns(node.text),start,end,mark);
  return setRichText(draft,id,runs);
}
export function setRichText(draft:Draft,id:string,runs:readonly TextRun[]):Draft {
  if(!findNode(draft.nodes,id))throw new Error("Dispositivo não encontrado");
  const normalized=normalizeRuns(runs),text=plainText(normalized);
  const visit=(nodes:DraftNode[]):DraftNode[]=>nodes.map(n=>n.id===id?{...n,text,runs:normalized,status:text===n.text?n.status:rebaixar(n.status)}:{...n,children:visit(n.children)});
  return {...draft,nodes:visit(draft.nodes)};
}
/** Indicador editorial simples: o texto atual foi apreciado pela comissão. */
export function setStatus(draft:Draft,id:string,status:NovaMesaStatus):Draft {
  if(!findNode(draft.nodes,id))throw new Error("Dispositivo não encontrado");
  const next:NovaMesaStatus|undefined=status==="pendente"?undefined:status;
  const visit=(nodes:DraftNode[]):DraftNode[]=>nodes.map(n=>n.id===id?{...n,status:next}:{...n,children:visit(n.children)});
  return {...draft,nodes:visit(draft.nodes)};
}
export function setAlignment(draft:Draft,id:string,alignment:Alignment):Draft {
  if(!findNode(draft.nodes,id))throw new Error("Dispositivo não encontrado");
  const visit=(nodes:DraftNode[]):DraftNode[]=>nodes.map(n=>n.id===id?{...n,alignment}:{...n,children:visit(n.children)});
  return {...draft,nodes:visit(draft.nodes)};
}
/** Validação de hierarquia no modelo, não apenas na interface. */
export function canContain(parent: NodeType | null, child: NodeType): boolean {
  if (child === "free") return parent === null || parent === "chapter" || parent === "section" || parent === "subsection" || parent === "article";
  if (child === "chapter") return parent === null;
  if (child === "section") return parent === "chapter";
  if (child === "subsection") return parent === "section";
  if (child === "article") return parent === null || parent === "chapter" || parent === "section" || parent === "subsection";
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
