"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  canContain, changeText, Draft, DraftNode, findNode, insertAfter,
  labelFor, moveNode, newNode, NodeType, removeNode,
} from "@/lib/nova-mesa-poc/model";

const names: Record<NodeType,string> = {
  chapter:"Capítulo", article:"Artigo", paragraph:"Parágrafo",
  inciso:"Inciso", alinea:"Alínea", free:"Texto livre",
};
const initial:Draft={id:"experimento",nodes:[]};
type Location={id:string,parentId:string|null};
type Row={node:DraftNode,parentId:string|null,siblings:DraftNode[],articleNumber:number,chapterNumber:number,depth:number};
function flatten(draft:Draft):Row[]{
  const rows:Row[]=[];let articleNumber=0,chapterNumber=0;
  const visit=(siblings:DraftNode[],parentId:string|null,depth:number)=>{
    for(const node of siblings){
      if(node.type==="chapter")chapterNumber++;
      if(node.type==="article")articleNumber++;
      rows.push({node,parentId,siblings,articleNumber,chapterNumber,depth});
      visit(node.children,node.id,depth+1);
    }
  };
  visit(draft.nodes,null,0);return rows;
}
function bodyFrom(target:Node|null):HTMLElement|null{
  const element=target?.nodeType===Node.ELEMENT_NODE ? target as Element : target?.parentElement;
  return element?.closest<HTMLElement>("[data-body-id]")??null;
}
export default function ContinuousEditorLab(){
  const [draft,setDraft]=useState<Draft>(initial);
  const live=useRef<Draft>(draft);
  const [selected,setSelected]=useState<Location|null>(null);
  const selectedRef=useRef<Location|null>(null);
  const [notice,setNotice]=useState("");
  const [revision,setRevision]=useState(0);
  const [undo,setUndo]=useState<Draft[]>([]);
  const root=useRef<HTMLDivElement|null>(null);
  const pendingFocus=useRef<string|null>(null);
  const rows=flatten(draft);

  // A redação digitada é registrada no modelo sem recriar o DOM a cada tecla.
  // Somente operações estruturais remontam os elementos e reposicionam o cursor.
  const choose=(value:Location)=>{selectedRef.current=value;setSelected(value);};
  const commit=(next:Draft,focus?:string)=>{
    setUndo(history=>[...history.slice(-19),live.current]);
    live.current=next;pendingFocus.current=focus??null;setDraft(next);setRevision(n=>n+1);
    setNotice("");
  };
  useLayoutEffect(()=>{
    const id=pendingFocus.current; if(!id)return;
    pendingFocus.current=null;
    const body=Array.from(root.current?.querySelectorAll<HTMLElement>("[data-body-id]")??[])
      .find(element=>element.dataset.bodyId===id);
    body?.focus();
    if(body){const range=document.createRange();range.selectNodeContents(body);range.collapse(false);
      const selection=window.getSelection();selection?.removeAllRanges();selection?.addRange(range);}
  },[revision]);

  const add=(type:NodeType)=>{
    const current=selectedRef.current;
    const existing=current?findNode(live.current.nodes,current.id):undefined;
    const parentId=type==="chapter"?null:
      type==="free" ? (existing?.type==="chapter"||existing?.type==="article"? existing.id:current?.parentId??null):
      type==="article" ? (existing?.type==="chapter"?existing.id:current?.parentId??null):
      type==="paragraph"||type==="inciso" ? (existing?.type==="article"?existing.id:current?.parentId??null):
      existing?.type==="inciso"?existing.id:current?.parentId??null;
    const parent=parentId?findNode(live.current.nodes,parentId):undefined;
    if(!canContain(parent?.type??null,type)){setNotice("Selecione um artigo ou inciso compatível.");return;}
    const siblings=parent?parent.children:live.current.nodes;
    const afterId=current?.parentId===parentId ? current.id : siblings.at(-1)?.id??null;
    const node=newNode(type);
    try{
      const next=insertAfter(live.current,parentId,afterId,node);
      choose({id:node.id,parentId});commit(next,node.id);
    }catch(error){setNotice(error instanceof Error?error.message:"Não foi possível inserir.");}
  };
  const move=(direction:-1|1)=>{
    const current=selectedRef.current;if(!current)return;
    const parent=current.parentId?findNode(live.current.nodes,current.parentId):undefined;
    const siblings=parent?parent.children:live.current.nodes;
    const index=siblings.findIndex(node=>node.id===current.id);
    const target=index+direction;if(target<0||target>=siblings.length)return;
    const after=direction===-1?siblings[index-2]?.id??null:siblings[target].id;
    try{commit(moveNode(live.current,current.id,current.parentId,after),current.id);}
    catch(error){setNotice(error instanceof Error?error.message:"Movimento inválido.");}
  };
  const onInput=(event:React.FormEvent<HTMLDivElement>)=>{
    const body=bodyFrom(event.target as Node);
    const id=body?.dataset.bodyId;
    if(!id)return;
    live.current=changeText(live.current,id,body?.textContent??"");
    setNotice("Redação em memória (não salva no servidor).");
  };
  const onBeforeInput=(event:React.InputEvent<HTMLDivElement>)=>{
    const selection=window.getSelection();
    if(!selection||!selection.rangeCount)return;
    const range=selection.getRangeAt(0);
    const start=bodyFrom(range.startContainer),end=bodyFrom(range.endContainer);
    const editing=event.inputType.startsWith("delete")||event.inputType.startsWith("insert");
    if(editing&&(!start||!end||start!==end)){
      event.preventDefault();setNotice("Para modificar limites entre dispositivos, use os comandos estruturais.");return;
    }
    if(!event.inputType.startsWith("delete")||!range.collapsed||!start)return;
    const boundary=document.createRange();boundary.selectNodeContents(start);boundary.collapse(event.inputType.includes("Backward"));
    if(range.compareBoundaryPoints(Range.START_TO_START,boundary)===0){
      event.preventDefault();setNotice("O limite do dispositivo está protegido. Use os comandos estruturais.");
    }
  };
  const onPaste=(event:React.ClipboardEvent<HTMLDivElement>)=>{
    const selection=window.getSelection();if(!selection||!selection.rangeCount)return;
    const range=selection.getRangeAt(0);
    if(bodyFrom(range.startContainer)!==bodyFrom(range.endContainer)){
      event.preventDefault();setNotice("Cole o texto dentro de um único dispositivo ou bloco livre.");return;
    }
    // Colagem simples; o navegador não importa HTML nem estrutura normativa.
    event.preventDefault();
    const value=event.clipboardData.getData("text/plain");
    range.deleteContents();const text=document.createTextNode(value);range.insertNode(text);
    range.setStartAfter(text);range.collapse(true);selection.removeAllRanges();selection.addRange(range);
    const body=bodyFrom(text);const id=body?.dataset.bodyId;
    if(id)live.current=changeText(live.current,id,body?.textContent??"");
  };
  return <main className="mx-auto max-w-5xl p-5">
    <p className="mb-2 font-semibold text-amber-700">Laboratório isolado — conteúdo não persistente; não usar para o estatuto real.</p>
    <h1 className="mb-2 text-2xl font-bold">Nova Mesa · Editor documental experimental</h1>
    <p className="mb-4 text-sm text-muted-foreground">Área editável única: seleção e cópia entre dispositivos; alterações estruturais pelos comandos explícitos. Sem colaboração, servidor ou histórico permanente.</p>
    <div className="mb-3 flex flex-wrap gap-2">
      {(["chapter","article","paragraph","inciso","alinea","free"] as NodeType[]).map(type=>
        <button type="button" key={type} className="rounded border px-3 py-2 text-sm" onClick={()=>add(type)}>+ {names[type]}</button>)}
    </div>
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <button type="button" className="rounded border px-3 py-1" disabled={!selected} onClick={()=>move(-1)}>↑ Mover</button>
      <button type="button" className="rounded border px-3 py-1" disabled={!selected} onClick={()=>move(1)}>↓ Mover</button>
      <button type="button" className="rounded border px-3 py-1" disabled={!selected} onClick={()=>{
        const current=selectedRef.current;if(!current)return;commit(removeNode(live.current,current.id));selectedRef.current=null;setSelected(null);
      }}>Retirar</button>
      <button type="button" className="rounded border px-3 py-1" disabled={!undo.length} onClick={()=>{
        const prior=undo.at(-1);if(!prior)return;live.current=prior;setDraft(prior);setRevision(n=>n+1);
        setUndo(history=>history.slice(0,-1));selectedRef.current=null;setSelected(null);
      }}>Desfazer estrutura</button>
      <span className="text-sm">{selected?names[findNode(live.current.nodes,selected.id)?.type??"free"]+" selecionado":""}</span>
    </div>
    {notice&&<p role="status" className="mb-3 text-sm text-amber-700">{notice}</p>}
    <div ref={root} contentEditable suppressContentEditableWarning
      onInput={onInput} onBeforeInput={onBeforeInput} onPaste={onPaste}
      onFocus={event=>{const id=bodyFrom(event.target as Node)?.dataset.bodyId;
        const row=rows.find(entry=>entry.node.id===id);if(row)choose({id:row.node.id,parentId:row.parentId});}}
      onMouseUp={()=>{const selection=window.getSelection();const id=bodyFrom(selection?.anchorNode??null)?.dataset.bodyId;
        const row=rows.find(entry=>entry.node.id===id);if(row)choose({id:row.node.id,parentId:row.parentId});}}
      aria-label="Documento experimental editável" className="min-h-[450px] rounded-lg border bg-white p-6 text-zinc-900 shadow-sm outline-offset-2">
      <h2 contentEditable={false} className="mb-6 select-none text-center text-xl font-bold">NOVO ESTATUTO · MINUTA EXPERIMENTAL</h2>
      {rows.length===0&&<p contentEditable={false} className="text-sm text-zinc-500">Insira um capítulo ou artigo para começar.</p>}
      {rows.map(row=><div key={row.node.id} data-node-id={row.node.id}
        className={"my-3 rounded border-l-2 pl-3 "+(selected?.id===row.node.id?"border-blue-500":"border-transparent")}
        style={{marginLeft:Math.min(row.depth,4)*16}}>
        <span contentEditable={false} className="select-none font-semibold">{labelFor(row.node,row.siblings,row.articleNumber,row.chapterNumber)}</span>
        <span data-body-id={row.node.id} data-poc-body="true" className={"inline-block min-w-[55%] whitespace-pre-wrap align-top outline-offset-2 "+(row.node.type==="chapter"?"font-bold":"")}
          data-placeholder={row.node.type==="free"?"Texto livre reservado":"Redação pendente"}>{row.node.text}</span>
        {row.node.type==="free"&&<span contentEditable={false} className="ml-2 select-none text-xs text-amber-700">Provisório · reservado</span>}
      </div>)}
    </div>
    <p className="mt-3 text-xs text-muted-foreground">Prova de conceito não validada em navegadores: sem persistência, histórico de texto, edição rica, tratamento completo de seleção/IME ou proteção contra todas as mutações nativas. Não usar com dados reais.</p>
  </main>;
}
