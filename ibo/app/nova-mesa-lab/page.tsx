"use client";

import { useMemo, useRef, useState } from "react";
import { canContain, changeText, Draft, DraftNode, findNode, insertAfter, labelFor, moveNode, newNode, NodeType, removeNode } from "@/lib/nova-mesa-poc/model";

const names: Record<NodeType,string> = {chapter:"Capítulo",article:"Artigo",paragraph:"Parágrafo",inciso:"Inciso",alinea:"Alínea",free:"Texto livre"};
type Selection = {id:string;parentId:string|null};
const initial:Draft = {id:"experimental",nodes:[]};
export default function NovaMesaLab() {
  const [draft,setDraft]=useState<Draft>(initial);
  const [selected,setSelected]=useState<Selection|null>(null);
  const [undo,setUndo]=useState<Draft[]>([]);
  const [message,setMessage]=useState("");
  const refs=useRef<Record<string,HTMLTextAreaElement|null>>({});
  const snapshot=(next:Draft)=>{setUndo(history=>[...history.slice(-19),draft]);setDraft(next);};
  const articleCount=useMemo(()=> {
    const map=new Map<string,number>(); let n=0;
    const visit=(nodes:DraftNode[])=>{for(const node of nodes){if(node.type==="article") map.set(node.id,++n);visit(node.children);}};
    visit(draft.nodes);return map;
  },[draft]);
  const add=(type:NodeType)=>{
    const current=selected ? findNode(draft.nodes,selected.id) : undefined;
    const parentId=type==="chapter" ? null :
      type==="free" ? (current?.type==="article" || current?.type==="chapter" ? current.id : selected?.parentId ?? null) :
      type==="article" ? (current?.type==="chapter" ? current.id : selected?.parentId ?? null) :
      type==="paragraph" || type==="inciso" ? (current?.type==="article" ? current.id : selected?.parentId ?? null) :
      current?.type==="inciso" ? current.id : selected?.parentId ?? null;
    const parent=parentId?findNode(draft.nodes,parentId)??null:null;
    if(!canContain(parent?.type ?? null,type)){setMessage("Selecione um artigo ou inciso compatível antes de inserir esse dispositivo.");return;}
    const siblings=parent?parent.children:draft.nodes;
    const afterId=selected && selected.parentId===parentId ? selected.id : siblings.at(-1)?.id??null;
    const node=newNode(type);
    snapshot(insertAfter(draft,parentId,afterId,node));setSelected({id:node.id,parentId});setMessage("");
    requestAnimationFrame(()=>refs.current[node.id]?.focus());
  };
  const edit=(id:string,text:string)=>setDraft(current=>changeText(current,id,text));
  const selectedNode=selected?findNode(draft.nodes,selected.id):undefined;
  const drop=()=>{if(!selected)return;snapshot(removeNode(draft,selected.id));setSelected(null);};
  const move=(direction:-1|1)=>{
    if(!selected)return;
    const parent=selected.parentId?findNode(draft.nodes,selected.parentId):null;
    const peers=parent?parent.children:draft.nodes;
    const at=peers.findIndex(n=>n.id===selected.id), target=at+direction;
    if(target<0||target>=peers.length)return;
    const afterId=direction===-1 ? peers[at-2]?.id??null : peers[target].id;
    snapshot(moveNode(draft,selected.id,selected.parentId,afterId));
  };
  const chapterNumbers=useMemo(()=>{const map=new Map<string,number>();draft.nodes.filter(n=>n.type==="chapter").forEach((n,i)=>map.set(n.id,i+1));return map;},[draft]);
  const render=(nodes:DraftNode[],parentId:string|null,chapter:number):React.ReactNode=>nodes.map(node=>{
    const label=labelFor(node,nodes,articleCount.get(node.id)??0,chapterNumbers.get(node.id)??chapter);
    const active=selected?.id===node.id;
    return <div key={node.id} className={"my-3 rounded-md border-l-2 pl-3 "+(active?"border-blue-500":"border-transparent")} style={{marginLeft:node.type==="paragraph"||node.type==="inciso"?"1.2rem":node.type==="alinea"?"2.4rem":0}}>
      <div className="flex items-start gap-2" onClick={()=>setSelected({id:node.id,parentId})}>
        <span className="min-w-fit select-none pt-1 font-semibold">{label}</span>
        <textarea aria-label={names[node.type]} ref={el=>{refs.current[node.id]=el;}} rows={node.type==="chapter"?1:2} value={node.text} onFocus={()=>setSelected({id:node.id,parentId})} onChange={event=>edit(node.id,event.target.value)} placeholder={node.type==="free"?"Bloco livre (reservado)":node.type==="chapter"?"Título do capítulo":"Redação pendente"} className={"w-full resize-y rounded bg-transparent p-1 outline-offset-2 "+(node.type==="chapter"?"text-center font-bold":"")} />
      </div>
      {node.children.length>0 && <div>{render(node.children,node.id,chapterNumbers.get(node.id)??chapter)}</div>}
    </div>;
  });
  return <main className="mx-auto max-w-5xl p-5">
    <p className="mb-2 text-sm font-semibold text-amber-700">Laboratório experimental — dados apenas nesta página; não utilizar para redação real</p>
    <h1 className="mb-2 text-2xl font-bold">Nova Mesa · Prova de conceito</h1>
    <p className="mb-4 text-sm text-muted-foreground">Documento criado em branco, independente dos dispositivos históricos. Ainda sem persistência, colaboração ou restauração integral.</p>
    <div className="mb-3 flex flex-wrap gap-2">{(["chapter","article","paragraph","inciso","alinea","free"] as NodeType[]).map(type=><button type="button" key={type} className="rounded border px-3 py-2 text-sm" onClick={()=>add(type)}>+ {names[type]}</button>)}</div>
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <button className="rounded border px-3 py-1" disabled={!selectedNode} onClick={()=>move(-1)}>↑ Mover</button>
      <button className="rounded border px-3 py-1" disabled={!selectedNode} onClick={()=>move(1)}>↓ Mover</button>
      <button className="rounded border px-3 py-1" disabled={!selectedNode} onClick={drop}>Retirar</button>
      <button className="rounded border px-3 py-1" disabled={!undo.length} onClick={()=>{setDraft(undo[undo.length-1]);setUndo(h=>h.slice(0,-1));setSelected(null);}}>Desfazer estrutura</button>
      {selectedNode&&<span className="text-sm">Selecionado: {names[selectedNode.type]}</span>}
    </div>
    {message&&<p role="alert" className="mb-3 text-sm text-amber-700">{message}</p>}
    <section aria-label="Editor da minuta experimental" className="min-h-[440px] rounded-lg border bg-white p-6 text-zinc-900 shadow-sm">
      <h2 className="mb-6 text-center text-xl font-bold">NOVO ESTATUTO · MINUTA EXPERIMENTAL</h2>
      {draft.nodes.length?render(draft.nodes,null,0):<p className="text-center text-sm text-zinc-500">Comece inserindo um capítulo ou artigo.</p>}
    </section>
    <p className="mt-3 text-xs text-muted-foreground">Limitações deliberadas: campos por dispositivo ainda não são um editor documental contínuo; seleção entre dispositivos, colagem estruturada, persistência e segurança contra perda de dados não estão validadas. Esta tela é apenas uma bancada para testar o modelo e a numeração.</p>
  </main>;
}
