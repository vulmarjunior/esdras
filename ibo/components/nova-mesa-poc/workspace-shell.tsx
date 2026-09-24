"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type OutlineEntry = { id:string; label:string; title:string; depth:number };
type Reference = { name:string; kind:"text"|"pdf"; text?:string; url?:string };

export default function WorkspaceShell({children,outline,onNavigate,selectedLabel}:{
  children:ReactNode; outline:OutlineEntry[]; onNavigate:(id:string)=>void;selectedLabel:string|null;
}){
  const [outlineOpen,setOutlineOpen]=useState(true);
  const [supportOpen,setSupportOpen]=useState(true);
  const [consultOpen,setConsultOpen]=useState(false);
  const [reference,setReference]=useState<Reference|null>(null);
  const [query,setQuery]=useState("");
  const [sideBySide,setSideBySide]=useState(false);
  const fileRef=useRef<HTMLInputElement>(null);
  const dialogRef=useRef<HTMLDialogElement>(null);
  const previousFocus=useRef<HTMLElement|null>(null);
  useEffect(()=>()=>{if(reference?.url)URL.revokeObjectURL(reference.url);},[reference?.url]);
  useEffect(()=>{if(!consultOpen)return;previousFocus.current=document.activeElement as HTMLElement|null;dialogRef.current?.showModal();
    return()=>{dialogRef.current?.close();previousFocus.current?.focus();};
  },[consultOpen]);
  const openFile=async(file:File|undefined)=>{
    if(!file)return;
    const pdf=file.type==="application/pdf"||file.name.toLowerCase().endsWith(".pdf");
    if(!pdf&&!/\.(txt|md)$/i.test(file.name)){return;}
    const item:Reference=pdf?{name:file.name,kind:"pdf",url:URL.createObjectURL(file)}
      :{name:file.name,kind:"text",text:await file.text()};
    setReference(item);setConsultOpen(true);
  };
  const reader=reference?<section aria-label={"Leitura de "+reference.name} className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border bg-background">
    <div className="flex shrink-0 items-center justify-between gap-2 border-b p-3">
      <h3 className="min-w-0 truncate text-sm font-semibold" title={reference.name}>{reference.name}</h3>
      <button type="button" className="shrink-0 rounded border px-2 py-1 text-xs" onClick={()=>{setConsultOpen(false);setSideBySide(false);}}>Fechar</button>
    </div>
    {reference.kind==="pdf"?<iframe title={"Documento "+reference.name} src={reference.url} className="min-h-0 w-full flex-1"/>:
      <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words p-5 font-serif text-base leading-relaxed">{reference.text}</pre>}
  </section>:null;
  return <div className="mx-auto w-full max-w-[1800px] min-w-0 px-3 py-4 lg:px-6">
    <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0"><h1 className="text-xl font-semibold">Mesa de Trabalho · Laboratório</h1>
        <p className="text-sm text-muted-foreground">Nova minuta independente · Nenhum conteúdo é salvo no servidor</p></div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="rounded border px-3 py-2 text-sm" aria-expanded={outlineOpen} onClick={()=>setOutlineOpen(v=>!v)}>{outlineOpen?"Ocultar sumário":"Mostrar sumário"}</button>
        <button type="button" className="rounded border px-3 py-2 text-sm" aria-expanded={supportOpen} onClick={()=>setSupportOpen(v=>!v)}>{supportOpen?"Ocultar apoio":"Mostrar apoio"}</button>
        <button type="button" className="rounded border px-3 py-2 text-sm" onClick={()=>fileRef.current?.click()}>Consultar documento</button>
        <input ref={fileRef} type="file" accept=".txt,.md,.pdf,text/plain,application/pdf" className="hidden" aria-label="Selecionar documento local de consulta"
          onChange={event=>{void openFile(event.target.files?.[0]);event.target.value="";}}/>
      </div>
    </header>
    <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-start">
      {outlineOpen&&<nav aria-label="Sumário da minuta" className="min-w-0 rounded-xl border p-3 xl:sticky xl:top-4 xl:w-56 xl:shrink-0">
        <h2 className="mb-2 font-semibold">Estrutura</h2>
        <div className="max-h-[60vh] overflow-auto xl:max-h-[75vh]">
          {outline.length===0?<p className="text-sm text-muted-foreground">Insira um capítulo ou artigo para começar.</p>:
          outline.map(item=><button type="button" key={item.id} onClick={()=>onNavigate(item.id)}
            className="block w-full truncate rounded px-2 py-1.5 text-left text-sm hover:bg-muted focus-visible:outline-2"
            style={{paddingLeft:8+Math.min(item.depth,3)*10}} title={item.label+" "+item.title}>
            <span className="font-medium">{item.label}</span> {item.title}</button>)}
        </div>
      </nav>}
      <div className="min-w-0 flex-1">{children}</div>
      {supportOpen&&<aside aria-label="Painel de apoio" className="min-w-0 rounded-xl border p-3 xl:sticky xl:top-4 xl:w-64 xl:shrink-0">
        <h2 className="mb-3 font-semibold">Painel de apoio</h2>
        <section className="min-w-0 space-y-2 border-b pb-4">
          <h3 className="text-sm font-medium">Dispositivo em foco</h3>
          <p className="break-words text-sm text-muted-foreground">{selectedLabel??"Selecione um dispositivo no documento."}</p>
          <p className="break-words text-xs text-muted-foreground">Comentários, alternativas e histórico: integração futura. Nenhum dado é exibido artificialmente neste laboratório.</p>
        </section>
        <section className="min-w-0 space-y-2 pt-4">
          <h3 className="text-sm font-medium">Documentos de consulta</h3>
          <p className="break-words text-xs leading-relaxed text-muted-foreground">Abra um arquivo local TXT, MD ou PDF para leitura. Estatuto vigente e proposta anterior ainda não estão conectados à biblioteca do Esdras.</p>
          <button type="button" className="w-full rounded border px-3 py-2 text-sm" onClick={()=>fileRef.current?.click()}>Abrir arquivo para leitura</button>
          {reference&&<><button type="button" className="w-full min-w-0 truncate rounded border px-3 py-2 text-sm" title={reference.name}
            onClick={()=>setConsultOpen(true)}>{reference.name} · Leitura ampla</button>
            <button type="button" className="w-full rounded border px-3 py-2 text-sm" onClick={()=>{setSideBySide(true);setConsultOpen(false);}}>Consultar ao lado</button></>}
        </section>
      </aside>}
    </div>
    {sideBySide&&reader&&<div className="fixed inset-x-2 bottom-2 top-[12%] z-40 min-w-0 rounded-xl border bg-background p-2 shadow-2xl md:inset-x-auto md:right-3 md:w-[min(48vw,720px)]" role="region" aria-label="Consulta ao lado">{reader}</div>}
    {consultOpen&&<dialog ref={dialogRef} onClose={()=>setConsultOpen(false)} aria-label="Leitura ampliada de documento de consulta"
      className="fixed inset-0 m-auto h-[min(92vh,980px)] w-[min(94vw,1150px)] max-w-none overflow-hidden rounded-xl border bg-background p-3 text-foreground shadow-2xl backdrop:bg-black/60">
      <div className="flex h-full min-h-0 flex-col gap-2">
        <div className="flex shrink-0 items-center justify-between gap-2"><h2 className="font-semibold">Documento de consulta · Somente leitura</h2>
          <button type="button" className="rounded border px-3 py-1.5" onClick={()=>setConsultOpen(false)}>Fechar janela</button></div>
        {reference?.kind==="text"&&<input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Localizar trecho no texto" aria-label="Localizar no documento" className="w-full rounded border px-3 py-2 text-sm"/>}
        <div className="min-h-0 flex-1">{reference?.kind==="text"&&query? <pre className="h-full overflow-auto whitespace-pre-wrap break-words rounded border p-5 font-serif">{reference.text?.split("\n").filter(line=>line.toLocaleLowerCase().includes(query.toLocaleLowerCase())).join("\n")||"Nenhum trecho encontrado."}</pre>:reader}</div>
      </div>
    </dialog>}
  </div>;
}
