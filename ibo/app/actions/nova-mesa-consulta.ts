"use server";

import { requireUser } from "@/lib/auth";
import { getProposalTree, getVigenteTree, type TreeNode } from "@/lib/data";
import { provisionLabel } from "@/lib/provision-label";
import { CONFISSOES } from "@/lib/confissoes";

export type ConsultationItem = { id:string; title:string; group:"Estatutos"|"Documentos doutrinários" };
export type ConsultationResult = { title:string; text:string };

/** Catálogo apenas de documentos já disponíveis no Esdras; sem duplicar fontes na minuta. */
export async function listConsultationDocuments():Promise<ConsultationItem[]> {
  await requireUser();
  return [
    {id:"statute:current",title:"Estatuto vigente (versão histórica)",group:"Estatutos"},
    {id:"statute:proposal",title:"Proposta em elaboração na Mesa existente",group:"Estatutos"},
    ...CONFISSOES.map(doc=>({id:"confession:"+doc.id,title:doc.nome,group:"Documentos doutrinários" as const})),
  ];
}

function asReadableText(nodes:TreeNode[],version:"current"|"proposal"):string {
  const lines:string[]=[];
  const visit=(siblings:TreeNode[],depth:number)=>{
    for(const node of siblings){
      const label=provisionLabel(node);
      const text=version==="current"?node.texto_vigente:
        node.redacao_trabalho||node.proposta_inicial||node.redacao_consolidada||"";
      // Referência somente leitura. HTML legado permanece texto literal, sem execução.
      const heading=[label,node.titulo].filter(Boolean).join(" — ");
      lines.push("  ".repeat(Math.min(depth,5))+heading);
      if(text.trim())lines.push(text.trim(),"");
      visit(node.children,depth+1);
    }
  };
  visit(nodes,0);
  return lines.join("\n");
}

/** Acesso autenticado e somente leitura às mesmas fontes já presentes no Esdras. */
export async function readConsultationDocument(id:string):Promise<ConsultationResult>{
  await requireUser();
  if(id==="statute:current")return {
    title:"Estatuto vigente (versão histórica)",
    text:asReadableText(await getVigenteTree(),"current"),
  };
  if(id==="statute:proposal")return {
    title:"Proposta em elaboração na Mesa existente",
    text:asReadableText(await getProposalTree(),"proposal"),
  };
  if(id.startsWith("confession:")){
    const confession=CONFISSOES.find(doc=>doc.id===id.slice("confession:".length));
    if(confession)return {
      title:confession.nome,
      text:confession.itens.map(item=>item.titulo+"\n\n"+item.conteudo).join("\n\n"),
    };
  }
  throw new Error("Documento de consulta não encontrado.");
}
