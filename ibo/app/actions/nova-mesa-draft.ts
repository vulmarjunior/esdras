"use server";

import {all,get,transaction} from "@/lib/db";
import {requireRole,requireUser} from "@/lib/auth";
import {publishRealtime} from "@/lib/realtime";
import {validateDraft} from "@/lib/nova-mesa-poc/validate";
import {importarMinuta} from "@/lib/nova-mesa-poc/importar";
import {DOCUMENTO_PADRAO,ESTATUTO,documentoPorId,type DocumentoConfig} from "@/lib/nova-mesa-poc/documentos";
import type {Draft} from "@/lib/nova-mesa-poc/model";

function resolverDocumento(documentoId:string|undefined):DocumentoConfig{
  return documentoPorId(documentoId??DOCUMENTO_PADRAO);
}

/** Avisa as demais sessões (no máximo a cada 10 s) para renovarem o documento. */
let ultimoAviso=0;
function avisarAtualizacao(documento:DocumentoConfig):void{
  const agora=Date.now();
  if(agora-ultimoAviso<10_000)return;
  ultimoAviso=agora;
  void publishRealtime({origem:"nova-mesa",documento:documento.id});
}
type Row={content:Draft;version:number;updated_at:string};
export type DraftSnapshot={draft:Draft;version:number;updatedAt:string|null};
export type DraftSaveResult={ok:true;version:number}|{ok:false;conflict:true;version:number}|{ok:false;error:string};

/** Lê apenas o documento editável isolado, não os dados vigentes nem a proposta histórica. */
export async function loadNovaMesaDraft(documentoId?:string):Promise<DraftSnapshot>{
  await requireUser();
  const documento=resolverDocumento(documentoId);
  const row=await get<Row>("SELECT content,version,updated_at FROM nova_mesa_drafts WHERE id = ?",[documento.id]);
  if(!row)return {draft:{id:documento.id,nodes:[]},version:0,updatedAt:null};
  return {draft:validateDraft(row.content,documento),version:row.version,updatedAt:row.updated_at};
}

/** Autosave/salvar agora: atualiza o rascunho com controle de concorrência, sem criar marco no histórico. */
export async function saveNovaMesaDraft(candidate:unknown,expectedVersion:number,documentoId?:string):Promise<DraftSaveResult>{
  const user=await requireRole("admin","coordenador");
  const documento=resolverDocumento(documentoId);
  if(!Number.isSafeInteger(expectedVersion)||expectedVersion<0)return {ok:false,error:"Versão esperada inválida."};
  let draft:Draft;
  try{draft=validateDraft(candidate,documento);}catch(error){return {ok:false,error:error instanceof Error?error.message:"Minuta inválida."};}
  const resultado=await transaction(async():Promise<DraftSaveResult>=>{
    if(expectedVersion===0){
      const inserted=await all<{version:number}>(`INSERT INTO nova_mesa_drafts (id,content,version,updated_by)
        VALUES (?,?::jsonb,1,?) ON CONFLICT (id) DO NOTHING RETURNING version`,
        [documento.id,JSON.stringify(draft),user.id]);
      if(inserted.length){
        return {ok:true,version:1};
      }
    }else{
      const updated=await all<{version:number}>(`UPDATE nova_mesa_drafts
        SET content = ?::jsonb, version = version + 1, updated_by = ?, updated_at = now()
        WHERE id = ? AND version = ? RETURNING version`,
        [JSON.stringify(draft),user.id,documento.id,expectedVersion]);
      if(updated.length){
        return {ok:true,version:updated[0].version};
      }
    }
    const current=await get<{version:number}>("SELECT version FROM nova_mesa_drafts WHERE id = ?",[documento.id]);
    return {ok:false,conflict:true,version:current?.version??0};
  });
  if(resultado.ok)avisarAtualizacao(documento);
  return resultado;
}

/** Cria um marco explícito da revisão já salva; não altera o rascunho nem as versões antigas. */
export async function checkpointNovaMesaVersion(expectedVersion:number,documentoId?:string):Promise<DraftSaveResult>{
  const user=await requireRole("admin","coordenador");
  const documento=resolverDocumento(documentoId);
  if(!Number.isSafeInteger(expectedVersion)||expectedVersion<1)
    return {ok:false,error:"Salve a minuta antes de registrar uma versão."};
  const resultado=await transaction(async():Promise<DraftSaveResult>=>{
    const row=await get<Row>("SELECT content,version,updated_at FROM nova_mesa_drafts WHERE id=? FOR UPDATE",[documento.id]);
    if(!row)return {ok:false,error:documento.nome+" não encontrado."};
    if(row.version!==expectedVersion)return {ok:false,conflict:true,version:row.version};
    const content=JSON.stringify(validateDraft(row.content,documento));
    await all(`INSERT INTO nova_mesa_draft_versions (draft_id,version,content,author_id)
      VALUES (?,?,?::jsonb,?) ON CONFLICT (draft_id,version) DO NOTHING RETURNING id`,
      [documento.id,row.version,content,user.id]);
    return {ok:true,version:row.version};
  });
  if(resultado.ok)avisarAtualizacao(documento);
  return resultado;
}

/** Histórico imutável, lido sob sessão; restauração exigirá uma nova revisão explícita. */
export async function listNovaMesaVersions(documentoId?:string):Promise<{version:number;author:string|null;createdAt:string}[]>{
  await requireUser();
  const documento=resolverDocumento(documentoId);
  const rows=await all<{version:number;author:string|null;created_at:string}>(`
    SELECT v.version,u.name AS author,v.created_at FROM nova_mesa_draft_versions v
    LEFT JOIN users u ON u.id=v.author_id WHERE v.draft_id=? ORDER BY v.version DESC LIMIT 100`,[documento.id]);
  return rows.map(row=>({version:row.version,author:row.author,createdAt:row.created_at}));
}

/** Recupera um marco anterior para comparação sem modificar o rascunho atual. */
export async function readNovaMesaVersion(version:number,documentoId?:string):Promise<Draft>{
  await requireUser();
  const documento=resolverDocumento(documentoId);
  if(!Number.isSafeInteger(version)||version<1)throw new Error("Versão inválida.");
  const previous=await get<{content:Draft}>("SELECT content FROM nova_mesa_draft_versions WHERE draft_id=? AND version=?",
    [documento.id,version]);
  if(!previous)throw new Error("Versão não encontrada.");
  return validateDraft(previous.content,documento);
}

/** Restaurar gera nova versão. Nunca apaga o texto atual nem o histórico anterior. */
export async function restoreNovaMesaVersion(sourceVersion:number,expectedVersion:number,documentoId?:string):Promise<DraftSaveResult>{
  const user=await requireRole("admin","coordenador");
  const documento=resolverDocumento(documentoId);
  if(!Number.isSafeInteger(sourceVersion)||sourceVersion<1||!Number.isSafeInteger(expectedVersion)||expectedVersion<1)
    return {ok:false,error:"Versão inválida."};
  const resultado=await transaction(async():Promise<DraftSaveResult>=>{
    const current=await get<{version:number}>("SELECT version FROM nova_mesa_drafts WHERE id=? FOR UPDATE",[documento.id]);
    if(!current)return {ok:false,error:documento.nome+" não encontrado."};
    if(current.version!==expectedVersion)return {ok:false,conflict:true,version:current.version};
    const snapshot=await get<{content:Draft}>("SELECT content FROM nova_mesa_draft_versions WHERE draft_id=? AND version=?",
      [documento.id,sourceVersion]);
    if(!snapshot)return {ok:false,error:"Versão de origem não encontrada."};
    const content=JSON.stringify(validateDraft(snapshot.content,documento));
    const nextVersion=current.version+1;
    await all("UPDATE nova_mesa_drafts SET content=?::jsonb, version=?, updated_by=?, updated_at=now() WHERE id=? RETURNING id",
      [content,nextVersion,user.id,documento.id]);
    await all("INSERT INTO nova_mesa_draft_versions (draft_id,version,content,author_id) VALUES (?,?,?::jsonb,?) RETURNING id",
      [documento.id,nextVersion,content,user.id]);
    return {ok:true,version:nextVersion};
  });
  if(resultado.ok)avisarAtualizacao(documento);
  return resultado;
}

/**
 * Importa um arquivo (formato consolidado ou nativo) substituindo o documento atual.
 * Cria um marco de segurança da versão corrente antes de gravar e registra auditoria.
 */
export async function importarNovaMesaDraft(candidate:unknown,expectedVersion:number,documentoId?:string):Promise<DraftSaveResult>{
  const user=await requireRole("admin","coordenador");
  const documento=resolverDocumento(documentoId);
  if(!Number.isSafeInteger(expectedVersion)||expectedVersion<1)return {ok:false,error:"Salve a minuta antes de importar."};
  const resultado=await transaction(async():Promise<DraftSaveResult>=>{
    const row=await get<Row>("SELECT content,version FROM nova_mesa_drafts WHERE id=? FOR UPDATE",[documento.id]);
    if(!row)return {ok:false,error:documento.nome+" não encontrado."};
    if(row.version!==expectedVersion)return {ok:false,conflict:true,version:row.version};
    let importado:ReturnType<typeof importarMinuta>;
    try{importado=importarMinuta(candidate,validateDraft(row.content,documento),documento);}
    catch(error){return {ok:false,error:error instanceof Error?error.message:"Arquivo de importação inválido."};}
    if(!importado.draft.nodes.length)return {ok:false,error:"O arquivo não contém dispositivos."};
    const marco=JSON.stringify(validateDraft(row.content,documento));
    await all(`INSERT INTO nova_mesa_draft_versions (draft_id,version,content,author_id)
      VALUES (?,?,?::jsonb,?) ON CONFLICT (draft_id,version) DO NOTHING RETURNING id`,[documento.id,row.version,marco,user.id]);
    const nextVersion=row.version+1;
    await all("UPDATE nova_mesa_drafts SET content=?::jsonb, version=?, updated_by=?, updated_at=now() WHERE id=? RETURNING id",
      [JSON.stringify(importado.draft),nextVersion,user.id,documento.id]);
    const detalhe=JSON.stringify({
      versaoAnterior:row.version,
      formato:importado.formato,
      total:importado.estatisticas.total,
      apreciados:importado.estatisticas.apreciados,
      pontosRevisao:importado.estatisticas.pontosRevisao,
      novos:importado.diff.novos.length,
      removidos:importado.diff.removidos.length,
    });
    const acao=documento.id===ESTATUTO.id?"Importou minuta consolidada":"Importou "+documento.nome;
    await all("INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, detail) VALUES (?, ?, ?, ?, ?, ?)",
      [user.id,user.name,acao,"nova_mesa_draft",documento.id,detalhe]);
    return {ok:true,version:nextVersion};
  });
  if(resultado.ok)avisarAtualizacao(documento);
  return resultado;
}
