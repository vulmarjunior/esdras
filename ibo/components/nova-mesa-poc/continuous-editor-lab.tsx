"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {loadNovaMesaDraft,saveNovaMesaDraft,checkpointNovaMesaVersion,listNovaMesaVersions,readNovaMesaVersion,restoreNovaMesaVersion} from "@/app/actions/nova-mesa-draft";
import {
  canContain, Draft, DraftNode, findNode, formatSelection, insertAfter,
  labelFor, moveNode, newNode, NodeType, removeNode, setAlignment, setRichText,
} from "@/lib/nova-mesa-poc/model";

import { Alignment, Mark, TextRun, toRuns } from "@/lib/nova-mesa-poc/rich-text";
import WorkspaceShell from "./workspace-shell";

const names: Record<NodeType,string> = {
  chapter:"Capítulo", section:"Seção", subsection:"Subseção", article:"Artigo", paragraph:"Parágrafo",
  inciso:"Inciso", alinea:"Alínea", free:"Texto livre",
};
const initial:Draft={id:"estatuto-ibo-2026",nodes:[]};
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
function runsFromElement(body:HTMLElement):TextRun[]{
  const runs:TextRun[]=[];
  const visit=(node:Node,marks:Mark[])=>{
    if(node.nodeType===Node.TEXT_NODE){if(node.textContent)runs.push({text:node.textContent,marks});return;}
    if(node.nodeType!==Node.ELEMENT_NODE)return;
    const element=node as Element,tag=element.tagName.toLowerCase();
    const mark:Mark|undefined=tag==="strong"||tag==="b"?"bold":tag==="em"||tag==="i"?"italic":tag==="u"?"underline":undefined;
    const next=mark&&!marks.includes(mark)?[...marks,mark]:marks;
    if(tag==="br"){runs.push({text:"\n",marks:next});return;}
    for(const child of Array.from(element.childNodes))visit(child,next);
  };
  for(const child of Array.from(body.childNodes))visit(child,[]);
  return runs;
}
function renderRuns(body:HTMLElement,runs:TextRun[]){
  const fragment=document.createDocumentFragment();
  for(const run of runs){
    let child:Node=document.createTextNode(run.text);
    for(const mark of run.marks){
      const wrapper=document.createElement(mark==="bold"?"strong":mark==="italic"?"em":"u");
      wrapper.appendChild(child);child=wrapper;
    }
    fragment.appendChild(child);
  }
  body.replaceChildren(fragment);
}
export default function ContinuousEditorLab({canEdit}:{canEdit:boolean}){
  const [draft,setDraft]=useState<Draft>(initial);
  const live=useRef<Draft>(draft);
  const [selected,setSelected]=useState<Location|null>(null);
  const [hovered,setHovered]=useState<string|null>(null);
  const [insertOpen,setInsertOpen]=useState(false);
  const [transferOpen,setTransferOpen]=useState(false);
  const [targetChapter,setTargetChapter]=useState("");
  const [targetAfter,setTargetAfter]=useState("__end__");
  const insertMenuRef=useRef<HTMLDivElement|null>(null);
  const insertButtonRef=useRef<HTMLButtonElement|null>(null);
  const stickyBarRef=useRef<HTMLDivElement|null>(null);
  const [insertLeft,setInsertLeft]=useState(8);
  useEffect(()=>{
    if(!insertOpen)return;
    const closeOutside=(event:PointerEvent)=>{
      const target=event.target as Node;
      if(!insertMenuRef.current?.contains(target)&&!insertButtonRef.current?.contains(target))setInsertOpen(false);
    };
    const closeEscape=(event:KeyboardEvent)=>{if(event.key==="Escape"){setInsertOpen(false);insertButtonRef.current?.focus();}};
    document.addEventListener("pointerdown",closeOutside);
    document.addEventListener("keydown",closeEscape);
    return()=>{document.removeEventListener("pointerdown",closeOutside);document.removeEventListener("keydown",closeEscape);};
  },[insertOpen]);
  const selectedRef=useRef<Location|null>(null);
  const [notice,setNotice]=useState("");
  const [revision,setRevision]=useState(0);
  const [undo,setUndo]=useState<Draft[]>([]);
  const [savedLocal,setSavedLocal]=useState(false);
  const [loading,setLoading]=useState(true);
  const [loadingError,setLoadingError]=useState("");
  const [saving,setSaving]=useState(false);
  const [marking,setMarking]=useState(false);
  const markingRef=useRef(false);
  const [saveError,setSaveError]=useState("");
  const [conflict,setConflict]=useState(false);
  const [dirty,setDirty]=useState(false);
  const [version,setVersion]=useState(0);
  const [historyOpen,setHistoryOpen]=useState(false);
  const [historyLoading,setHistoryLoading]=useState(false);
  const [historyError,setHistoryError]=useState("");
  const [versions,setVersions]=useState<{version:number;author:string|null;createdAt:string}[]>([]);
  const [preview,setPreview]=useState<{version:number;draft:Draft}|null>(null);
  const versionRef=useRef(0);
  const editCount=useRef(0);
  const dirtyRef=useRef(false);
  const savingRef=useRef(false);
  const autoTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const saveRef=useRef<()=>Promise<boolean>>(async()=>false);
  const autoEnabled=useRef(false);
  const editable=canEdit&&!loading&&!loadingError&&!conflict&&!saving&&!marking;
  const markDirty=()=>{editCount.current++;dirtyRef.current=true;setDirty(true);setSaveError("");
    if(autoTimer.current)clearTimeout(autoTimer.current);
    if(autoEnabled.current)autoTimer.current=setTimeout(()=>{autoTimer.current=null;void saveRef.current();},2500);
  };
  const load=async()=>{
    if(dirtyRef.current)return;
    setLoading(true);setLoadingError("");
    try{
      const snapshot=await loadNovaMesaDraft();
      live.current=snapshot.draft;versionRef.current=snapshot.version;setVersion(snapshot.version);
      setDraft(snapshot.draft);setRevision(n=>n+1);setUndo([]);setSelected(null);selectedRef.current=null;
      dirtyRef.current=false;setDirty(false);setConflict(false);setSaveError("");
    }catch{setLoadingError("Falha ao carregar. Verifique se a migração isolada foi aplicada ao banco. Edição bloqueada para evitar perda de dados.");}
    finally{setLoading(false);}
  };
  useEffect(()=>{autoEnabled.current=true;void load();return()=>{autoEnabled.current=false;if(autoTimer.current)clearTimeout(autoTimer.current);};},[]);
  useEffect(()=>{
    const warn=(event:BeforeUnloadEvent)=>{if(dirtyRef.current){event.preventDefault();event.returnValue="";}};
    window.addEventListener("beforeunload",warn);
    return()=>window.removeEventListener("beforeunload",warn);
  },[]);
  const save=async():Promise<boolean>=>{
    if(!canEdit||loading||loadingError||conflict||savingRef.current||!dirtyRef.current)return false;
    savingRef.current=true;setSaving(true);setSaveError("");
    const snapshot=live.current,sequence=editCount.current;
    try{
      const result=await saveNovaMesaDraft(snapshot,versionRef.current);
      if(result.ok){
        versionRef.current=result.version;setVersion(result.version);
        if(sequence!==editCount.current&&autoEnabled.current){if(autoTimer.current)clearTimeout(autoTimer.current);autoTimer.current=setTimeout(()=>{autoTimer.current=null;void saveRef.current();},2500);}
        if(sequence===editCount.current){dirtyRef.current=false;setDirty(false);setNotice("Redação salva no servidor · revisão "+result.version+".");return true;}
        else setNotice("Uma versão foi salva, mas há alterações posteriores pendentes.");
      }else if("conflict" in result){
        setConflict(true);setSaveError("Conflito: outra sessão salvou alterações. Exporte uma cópia JSON antes de recarregar. Nenhum texto foi sobrescrito.");
      }else setSaveError(result.error);
    }catch{setSaveError("Falha ao salvar. Preserve uma cópia JSON e tente novamente.");}
    finally{savingRef.current=false;setSaving(false);}
    return false;
  };
  saveRef.current=save;
  const saveVersion=async()=>{
    if(!canEdit||loading||loadingError||conflict||savingRef.current||markingRef.current)return;
    markingRef.current=true;setMarking(true);setSaveError("");
    if(autoTimer.current){clearTimeout(autoTimer.current);autoTimer.current=null;}
    try{
      if(dirtyRef.current&&!await save()){
        setSaveError("Não foi possível registrar o marco. Confira o salvamento da redação e tente novamente.");
        return;
      }
      const result=await checkpointNovaMesaVersion(versionRef.current);
      if(result.ok){
        setNotice("Marco histórico registrado · revisão "+result.version+".");
        if(historyOpen)setVersions(await listNovaMesaVersions());
      }else if("conflict" in result){
        setConflict(true);setSaveError("Outra sessão alterou a minuta. O marco não foi criado; preserve sua cópia antes de recarregar.");
      }else setSaveError(result.error);
    }catch{setSaveError("Não foi possível registrar a versão. A redação salva permanece preservada.");}
    finally{markingRef.current=false;setMarking(false);}
  };
  const showHistory=async()=>{
    setHistoryOpen(true);setHistoryLoading(true);setHistoryError("");setPreview(null);
    try{setVersions(await listNovaMesaVersions());}
    catch{setHistoryError("Não foi possível carregar as versões do servidor.");}
    finally{setHistoryLoading(false);}
  };
  const showVersion=async(number:number)=>{
    setHistoryLoading(true);setHistoryError("");
    try{setPreview({version:number,draft:await readNovaMesaVersion(number)});}
    catch{setHistoryError("Não foi possível abrir esta versão.");}
    finally{setHistoryLoading(false);}
  };
  const restore=async()=>{
    if(!preview||!canEdit||dirtyRef.current||savingRef.current||loading||conflict)return;
    if(!window.confirm("Restaurar a versão "+preview.version+"? A redação atual será preservada no histórico e uma nova versão será criada."))return;
    setHistoryLoading(true);setHistoryError("");
    try{
      const result=await restoreNovaMesaVersion(preview.version,versionRef.current);
      if(result.ok){setHistoryOpen(false);setPreview(null);await load();setNotice("Versão restaurada como nova revisão "+result.version+".");}
      else if("conflict" in result){setConflict(true);setHistoryError("Outra sessão alterou a minuta. A restauração foi interrompida.");}
      else setHistoryError(result.error);
    }catch{setHistoryError("Falha na restauração. Nenhum texto local foi descartado.");}
    finally{setHistoryLoading(false);}
  };
  const root=useRef<HTMLDivElement|null>(null);
  const pendingFocus=useRef<string|null>(null);
  const rows=flatten(draft);

  // A redação digitada é registrada no modelo sem recriar o DOM a cada tecla.
  // Somente operações estruturais remontam os elementos e reposicionam o cursor.
  const choose=(value:Location)=>{selectedRef.current=value;setSelected(value);};
  const commit=(next:Draft,focus?:string)=>{
    setUndo(history=>[...history.slice(-19),live.current]);
    live.current=next;pendingFocus.current=focus??null;setDraft(next);setRevision(n=>n+1);setSavedLocal(false);
    markDirty();setNotice("");
  };
  useLayoutEffect(()=>{
    // React nunca reconcilia o texto interno das regiões contentEditable: o DOM
    // pertence ao navegador durante a digitação. Sincronizamos apenas em
    // operações estruturais, inclusive ao desfazer.
    for(const body of root.current?.querySelectorAll<HTMLElement>("[data-body-id]")??[]){
      const node=findNode(live.current.nodes,body.dataset.bodyId??"");
      if(node)renderRuns(body,node.runs??toRuns(node.text));
    }
    const id=pendingFocus.current; if(!id)return;
    pendingFocus.current=null;
    const body=Array.from(root.current?.querySelectorAll<HTMLElement>("[data-body-id]")??[])
      .find(element=>element.dataset.bodyId===id);
    body?.focus();
    if(body){const range=document.createRange();range.selectNodeContents(body);range.collapse(false);
      const selection=window.getSelection();selection?.removeAllRanges();selection?.addRange(range);}
  },[revision]);

  const add=(type:NodeType)=>{
    setInsertOpen(false);
    if(!editable)return;
    const current=selectedRef.current;
    const existing=current?findNode(live.current.nodes,current.id):undefined;
    const ancestry:DraftNode[]=[];
    let cursor=current?.parentId??null;
    while(cursor){const item=findNode(live.current.nodes,cursor);if(!item)break;ancestry.push(item);
      cursor=rows.find(row=>row.node.id===cursor)?.parentId??null;
    }
    const nearest=(types:NodeType[])=>[existing,...ancestry].find(node=>node&&types.includes(node.type))?.id??null;
    const parentId=type==="chapter"?null:
      type==="section"?nearest(["chapter"]):
      type==="subsection"?nearest(["section"]):
      type==="article"?nearest(["subsection","section","chapter"]):
      type==="paragraph"||type==="inciso"?nearest(["article"]):
      type==="alinea"?nearest(["inciso"]):
      existing&&["chapter","section","subsection","article"].includes(existing.type)?existing.id:current?.parentId??null;
    const parent=parentId?findNode(live.current.nodes,parentId):undefined;
    if(!canContain(parent?.type??null,type)){setNotice("Selecione o capítulo, seção, subseção, artigo ou inciso apropriado.");return;}
    const siblings=parent?parent.children:live.current.nodes;
    const afterId=current?.parentId===parentId ? current.id : siblings.at(-1)?.id??null;
    const node=newNode(type);
    try{
      const next=insertAfter(live.current,parentId,afterId,node);
      choose({id:node.id,parentId});commit(next,node.id);
    }catch(error){setNotice(error instanceof Error?error.message:"Não foi possível inserir.");}
  };
  const activeRow=selected?rows.find(row=>row.node.id===selected.id):undefined;
  const suggested:NodeType=activeRow?.node.type==="inciso"?"inciso":activeRow?.node.type==="alinea"?"alinea":activeRow?.node.type==="paragraph"?"paragraph":activeRow?.node.type==="article"?(activeRow.node.children.some(n=>n.type==="inciso")?"inciso":activeRow.node.children.some(n=>n.type==="paragraph")?"paragraph":"article"):activeRow?.node.type==="chapter"?"article":activeRow?.node.type==="section"?"article":activeRow?.node.type==="subsection"?"article":"chapter";
  const contextualTypes=([suggested,"article","paragraph","inciso","alinea","chapter","section","subsection","free"] as NodeType[]).filter((type,index,array)=>array.indexOf(type)===index);
  useEffect(()=>{
    const keydown=(event:KeyboardEvent)=>{
      if(event.defaultPrevented||event.repeat||event.isComposing||!event.ctrlKey||!event.altKey||event.shiftKey)return;
      const mapping:Record<string,NodeType>={a:"article",p:"paragraph",i:"inciso",l:"alinea"};
      const type=mapping[event.key.toLowerCase()];
      if(!type||!canEdit||loading||loadingError||conflict||savingRef.current)return;
      event.preventDefault();add(type);
    };
    window.addEventListener("keydown",keydown);return()=>window.removeEventListener("keydown",keydown);
  });
  const move=(direction:-1|1)=>{
    if(!editable)return;
    const current=selectedRef.current;if(!current)return;
    const parent=current.parentId?findNode(live.current.nodes,current.parentId):undefined;
    const siblings=parent?parent.children:live.current.nodes;
    const index=siblings.findIndex(node=>node.id===current.id);
    const target=index+direction;if(target<0||target>=siblings.length)return;
    const after=direction===-1?siblings[index-2]?.id??null:siblings[target].id;
    try{commit(moveNode(live.current,current.id,current.parentId,after),current.id);}
    catch(error){setNotice(error instanceof Error?error.message:"Movimento inválido.");}
  };
  const chapters=rows.filter(row=>row.node.type==="chapter");
  const movingArticle=activeRow?.node.type==="article"?activeRow:null;
  const destination=chapters.find(row=>row.node.id===targetChapter);
  const transferArticle=()=>{
    const current=selectedRef.current;
    const article=current?findNode(live.current.nodes,current.id):undefined;
    if(!editable||!current||article?.type!=="article"||!destination)return;
    const siblings=destination.node.children.filter(node=>node.id!==article.id);
    const afterId=targetAfter==="__end__"?siblings.at(-1)?.id??null:
      targetAfter==="__start__"?null:targetAfter;
    if(afterId!==null&&!siblings.some(node=>node.id===afterId)){setNotice("Posição inválida. Selecione novamente o local de destino.");return;}
    try{
      const next=moveNode(live.current,article.id,destination.node.id,afterId);
      choose({id:article.id,parentId:destination.node.id});
      commit(next,article.id);
      setTransferOpen(false);
      setNotice("Artigo transferido. Os dispositivos subordinados foram preservados; confira a nova numeração.");
    }catch(error){setNotice(error instanceof Error?error.message:"Não foi possível transferir o artigo.");}
  };
  const onInput=(event:React.FormEvent<HTMLSpanElement>)=>{
    if(!editable)return;
    const body=bodyFrom(event.target as Node);
    const id=body?.dataset.bodyId;
    if(!id||!body)return;
    live.current=setRichText(live.current,id,runsFromElement(body));
    setSavedLocal(false);markDirty();
  };
  const onBeforeInput=(event:InputEvent)=>{
    if(!editable){event.preventDefault();return;}
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
    if(!editable){event.preventDefault();return;}
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
    if(id&&body){live.current=setRichText(live.current,id,runsFromElement(body));setSavedLocal(false);markDirty();}
  };
  const format=(mark:Mark)=>{
    if(!editable)return;
    const selection=window.getSelection();
    if(!selection?.rangeCount||selection.isCollapsed){setNotice("Selecione o trecho que deseja formatar.");return;}
    const range=selection.getRangeAt(0),body=bodyFrom(range.startContainer);
    if(!body||body!==bodyFrom(range.endContainer)){setNotice("Formate somente dentro de um dispositivo.");return;}
    const id=body.dataset.bodyId;if(!id)return;
    const before=range.cloneRange();before.selectNodeContents(body);before.setEnd(range.startContainer,range.startOffset);
    const start=before.toString().length,end=start+range.toString().length;
    try{commit(formatSelection(live.current,id,start,end,mark),id);}
    catch(error){setNotice(error instanceof Error?error.message:"Seleção inválida.");}
  };
  const align=(alignment:Alignment)=>{
    if(!editable)return;
    const current=selectedRef.current;
    if(!current){setNotice("Selecione o dispositivo a ser alinhado.");return;}
    try{commit(setAlignment(live.current,current.id,alignment),current.id);}
    catch(error){setNotice(error instanceof Error?error.message:"Não foi possível alinhar.");}
  };
  const download=()=>{
    const blob=new Blob([JSON.stringify(live.current,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const anchor=document.createElement("a");anchor.href=url;anchor.download="esdras-minuta-copia.json";
    anchor.click();URL.revokeObjectURL(url);setSavedLocal(true);
    setNotice("Cópia JSON exportada. Não substitui salvamento no servidor.");
  };
  const outline=rows.filter(row=>["chapter","section","subsection","article"].includes(row.node.type)).map(row=>({
    id:row.node.id,label:labelFor(row.node,row.siblings,row.articleNumber,row.chapterNumber).trim(),
    title:row.node.text,depth:row.depth,
  }));
  const navigate=(id:string)=>{
    const row=rows.find(entry=>entry.node.id===id);if(!row)return;
    choose({id,parentId:row.parentId});
    Array.from(root.current?.querySelectorAll<HTMLElement>("[data-node-id]")??[])
      .find(element=>element.dataset.nodeId===id)?.scrollIntoView({behavior:"smooth",block:"center"});
  };
  return <WorkspaceShell outline={outline} onNavigate={navigate}
    selectedLabel={selected?names[findNode(live.current.nodes,selected.id)?.type??"free"]:null}>
    <main className="min-w-0">


    <div ref={stickyBarRef} className="sticky top-0 z-30 mb-2 md:top-12 flex flex-wrap items-center gap-2 rounded-lg border bg-background/95 px-3 py-2 text-sm shadow-md backdrop-blur">
      <span role="status">{loading?"Carregando minuta…":loadingError?"Carregamento indisponível":conflict?"Conflito de versões":saving?"Salvando…":marking?"Registrando marco histórico…":dirty?"Alterações pendentes · autosave em 2,5 s":"Minuta salva"}{!loading&&!loadingError?" · versão "+version:""}</span>
      <button type="button" disabled={!canEdit||loading||!!loadingError||conflict||saving||marking} className="rounded border border-primary/40 bg-primary/10 px-3 py-2 font-semibold text-foreground disabled:opacity-50" onClick={()=>{if(dirtyRef.current){if(autoTimer.current){clearTimeout(autoTimer.current);autoTimer.current=null;}void save();}else setNotice("Todas as alterações já estão salvas no servidor · versão "+versionRef.current+".");}}>{saving?"Salvando…":"Salvar agora"}</button>
      <button type="button" disabled={!canEdit||loading||!!loadingError||conflict||saving||marking} className="rounded border px-3 py-2 font-semibold disabled:opacity-50" onClick={()=>{void saveVersion();}}>{marking?"Registrando versão…":"Salvar versão"}</button>
      <button ref={insertButtonRef} type="button" disabled={!editable} aria-expanded={insertOpen} aria-controls="nova-mesa-insert-menu" className="rounded border border-blue-500 bg-blue-50 px-3 py-2 font-semibold text-blue-900 disabled:opacity-50" onClick={()=>{const bar=stickyBarRef.current?.getBoundingClientRect(),button=insertButtonRef.current?.getBoundingClientRect();if(bar&&button)setInsertLeft(Math.max(8,Math.min(button.left-bar.left,bar.width-360)));setInsertOpen(v=>!v);}}>+ Inserir dispositivo</button>
      <span className="rounded bg-muted px-2 py-1 font-medium">{activeRow?labelFor(activeRow.node,activeRow.siblings,activeRow.articleNumber,activeRow.chapterNumber).trim()+" · "+names[activeRow.node.type]+" ativo":"Nenhum dispositivo ativo"}</span>
      <button type="button" disabled={loading||dirty||saving||marking} className="rounded border px-3 py-2 disabled:opacity-50" onClick={()=>{void load();}}>Recarregar</button>
      <button type="button" disabled={loading||!!loadingError} className="rounded border px-3 py-2 disabled:opacity-50" onClick={()=>{void showHistory();}}>Histórico de versões</button>
      {loadingError&&<p role="alert" className="w-full text-red-700">{loadingError}</p>}
      <span className="text-xs text-muted-foreground">Autosave preserva o rascunho; «Salvar versão» cria um marco no histórico.</span>
      {saveError&&<p role="alert" className="w-full text-red-700">{saveError}</p>}
      {!canEdit&&<p className="w-full text-amber-700">Acesso somente leitura: seu perfil não pode alterar a nova minuta.</p>}
      <div className="w-full">
    <div role="toolbar" aria-label="Formatação do dispositivo ativo" className="flex flex-wrap items-center gap-1.5 border-t pt-2">
      {(["bold","italic","underline"] as Mark[]).map(mark=>
        <button type="button" key={mark} title={mark} disabled={!editable} onMouseDown={event=>event.preventDefault()} onClick={()=>format(mark)}
          className="rounded border px-2.5 py-1.5 text-sm">{mark==="bold"?<strong>B</strong>:mark==="italic"?<em>I</em>:<u>U</u>}</button>)}
      {(["left","center","right","justify"] as Alignment[]).map(alignment=>
        <button type="button" key={alignment} title={alignment} disabled={!editable} onMouseDown={event=>event.preventDefault()} onClick={()=>align(alignment)}
          className="rounded border px-3 py-2 text-sm">{alignment==="left"?"Esquerda":alignment==="center"?"Centro":alignment==="right"?"Direita":"Justificar"}</button>)}
      <div role="toolbar" aria-label="Organização dos dispositivos" className="flex flex-wrap items-center gap-1.5 border-t pt-2">
        <span className="mr-1 text-xs font-semibold text-muted-foreground">Organização</span>
      <button type="button" className="rounded border px-2.5 py-1.5 text-sm disabled:opacity-50" title="Mover o dispositivo ativo para cima" disabled={!editable||!selected} onMouseDown={event=>event.preventDefault()} onClick={()=>move(-1)}>↑ Mover</button>
      <button type="button" className="rounded border px-2.5 py-1.5 text-sm disabled:opacity-50" title="Mover o dispositivo ativo para baixo" disabled={!editable||!selected} onMouseDown={event=>event.preventDefault()} onClick={()=>move(1)}>↓ Mover</button>
      <button type="button" className="rounded border px-2.5 py-1.5 text-sm disabled:opacity-50" title="Transferir o artigo ativo para outro capítulo" disabled={!editable||!movingArticle||chapters.length===0} onMouseDown={event=>event.preventDefault()} onClick={()=>{if(!movingArticle)return;const initial=chapters.find(row=>row.node.id!==movingArticle.parentId)??chapters[0];setTargetChapter(initial.node.id);setTargetAfter("__end__");setTransferOpen(v=>!v);setInsertOpen(false);}}>Mover para capítulo…</button>
      <button type="button" className="rounded border px-2.5 py-1.5 text-sm disabled:opacity-50" title="Remover dispositivo ativo" disabled={!editable||!selected} onMouseDown={event=>event.preventDefault()} onClick={()=>{
        const current=selectedRef.current;if(!current)return;commit(removeNode(live.current,current.id));selectedRef.current=null;setSelected(null);
      }}>Retirar</button>
      <button type="button" className="rounded border px-2.5 py-1.5 text-sm disabled:opacity-50" title="Desfazer a última alteração estrutural" disabled={!editable||!undo.length} onMouseDown={event=>event.preventDefault()} onClick={()=>{
        const prior=undo.at(-1);if(!prior)return;live.current=prior;setDraft(prior);setRevision(n=>n+1);
        setUndo(history=>history.slice(0,-1));selectedRef.current=null;setSelected(null);markDirty();
      }}>Desfazer estrutura</button>
      </div>
    </div>
      </div>
      {transferOpen&&movingArticle&&<section className="absolute top-full right-2 z-50 mt-1 w-[min(420px,calc(100vw-32px))] space-y-3 rounded-lg border bg-background p-3 shadow-xl" aria-label="Transferir artigo para outro capítulo">
        <div className="flex items-center justify-between gap-2"><strong className="text-sm">Mover artigo para outro capítulo</strong><button type="button" className="rounded border px-2 py-1 text-xs" onClick={()=>setTransferOpen(false)}>Fechar</button></div>
        <p className="text-xs text-muted-foreground">O artigo e todos os seus parágrafos, incisos e alíneas serão movidos juntos.</p>
        <label className="block text-xs font-medium">Capítulo de destino
          <select className="mt-1 w-full rounded border bg-background p-2 text-sm" value={targetChapter} onChange={event=>{setTargetChapter(event.target.value);setTargetAfter("__end__");}}>
            {chapters.map(row=><option key={row.node.id} value={row.node.id}>{labelFor(row.node,row.siblings,row.articleNumber,row.chapterNumber)} — {row.node.text||"Sem título"}</option>)}
          </select>
        </label>
        <label className="block text-xs font-medium">Posição no capítulo
          <select className="mt-1 w-full rounded border bg-background p-2 text-sm" value={targetAfter} onChange={event=>setTargetAfter(event.target.value)}>
            <option value="__start__">No início do capítulo</option>
            <option value="__end__">Ao final do capítulo</option>
            {destination?.node.children.filter(node=>node.type==="article"&&node.id!==movingArticle.node.id).map(node=><option key={node.id} value={node.id}>Após o artigo: {node.text.slice(0,65)||"(sem redação)"}</option>)}
          </select>
        </label>
        <button type="button" className="rounded border border-blue-500 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-900 disabled:opacity-50" disabled={!editable||!destination||targetChapter===movingArticle.parentId&&targetAfter==="__end__"} onClick={transferArticle}>Confirmar transferência</button>
      </section>}
      {insertOpen&&<div id="nova-mesa-insert-menu" ref={insertMenuRef} style={{left:insertLeft}} className="absolute top-full z-50 mt-1 grid max-h-[min(65vh,450px)] w-[min(360px,calc(100vw-32px))] grid-cols-2 gap-1.5 overflow-y-auto rounded-lg border bg-background p-3 shadow-xl" role="group" aria-label="Inserir dispositivo"><span className="col-span-2 mb-1 text-xs text-muted-foreground">Sugestão: {names[suggested]}. Escolha o dispositivo para continuar a redação.</span>{contextualTypes.map(type=><button type="button" key={type} disabled={!editable} className={"rounded border px-2 py-2 text-left text-sm disabled:opacity-50 "+(type===suggested?"border-blue-500 bg-blue-50 font-semibold text-blue-900":"")} onClick={()=>add(type)}>+ {names[type]}{type===suggested?" · sugerido":""}</button>)}</div>}
    </div>

    {historyOpen&&<section aria-label="Histórico de versões da nova minuta" className="mb-4 min-w-0 rounded-lg border p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Histórico da minuta · Somente leitura</h2>
        <button type="button" className="rounded border px-3 py-1" onClick={()=>{setHistoryOpen(false);setPreview(null);}}>Fechar</button>
      </div>
      {historyError&&<p role="alert" className="mb-2 text-sm text-red-700">{historyError}</p>}
      {historyLoading&&<p role="status" className="text-sm">Carregando histórico…</p>}
      {!historyLoading&&versions.length===0&&<p className="text-sm text-muted-foreground">Nenhuma versão salva nesta minuta.</p>}
      <div className="mb-3 max-h-40 min-w-0 space-y-1 overflow-y-auto">
        {versions.map(item=><button type="button" key={item.version} disabled={historyLoading}
          className="block w-full rounded border px-3 py-2 text-left text-sm disabled:opacity-50"
          onClick={()=>{void showVersion(item.version);}}>Versão {item.version} · {new Date(item.createdAt).toLocaleString("pt-BR")} · {item.author??"Autor não identificado"}</button>)}
      </div>
      {preview&&<div className="min-w-0 rounded border p-3">
        <h3 className="mb-2 font-medium">Prévia da versão {preview.version} — não editável</h3>
        <div className="max-h-72 min-w-0 overflow-auto whitespace-pre-wrap break-words rounded bg-muted p-3 text-sm">
          {flatten(preview.draft).map(row=><p key={row.node.id} className="mb-2" style={{paddingLeft:Math.min(row.depth,4)*12}}>
            <strong>{labelFor(row.node,row.siblings,row.articleNumber,row.chapterNumber)}</strong>{row.node.text}
          </p>)}
        </div>
        <button type="button" className="mt-3 rounded border px-3 py-2 text-sm disabled:opacity-50"
          disabled={!canEdit||dirty||saving||marking||historyLoading||conflict}
          onClick={()=>{void restore();}}>Restaurar como nova versão</button>
        {(dirty||conflict)&&<p className="mt-2 text-xs text-amber-700">Para restaurar, resolva as alterações locais ou o conflito de versões. Exporte uma cópia JSON antes de descartar qualquer redação.</p>}
      </div>}
    </section>}

    <div className="mb-3 flex flex-wrap gap-2">
      {(["chapter","section","subsection","article","paragraph","inciso","alinea","free"] as NodeType[]).map(type=>
        <button type="button" key={type} disabled={!editable} className="rounded border px-3 py-2 text-sm" onClick={()=>add(type)}>+ {names[type]}</button>)}
    </div>
    <div className="mb-2 flex flex-wrap items-center gap-1.5">
      <button type="button" className="rounded border px-3 py-1" onClick={download}>Exportar cópia (JSON)</button>
      <span className="text-xs text-amber-700">{savedLocal?"Cópia JSON exportada; alterações posteriores requerem nova exportação.":dirty?"Alterações locais pendentes: salve antes de sair.":"Use Exportar JSON para criar uma cópia independente."}</span>


    </div>
    {notice&&<p role="status" className="mb-3 text-sm text-amber-700">{notice}</p>}
    <div ref={root}
      onFocus={event=>{const id=bodyFrom(event.target as Node)?.dataset.bodyId;
        const row=rows.find(entry=>entry.node.id===id);if(row)choose({id:row.node.id,parentId:row.parentId});}}
      onMouseUp={()=>{const selection=window.getSelection();const id=bodyFrom(selection?.anchorNode??null)?.dataset.bodyId;
        const row=rows.find(entry=>entry.node.id===id);if(row)choose({id:row.node.id,parentId:row.parentId});}}
      aria-label="Minuta do Estatuto editável" className="min-h-[70vh] min-w-0 overflow-x-auto rounded-xl border bg-white px-5 py-7 text-zinc-900 shadow-sm outline-offset-2 sm:px-10 sm:py-9 lg:px-12">
      <h2 contentEditable={false} className="mb-6 select-none text-center text-xl font-bold">NOVO ESTATUTO · MINUTA EM ELABORAÇÃO</h2>
      {rows.length===0&&<p contentEditable={false} className="text-sm text-zinc-500">Insira um capítulo ou artigo para começar.</p>}
      {rows.map(row=><div key={row.node.id} data-node-id={row.node.id} onMouseEnter={()=>setHovered(row.node.id)} onMouseLeave={()=>setHovered(current=>current===row.node.id?null:current)}
        className={"group relative my-3 rounded-md border-l-4 py-2 pl-3 pr-1 transition-colors "+(selected?.id===row.node.id?"border-blue-600 bg-blue-50/70 ring-1 ring-blue-200":hovered===row.node.id?"border-slate-300 bg-slate-50":"border-transparent")}
        style={{marginLeft:Math.min(row.depth,4)*16}}>
        {selected?.id===row.node.id&&<div contentEditable={false} className="mb-1 flex flex-wrap items-center gap-2 text-xs text-blue-800"><strong>{names[row.node.type]} ativo</strong><button type="button" disabled={!editable} className="rounded border border-blue-400 bg-white px-2 py-1 font-semibold disabled:opacity-50" onMouseDown={event=>event.preventDefault()} onClick={()=>{setInsertOpen(v=>!v);}}>+ Inserir após / dentro</button><button type="button" disabled={!editable} className="rounded border bg-white px-2 py-1 disabled:opacity-50" onMouseDown={event=>event.preventDefault()} onClick={()=>add(suggested)}>+ {names[suggested]} sugerido</button></div>}
        <span contentEditable={false} className="select-none font-semibold">{labelFor(row.node,row.siblings,row.articleNumber,row.chapterNumber)}</span>
        <span contentEditable={editable} suppressContentEditableWarning onInput={onInput} onBeforeInput={event=>onBeforeInput(event.nativeEvent as InputEvent)} onPaste={onPaste} data-body-id={row.node.id} data-poc-body="true" className={"inline-block min-w-[55%] whitespace-pre-wrap align-top outline-offset-2 "+(["chapter","section","subsection"].includes(row.node.type)?"font-bold":"")}
          style={{textAlign:row.node.alignment??(["chapter","section","subsection"].includes(row.node.type)?"center":"justify")}} data-placeholder={row.node.type==="free"?"Texto livre reservado":"Redação pendente"}></span>
        {row.node.type==="free"&&<span contentEditable={false} className="ml-2 select-none text-xs text-amber-700">Provisório · reservado</span>}
      </div>)}
    </div>
    <p className="mt-3 text-xs text-muted-foreground">Editor de minuta em elaboração: edite um dispositivo por vez, confira o indicador de salvamento antes de sair e confira as alterações após reorganizações.</p>
  </main></WorkspaceShell>;
}
