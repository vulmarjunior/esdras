import {canContain, type Draft, type DraftNode, type NodeType} from "./model";
import {plainText, type Mark} from "./rich-text";
const allowedTypes:NodeType[]=["chapter","section","subsection","article","paragraph","inciso","alinea","free"];
const allowedMarks:Mark[]=["bold","italic","underline"];
const allowedAlignments=["left","center","right","justify"];
/** Revalida a árvore recebida da rede: typescript no cliente não é controle de segurança. */
export function validateDraft(value:unknown):Draft{
  const raw=JSON.stringify(value);
  if(!raw||raw.length>1_000_000)throw new Error("Minuta excede o tamanho permitido.");
  if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("Minuta inválida.");
  const draft=value as Partial<Draft>;
  if(draft.id!=="estatuto-ibo-2026"||!Array.isArray(draft.nodes))throw new Error("Identificação da minuta inválida.");
  const ids=new Set<string>();let count=0;
  const visit=(nodes:unknown[],parent:NodeType|null,depth:number):void=>{
    if(depth>12||nodes.length>10000)throw new Error("Estrutura excessiva.");
    for(const value of nodes){
      if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("Dispositivo inválido.");
      const node=value as DraftNode;
      if(typeof node.id!=="string"||node.id.length>120||!node.id||ids.has(node.id))throw new Error("ID inválido ou duplicado.");
      ids.add(node.id);if(++count>10000)throw new Error("Minuta excede o limite de dispositivos.");
      if(!allowedTypes.includes(node.type)||!canContain(parent,node.type))throw new Error("Hierarquia inválida.");
      if(typeof node.text!=="string"||node.text.length>100000||!Array.isArray(node.children))throw new Error("Texto ou estrutura inválida.");
      if(node.approved!==undefined&&typeof node.approved!=="boolean")throw new Error("Marcação de aprovação inválida.");
      if(node.alignment!==undefined&&!allowedAlignments.includes(node.alignment))throw new Error("Alinhamento inválido.");
      if(node.runs!==undefined){
        if(!Array.isArray(node.runs)||node.runs.length>10000)throw new Error("Formatação inválida.");
        for(const run of node.runs){
          if(!run||typeof run.text!=="string"||!Array.isArray(run.marks)||run.marks.some(mark=>!allowedMarks.includes(mark)))
            throw new Error("Marca textual inválida.");
        }
        if(plainText(node.runs)!==node.text)throw new Error("Texto e formatação divergentes.");
      }
      visit(node.children,node.type,depth+1);
    }
  };
  visit(draft.nodes,null,0);
  return draft as Draft;
}
