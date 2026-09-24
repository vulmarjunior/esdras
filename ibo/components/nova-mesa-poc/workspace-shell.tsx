"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { listConsultationDocuments, readConsultationDocument, type ConsultationItem } from "@/app/actions/nova-mesa-consulta";
import { ConsultaForm } from "@/components/documentos/consulta-form";

type OutlineEntry = { id:string; label:string; title:string; depth:number };
type Reference = { name:string; kind:"text"|"pdf"; text?:string; url?:string };

export default function WorkspaceShell({children,outline,onNavigate,selectedLabel}:{
  children:ReactNode; outline:OutlineEntry[]; onNavigate:(id:string)=>void;selectedLabel:string|null;
}){
  const [outlineOpen,setOutlineOpen]=useState(true);
  const [supportOpen,setSupportOpen]=useState(true);
  const [consultOpen,setConsultOpen]=useState(false);
  const [aiOpen,setAiOpen]=useState(false);
  const [reference,setReference]=useState<Reference|null>(null);
  const [query,setQuery]=useState("");
  const [sideBySide,setSideBySide]=useState(false);
  const [catalog,setCatalog]=useState<ConsultationItem[]|null>(null);
  const [catalogLoading,setCatalogLoading]=useState(false);
  const [catalogError,setCatalogError]=useState("");
  const [openingId,setOpeningId]=useState<string|null>(null);
  const fileRef=useRef<HTMLInputElement>(null);
  const dialogRef=useRef<HTMLDialogElement>(null);
  const aiDialogRef=useRef<HTMLDialogElement>(null);
  const previousFocus=useRef<HTMLElement|null>(null);
  useEffect(()=>()=>{if(reference?.url)URL.revokeObjectURL(reference.url);},[reference?.url]);
  useEffect(()=>{if(!consultOpen)return;previousFocus.current=document.activeElement as HTMLElement|null;dialogRef.current?.showModal();
    return()=>{dialogRef.current?.close();previousFocus.current?.focus();};
  },[consultOpen]);
  useEffect(()=>{if(!aiOpen)return;aiDialogRef.current?.showModal();return()=>aiDialogRef.current?.close();},[aiOpen]);
  const loadCatalog=async()=>{
    setCatalogLoading(true);setCatalogError("");
    try{setCatalog(await listConsultationDocuments());}
    catch{setCatalogError("Não foi possível acessar a biblioteca do Esdras. Entre na sua conta e tente novamente.");}
    finally{setCatalogLoading(false);}
  };
  const openRegistered=async(item:ConsultationItem)=>{
    setOpeningId(item.id);setCatalogError("");
    try{
      const result=await readConsultationDocument(item.id);
      setReference({name:result.title,kind:"text",text:result.text});
      setSideBySide(false);setQuery("");setConsultOpen(true);
    }catch{setCatalogError("Não foi possível abrir este documento. Verifique sua sessão e tente novamente.");}
    finally{setOpeningId(null);}
  };
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
        <p className="text-sm text-muted-foreground">Nova minuta independente · Salvamento manual experimental, sujeito à disponibilidade do banco</p></div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="rounded border px-3 py-2 text-sm" aria-expanded={outlineOpen} onClick={()=>setOutlineOpen(v=>!v)}>{outlineOpen?"Ocultar sumário":"Mostrar sumário"}</button>
        <button type="button" className="rounded border px-3 py-2 text-sm" aria-expanded={supportOpen} onClick={()=>setSupportOpen(v=>!v)}>{supportOpen?"Ocultar apoio":"Mostrar apoio"}</button>
        <button type="button" className="rounded border px-3 py-2 text-sm" onClick={()=>fileRef.current?.click()}>Consultar documento</button>
        <button type="button" className="rounded border px-3 py-2 text-sm" onClick={()=>{setConsultOpen(false);setAiOpen(true);}}>Consultar com IA · Groq</button>
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
      <div className={sideBySide?"flex min-w-0 flex-1 flex-col gap-3 2xl:flex-row":"min-w-0 flex-1"}>
        <div className="min-w-0 flex-1">{children}</div>
        {sideBySide&&reader&&<div className="h-[75vh] min-w-0 overflow-hidden 2xl:sticky 2xl:top-4 2xl:w-[min(42vw,670px)] 2xl:shrink-0" role="region" aria-label="Consulta ao lado">{reader}</div>}
      </div>
      {supportOpen&&!sideBySide&&<aside aria-label="Painel de apoio" className="min-w-0 rounded-xl border p-3 xl:sticky xl:top-4 xl:w-64 xl:shrink-0">
        <h2 className="mb-3 font-semibold">Painel de apoio</h2>
        <section className="min-w-0 space-y-2 border-b pb-4">
          <h3 className="text-sm font-medium">Dispositivo em foco</h3>
          <p className="break-words text-sm text-muted-foreground">{selectedLabel??"Selecione um dispositivo no documento."}</p>
          <p className="break-words text-xs text-muted-foreground">Comentários, alternativas e histórico: integração futura. Nenhum dado é exibido artificialmente neste laboratório.</p>
        </section>
        <section className="min-w-0 space-y-2 pt-4">
          <h3 className="text-sm font-medium">Documentos de consulta</h3>
          <button type="button" className="w-full rounded border px-3 py-2 text-sm" onClick={()=>{setConsultOpen(false);setAiOpen(true);}}>Perguntar à IA · Groq</button>
          <button type="button" disabled={catalogLoading} className="w-full rounded border px-3 py-2 text-sm disabled:opacity-60"
            onClick={()=>{void loadCatalog();}}>{catalogLoading?"Carregando biblioteca…":"Documentos do Esdras"}</button>
          {catalogError&&<p role="alert" className="break-words text-xs text-red-700">{catalogError}</p>}
          {catalog&&<div className="max-h-72 min-w-0 space-y-1 overflow-y-auto rounded border p-1" aria-label="Documentos disponíveis no Esdras">
            {catalog.map(item=><button type="button" key={item.id} disabled={openingId!==null}
              className="block w-full min-w-0 rounded px-2 py-2 text-left text-xs hover:bg-muted disabled:opacity-60"
              onClick={()=>{void openRegistered(item);}}>
              <span className="block break-words font-medium">{openingId===item.id?"Abrindo…":item.title}</span>
              <span className="text-muted-foreground">{item.group}</span>
            </button>)}
          </div>}
          <p className="break-words text-xs leading-relaxed text-muted-foreground">Abra documentos já cadastrados no Esdras ou selecione um arquivo local TXT, MD ou PDF. A consulta é somente leitura.</p>
          <button type="button" className="w-full rounded border px-3 py-2 text-sm" onClick={()=>fileRef.current?.click()}>Abrir arquivo para leitura</button>
          {reference&&<><button type="button" className="w-full min-w-0 truncate rounded border px-3 py-2 text-sm" title={reference.name}
            onClick={()=>setConsultOpen(true)}>{reference.name} · Leitura ampla</button>
            <button type="button" className="w-full rounded border px-3 py-2 text-sm" onClick={()=>{setSideBySide(true);setConsultOpen(false);}}>Consultar ao lado</button></>}
        </section>
      </aside>}
    </div>
    {aiOpen&&<dialog ref={aiDialogRef} onClose={()=>setAiOpen(false)} aria-label="Consulta doutrinária com IA Groq"
      className="fixed inset-0 m-auto h-[min(92vh,960px)] w-[min(94vw,1050px)] max-w-none overflow-y-auto rounded-xl border bg-background p-3 text-foreground shadow-2xl backdrop:bg-black/60">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Consulta com IA · Groq</h2>
        <button type="button" className="rounded border px-3 py-2 text-sm" onClick={()=>setAiOpen(false)}>Fechar</button>
      </div>
      <p className="mb-3 text-sm text-muted-foreground">Consulta à biblioteca doutrinária e de literatura já utilizada pelo Esdras. A fonte é escolhida abaixo. Esta ferramenta não consulta automaticamente o arquivo local, o estatuto aberto ou a seleção do editor; confira as citações diretamente nos documentos originais.</p>
      <ConsultaForm titulo="Perguntar aos documentos de fé e à biblioteca" fontePadrao="documentos" comFonte
        placeholder="Ex.: o que os documentos de fé dizem sobre a membresia e a disciplina eclesiástica?"/>
    </dialog>}
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
