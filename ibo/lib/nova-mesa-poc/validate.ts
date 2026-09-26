import {canContain, type Draft, type DraftNode, type NovaMesaStatus, type NodeType} from "./model";
import {plainText, type Mark} from "./rich-text";
const allowedTypes:NodeType[]=["chapter","section","subsection","article","paragraph","inciso","alinea","free"];
const allowedMarks:Mark[]=["bold","italic","underline"];
const allowedAlignments=["left","center","right","justify"];
const allowedStatus:NovaMesaStatus[]=["pendente","em_analise","aprovado"];
/** Revalida a árvore recebida da rede: typescript no cliente não é controle de segurança. */
export function validateDraft(value:unknown):Draft{
  const raw=JSON.stringify(value);
  if(!raw||raw.length>1_000_000)throw new Error("Minuta excede o tamanho permitido.");
  if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("Minuta inválida.");
  const draft=value as Partial<Draft>;
  if(draft.id!=="estatuto-ibo-2026"||!Array.isArray(draft.nodes))throw new Error("Identificação da minuta inválida.");
  const ids=new Set<string>();let count=0;
  const visit=(nodes:unknown[],parent:NodeType|null,depth:number):DraftNode[]=>{
    if(depth>12||nodes.length>10000)throw new Error("Estrutura excessiva.");
    const normalized:DraftNode[]=[];
    for(const value of nodes){
      if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("Dispositivo inválido.");
      const node=value as DraftNode&{approved?:unknown};
      if(typeof node.id!=="string"||node.id.length>120||!node.id||ids.has(node.id))throw new Error("ID inválido ou duplicado.");
      ids.add(node.id);if(++count>10000)throw new Error("Minuta excede o limite de dispositivos.");
      if(!allowedTypes.includes(node.type)||!canContain(parent,node.type))throw new Error("Hierarquia inválida.");
      if(typeof node.text!=="string"||node.text.length>100000||!Array.isArray(node.children))throw new Error("Texto ou estrutura inválida.");
      let status:NovaMesaStatus="pendente";
      if(node.status!==undefined){
        if(!allowedStatus.includes(node.status))throw new Error("Estado de apreciação inválido.");
        status=node.status;
      }else if(node.approved!==undefined){
        if(typeof node.approved!=="boolean")throw new Error("Marcação de aprovação inválida.");
        if(node.approved)status="aprovado";
      }
      if(node.alignment!==undefined&&!allowedAlignments.includes(node.alignment))throw new Error("Alinhamento inválido.");
      if(node.runs!==undefined){
        if(!Array.isArray(node.runs)||node.runs.length>10000)throw new Error("Formatação inválida.");
        for(const run of node.runs){
          if(!run||typeof run.text!=="string"||!Array.isArray(run.marks)||run.marks.some(mark=>!allowedMarks.includes(mark)))
            throw new Error("Marca textual inválida.");
        }
        if(plainText(node.runs)!==node.text)throw new Error("Texto e formatação divergentes.");
      }
      const clean:DraftNode={id:node.id,type:node.type,text:node.text,children:visit(node.children,node.type,depth+1)};
      if(node.runs!==undefined)clean.runs=node.runs;
      if(node.alignment!==undefined)clean.alignment=node.alignment;
      if(status!=="pendente")clean.status=status;
      normalized.push(clean);
    }
    return normalized;
  };
  return {id:"estatuto-ibo-2026",nodes:visit(draft.nodes,null,0)};
}
