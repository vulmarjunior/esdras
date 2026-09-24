"use server";

import {all,get,transaction} from "@/lib/db";
import {requireRole,requireUser} from "@/lib/auth";
import {validateDraft} from "@/lib/nova-mesa-poc/validate";
import type {Draft} from "@/lib/nova-mesa-poc/model";

const DRAFT_ID="estatuto-ibo-2026";
type Row={content:Draft;version:number;updated_at:string};
export type DraftSnapshot={draft:Draft;version:number;updatedAt:string|null};
export type DraftSaveResult={ok:true;version:number}|{ok:false;conflict:true;version:number}|{ok:false;error:string};

/** Lê apenas a nova minuta, não os dados vigentes nem a proposta histórica. */
export async function loadNovaMesaDraft():Promise<DraftSnapshot>{
  await requireUser();
  const row=await get<Row>("SELECT content,version,updated_at FROM nova_mesa_drafts WHERE id = ?",[DRAFT_ID]);
  if(!row)return {draft:{id:DRAFT_ID,nodes:[]},version:0,updatedAt:null};
  return {draft:validateDraft(row.content),version:row.version,updatedAt:row.updated_at};
}

/** Grava atomicamente a árvore completa. Conflito impede qualquer sobrescrita silenciosa. */
export async function saveNovaMesaDraft(candidate:unknown,expectedVersion:number):Promise<DraftSaveResult>{
  const user=await requireRole("admin","coordenador");
  if(!Number.isSafeInteger(expectedVersion)||expectedVersion<0)return {ok:false,error:"Versão esperada inválida."};
  let draft:Draft;
  try{draft=validateDraft(candidate);}catch(error){return {ok:false,error:error instanceof Error?error.message:"Minuta inválida."};}
  return transaction(async():Promise<DraftSaveResult>=>{
    if(expectedVersion===0){
      const inserted=await all<{version:number}>(`INSERT INTO nova_mesa_drafts (id,content,version,updated_by)
        VALUES (?,?::jsonb,1,?) ON CONFLICT (id) DO NOTHING RETURNING version`,
        [DRAFT_ID,JSON.stringify(draft),user.id]);
      if(inserted.length){
        await all("INSERT INTO nova_mesa_draft_versions (draft_id,version,content,author_id) VALUES (?,1,?::jsonb,?) RETURNING id",
          [DRAFT_ID,JSON.stringify(draft),user.id]);
        return {ok:true,version:1};
      }
    }else{
      const updated=await all<{version:number}>(`UPDATE nova_mesa_drafts
        SET content = ?::jsonb, version = version + 1, updated_by = ?, updated_at = now()
        WHERE id = ? AND version = ? RETURNING version`,
        [JSON.stringify(draft),user.id,DRAFT_ID,expectedVersion]);
      if(updated.length){
        await all("INSERT INTO nova_mesa_draft_versions (draft_id,version,content,author_id) VALUES (?,?,?::jsonb,?) RETURNING id",
          [DRAFT_ID,updated[0].version,JSON.stringify(draft),user.id]);
        return {ok:true,version:updated[0].version};
      }
    }
    const current=await get<{version:number}>("SELECT version FROM nova_mesa_drafts WHERE id = ?",[DRAFT_ID]);
    return {ok:false,conflict:true,version:current?.version??0};
  });
}

/** Histórico imutável, lido sob sessão; restauração exigirá uma nova revisão explícita. */
export async function listNovaMesaVersions():Promise<{version:number;author:string|null;createdAt:string}[]>{
  await requireUser();
  const rows=await all<{version:number;author:string|null;created_at:string}>(`
    SELECT v.version,u.name AS author,v.created_at FROM nova_mesa_draft_versions v
    LEFT JOIN users u ON u.id=v.author_id WHERE v.draft_id=? ORDER BY v.version DESC LIMIT 100`,[DRAFT_ID]);
  return rows.map(row=>({version:row.version,author:row.author,createdAt:row.created_at}));
}
