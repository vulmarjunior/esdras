"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeftRight,
  BookOpenText,
  ChevronRight,
  FilePenLine,
  GripVertical,
  ListTree,
  Loader2,
  MessageSquareText,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Search,
  StickyNote,
  Users,
} from "lucide-react";
import { moveProposalProvision } from "@/app/actions/provision";
import { cn } from "@/lib/utils";
import { normalizarNumero } from "@/lib/numeracao";
import { PROVISION_TYPE_LABELS } from "@/lib/labels";
import { simulateArticleMove } from "@/lib/workbench-move";
import type { Comment, PendingIssue, Suggestion } from "@/lib/types";
import { RichTextContent } from "@/components/rich-text-content";
import { NovoBadge, StatusBadge, StatusDot } from "@/components/status-badge";
import { NewProvisionForm, StatusControl } from "@/components/provision/provision-forms";
import { JustificativaEditor } from "@/components/provision/justificativa-editor";
import { PersonalNoteForm } from "@/components/provision/personal-note-form";
import { SuggestionForm } from "@/components/provision/suggestion-forms";
import { CommentForm, CommentList } from "@/components/provision/comment-forms";
import { PendingForm, PendingItem } from "@/components/provision/pending-forms";
import { ApprovalControl } from "@/components/workbench/approval-control";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const WorkingTextEditor = dynamic(
  () => import("@/components/provision/working-text-editor").then((module) => module.WorkingTextEditor),
  { loading: () => <p className="text-sm text-muted-foreground">Carregando editor…</p> },
);

export interface WorkbenchNode {
  id: string;
  parentId: string | null;
  type: string;
  numero: string | null;
  numeroVigente: string | null;
  numeroSugerido: string | null;
  titulo: string | null;
  origem: string;
  alteracaoTipo: string;
  status: string;
  textoVigente: string;
  propostaInicial: string;
  redacaoTrabalho: string;
  redacaoConsolidada: string;
  justificativa: string;
  version: number;
  updatedAt: string;
  hasNote: boolean;
  hasPending: boolean;
  personalNote: string;
  suggestions: Suggestion[];
  comments: Comment[];
  pendings: PendingIssue[];
  suggestionCount: number;
  commentCount: number;
  childCount: number;
  children: WorkbenchNode[];
}

interface FlatNode extends WorkbenchNode {
  depth: number;
}

function label(node: Pick<WorkbenchNode, "type" | "numero" | "id">): string {
  const numeroArtigo = node.numero && /^\d+$/.test(node.numero)
    ? Number(node.numero) < 10 ? `${node.numero}º` : node.numero
    : node.numero;
  if (node.type === "capitulo") return node.numero ? `Capítulo ${node.numero}` : "Novo capítulo";
  if (node.type === "secao") return node.numero ? `Seção ${node.numero}` : "Nova seção";
  if (node.type === "artigo") return numeroArtigo ? `Art. ${numeroArtigo}` : "Novo artigo";
  if (node.type === "paragrafo") {
    if (!node.numero) return "Novo parágrafo";
    if (node.numero.toLocaleLowerCase("pt-BR") === "único") return "Parágrafo único";
    return `§ ${node.numero}`;
  }
  if (node.type === "alinea") return node.numero ? node.numero.replace(/\)?$/, ")") : "Nova alínea";
  return node.numero || PROVISION_TYPE_LABELS[node.type] || node.id;
}

function flatten(nodes: WorkbenchNode[], depth = 0): FlatNode[] {
  return nodes.flatMap((node) => [
    { ...node, depth },
    ...flatten(node.children, depth + 1),
  ]);
}

function findNode(nodes: WorkbenchNode[], id: string): WorkbenchNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNode(node.children, id);
    if (found) return found;
  }
  return undefined;
}

function descendantIds(node: WorkbenchNode): Set<string> {
  return new Set(flatten(node.children).map((child) => child.id));
}

function destinationLabel(node: WorkbenchNode): string {
  const former = node.numeroVigente && normalizarNumero(node.numeroVigente) !== normalizarNumero(node.numero)
    ? ` · vigente ${node.numeroVigente}`
    : "";
  return `${label(node)}${node.titulo ? ` — ${node.titulo}` : ""}${former}`;
}

function currentText(node: WorkbenchNode): string {
  if (node.status === "aprovado" && node.redacaoConsolidada.trim()) return node.redacaoConsolidada;
  return node.redacaoTrabalho || node.propostaInicial || node.textoVigente || "";
}

function allowedChildren(type: string): string[] {
  const hierarchy: Record<string, string[]> = {
    capitulo: ["secao", "artigo"],
    secao: ["artigo"],
    artigo: ["paragrafo", "inciso", "alinea"],
    paragrafo: ["inciso", "alinea"],
    inciso: ["alinea"],
    alinea: [],
  };
  return hierarchy[type] ?? [];
}

function articleStats(chapter: WorkbenchNode) {
  const articles = flatten(chapter.children).filter((node) => node.type === "artigo" && node.alteracaoTipo !== "revogado");
  const approved = articles.filter((node) => node.status === "aprovado").length;
  return { total: articles.length, approved };
}

export function ChapterWorkbench({
  chapters,
  documentTree,
  canEdit,
  activeMeetingId,
  initialChapterId,
  initialSelectedId,
}: {
  chapters: WorkbenchNode[];
  documentTree: WorkbenchNode[];
  canEdit: boolean;
  activeMeetingId: number | null;
  initialChapterId?: string;
  initialSelectedId?: string;
}) {
  const router = useRouter();
  const validInitialChapter = chapters.some((item) => item.id === initialChapterId)
    ? initialChapterId
    : chapters[0]?.id;
  const [chapterId, setChapterId] = useState(validInitialChapter ?? "");
  const chapter = chapters.find((item) => item.id === chapterId) ?? chapters[0];
  const items = useMemo(() => chapter ? flatten(chapter.children) : [], [chapter]);
  const validInitialSelected = initialSelectedId && findNode(documentTree, initialSelectedId)
    ? initialSelectedId
    : chapter?.children[0]?.id ?? chapter?.id;
  const [selectedId, setSelectedId] = useState(validInitialSelected ?? "");
  const [query, setQuery] = useState("");
  const [panelOpen, setPanelOpen] = useState(true);
  const [editingOpen, setEditingOpen] = useState(false);
  const [collaborationOpen, setCollaborationOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveParentId, setMoveParentId] = useState<string | null>(null);
  const [moveAfterId, setMoveAfterId] = useState<string | null>(null);
  const [movePending, setMovePending] = useState(false);
  const effectiveSelectedId = selectedId === chapter?.id || items.some((item) => item.id === selectedId)
    ? selectedId
    : chapter?.children[0]?.id ?? chapter?.id ?? "";
  const selected = effectiveSelectedId === chapter?.id
    ? chapter
    : items.find((item) => item.id === effectiveSelectedId) ?? chapter;
  const selectedRef = useRef<HTMLButtonElement | null>(null);
  const allNodes = useMemo(() => flatten(documentTree), [documentTree]);
  const selectedDescendants = selected ? descendantIds(selected) : new Set<string>();
  const possibleParents = selected
    ? allNodes.filter((node) =>
      node.id !== selected.id &&
      !selectedDescendants.has(node.id) &&
      node.alteracaoTipo !== "revogado" &&
      allowedChildren(node.type).includes(selected.type),
    )
    : [];
  const destinationSiblings = moveParentId === null
    ? documentTree.filter((node) => node.id !== selected?.id && node.alteracaoTipo !== "revogado")
    : (findNode(documentTree, moveParentId)?.children ?? [])
      .filter((node) => node.id !== selected?.id && node.alteracaoTipo !== "revogado");
  const moveEffects = selected
    ? simulateArticleMove(documentTree, selected.id, moveParentId, moveAfterId)
    : [];
  const nodesById = new Map(allNodes.map((node) => [node.id, node]));
  const returnQuery = new URLSearchParams({
    origem: "mesa",
    capitulo: chapter?.id ?? "",
    dispositivo: selected?.id ?? "",
  }).toString();

  function focusCreated(id: string, targetChapterId: string) {
    setChapterId(targetChapterId);
    setSelectedId(id);
    router.push(`/mesa-trabalho?${new URLSearchParams({
      capitulo: targetChapterId,
      dispositivo: id,
    }).toString()}`);
  }

  function openMoveDialog() {
    if (!selected) return;
    setMoveParentId(selected.parentId);
    const siblings = selected.parentId === null
      ? documentTree
      : findNode(documentTree, selected.parentId)?.children ?? [];
    const selectedIndex = siblings.findIndex((node) => node.id === selected.id);
    setMoveAfterId(selectedIndex > 0 ? siblings[selectedIndex - 1].id : null);
    setMoveOpen(true);
  }

  async function confirmMove() {
    if (!selected) return;
    setMovePending(true);
    const result = await moveProposalProvision(selected.id, moveParentId, moveAfterId);
    setMovePending(false);
    if (result.error) return toast.error(result.error);
    toast.success(result.message || "Dispositivo movido na proposta.");
    const destinationChapter = moveParentId && chapters.some((item) => item.id === moveParentId)
      ? moveParentId
      : chapters.find((item) => moveParentId && findNode(item.children, moveParentId))?.id;
    if (destinationChapter) setChapterId(destinationChapter);
    setMoveOpen(false);
    router.refresh();
  }

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [effectiveSelectedId]);

  const filteredChapters = chapters.filter((item) =>
    `${label(item)} ${item.titulo ?? ""}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")),
  );
  const stats = chapter ? articleStats(chapter) : { total: 0, approved: 0 };

  if (!chapter) {
    return <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">Nenhum capítulo disponível na proposta.</p>;
  }

  return (
    <div className="space-y-4 xl:relative xl:left-1/2 xl:w-[min(96rem,calc(100vw-3rem))] xl:-translate-x-1/2">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Reforma · ambiente principal</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Mesa de Trabalho</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Leia o capítulo inteiro, selecione um dispositivo e use o painel contextual sem perder o lugar no documento.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/consolidado" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <BookOpenText /> Prévia integral
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPanelOpen((value) => !value)}
            aria-label={panelOpen ? "Recolher painel contextual" : "Abrir painel contextual"}
          >
            {panelOpen ? <PanelRightClose /> : <PanelRightOpen />}
            {panelOpen ? "Recolher painel" : "Abrir painel"}
          </Button>
        </div>
      </header>

      {canEdit && (
        <section className="grid gap-3 sm:grid-cols-2" aria-label="Inclusão de estrutura">
          <div className="rounded-xl border bg-card p-3">
            <div className="mb-2">
              <p className="text-sm font-medium">Estrutura geral</p>
              <p className="text-xs text-muted-foreground">Acrescente um capítulo à proposta.</p>
            </div>
            <NewProvisionForm
              parentId={null}
              parentType="root"
              canEdit={canEdit}
              types={["capitulo"]}
              label="Novo capítulo"
              onCreated={(id) => focusCreated(id, id)}
            />
          </div>
          <div className="rounded-xl border bg-card p-3">
            <div className="mb-2">
              <p className="text-sm font-medium">{label(chapter)}</p>
              <p className="text-xs text-muted-foreground">Crie uma seção dentro do capítulo atualmente aberto.</p>
            </div>
            <NewProvisionForm
              parentId={chapter.id}
              parentType="capitulo"
              canEdit={canEdit}
              types={["secao"]}
              label="Nova seção neste capítulo"
              onCreated={(id) => focusCreated(id, chapter.id)}
            />
          </div>
        </section>
      )}

      <div className={cn(
        "grid min-h-[680px] overflow-hidden rounded-2xl border bg-card shadow-sm",
        panelOpen ? "lg:grid-cols-[210px_minmax(0,1fr)_300px] xl:grid-cols-[230px_minmax(0,1fr)_330px]" : "lg:grid-cols-[210px_minmax(0,1fr)] xl:grid-cols-[230px_minmax(0,1fr)]",
      )}>
        <aside className="border-b bg-muted/25 lg:border-r lg:border-b-0">
          <div className="border-b p-3">
            <label className="relative block">
              <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Localizar capítulo"
                className="h-9 pl-8 text-sm"
              />
            </label>
          </div>
          <ScrollArea className="h-48 lg:h-[630px]">
            <nav className="space-y-1 p-2" aria-label="Capítulos da proposta">
              {filteredChapters.map((item) => {
                const active = item.id === chapter.id;
                const itemStats = articleStats(item);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setChapterId(item.id);
                      setSelectedId(item.children[0]?.id ?? item.id);
                    }}
                    className={cn(
                      "w-full rounded-lg px-2.5 py-2 text-left transition-colors",
                      active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      <ChevronRight className={cn("h-3.5 w-3.5", active && "rotate-90")} />
                      <span className="truncate">{label(item)}</span>
                    </span>
                    <span className={cn("mt-0.5 block truncate pl-5 text-xs", active ? "text-primary-foreground/75" : "text-muted-foreground")}>
                      {item.titulo || "Sem título"}
                    </span>
                    <span className={cn("mt-1 block pl-5 text-[11px]", active ? "text-primary-foreground/70" : "text-muted-foreground/75")}>
                      {itemStats.approved}/{itemStats.total} redações concluídas
                    </span>
                  </button>
                );
              })}
            </nav>
          </ScrollArea>
        </aside>

        <main className="min-w-0 bg-background/40">
          <div className="sticky top-0 z-10 border-b bg-card/95 px-4 py-3 backdrop-blur sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Documento em construção</p>
                <h3 className="truncate font-heading text-lg font-semibold">
                  {label(chapter)}{chapter.titulo ? ` — ${chapter.titulo}` : ""}
                </h3>
              </div>
              <span className="rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground">
                {stats.approved} de {stats.total} redações concluídas
              </span>
            </div>
          </div>

          <ScrollArea className="h-[630px]">
            <article className="mx-auto max-w-4xl px-4 py-6 sm:px-7 lg:px-8">
              <button
                type="button"
                onClick={() => setSelectedId(chapter.id)}
                className={cn(
                  "mb-5 w-full rounded-xl border px-4 py-4 text-center transition-colors",
                  effectiveSelectedId === chapter.id ? "border-primary bg-primary/5" : "border-transparent hover:border-border hover:bg-card",
                )}
              >
                <span className="block font-heading text-sm font-semibold uppercase tracking-wide">{label(chapter)}</span>
                {chapter.titulo && <span className="mt-1 block font-heading text-lg font-semibold uppercase">{chapter.titulo}</span>}
              </button>

              <div className="space-y-1">
                {items.map((item) => {
                  const active = item.id === effectiveSelectedId;
                  const revoked = item.alteracaoTipo === "revogado";
                  const moved = item.numero && item.numeroVigente && normalizarNumero(item.numero) !== normalizarNumero(item.numeroVigente);
                  return (
                    <button
                      key={item.id}
                      ref={active ? selectedRef : undefined}
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={cn(
                        "group w-full rounded-xl border border-transparent px-3 py-2 text-left transition-all hover:border-border hover:bg-card",
                        active && "border-primary/50 bg-card shadow-sm ring-2 ring-primary/10",
                        revoked && "opacity-65",
                      )}
                      style={{ paddingLeft: `${12 + Math.min(item.depth, 4) * 18}px` }}
                    >
                      <span className="mb-1 flex flex-wrap items-center gap-2">
                        <span className={cn("font-heading text-sm font-semibold", revoked && "line-through")}>{label(item)}</span>
                        {item.titulo && <span className="text-sm text-muted-foreground">— {item.titulo}</span>}
                        {item.origem === "novo" && <NovoBadge />}
                        {moved && (
                          <span className="rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                            era {item.numeroVigente}
                          </span>
                        )}
                        {revoked && <span className="rounded-full border px-1.5 py-0.5 text-[10px] text-muted-foreground">revogado</span>}
                        <span className="ml-auto flex items-center gap-1.5">
                          {item.hasPending && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" aria-label="Possui pendência aberta" />}
                          {item.hasNote && <StickyNote className="h-3.5 w-3.5 text-violet-500" aria-label="Possui anotação pessoal" />}
                          <StatusDot status={item.status} />
                        </span>
                      </span>
                      {revoked ? (
                        <span className="block text-sm italic text-muted-foreground">Retirado da proposta de texto futuro.</span>
                      ) : currentText(item).trim() ? (
                        <RichTextContent text={currentText(item)} className="text-[15px] leading-7 text-foreground/85" />
                      ) : (
                        <span className="block text-sm italic text-muted-foreground">Redação ainda não cadastrada.</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </article>
          </ScrollArea>
        </main>

        {panelOpen && selected && (
          <aside className="border-t bg-card lg:border-t-0 lg:border-l">
            <div className="border-b p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Dispositivo selecionado</p>
                  <h3 className="mt-0.5 truncate font-heading text-base font-semibold">{label(selected)}</h3>
                  {selected.titulo && <p className="truncate text-xs text-muted-foreground">{selected.titulo}</p>}
                </div>
                <StatusBadge status={selected.status} />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                <span className="rounded-full border px-2 py-0.5">{PROVISION_TYPE_LABELS[selected.type]}</span>
                {selected.origem === "novo" && <NovoBadge className="h-5" />}
                {selected.hasPending && <span className="rounded-full border border-amber-300 px-2 py-0.5 text-amber-700">pendência aberta</span>}
              </div>
            </div>

            <ScrollArea className="h-[550px]">
              <div className="space-y-4 p-4">
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" size="sm" className="justify-start" onClick={() => setEditingOpen(true)}>
                    <FilePenLine /> Redigir
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="justify-start"
                    onClick={openMoveDialog}
                    disabled={!canEdit}
                  >
                    <GripVertical /> Reorganizar
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="justify-start" onClick={() => setCollaborationOpen(true)}>
                    <MessageSquareText /> Colaboração
                  </Button>
                  <Link
                    href={activeMeetingId ? `/reunioes/${activeMeetingId}` : "/reunioes"}
                    className={buttonVariants({ variant: "outline", size: "sm", className: "justify-start" })}
                  >
                    <Users /> Colaborar
                  </Link>
                </div>

                {canEdit && allowedChildren(selected.type).length > 0 && (
                  <div className="rounded-lg border bg-muted/25 p-3">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-medium"><Plus className="h-3.5 w-3.5" /> Acrescentar neste ponto</p>
                    <NewProvisionForm
                      parentId={selected.id}
                      parentType={selected.type}
                      canEdit={canEdit}
                      types={allowedChildren(selected.type)}
                      label="Adicionar dispositivo subordinado"
                      onCreated={(id) => focusCreated(id, chapter.id)}
                    />
                  </div>
                )}

                <Tabs defaultValue="comparacao">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="comparacao">Comparação</TabsTrigger>
                    <TabsTrigger value="subsidios">Apoio à redação</TabsTrigger>
                    <TabsTrigger value="situacao">Situação</TabsTrigger>
                  </TabsList>
                  <TabsContent value="comparacao" className="space-y-3 pt-2">
                    <TextBlock title="Estatuto vigente" text={selected.textoVigente} />
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ArrowLeftRight className="h-3.5 w-3.5" />
                      <span>{selected.numeroVigente ? `Origem: ${selected.numeroVigente}` : "Sem correspondente no vigente"}</span>
                    </div>
                    <TextBlock title="Redação atual da comissão" text={currentText(selected)} accent />
                  </TabsContent>
                  <TabsContent value="subsidios" className="space-y-3 pt-2">
                    <TextBlock title="Proposta preliminar" text={selected.propostaInicial} />
                    <TextBlock title="Justificativa registrada" text={selected.justificativa} />
                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="rounded-lg border p-2">
                        <span className="block text-lg font-semibold">{selected.suggestionCount}</span>
                        sugestões
                      </div>
                      <div className="rounded-lg border p-2">
                        <span className="block text-lg font-semibold">{selected.commentCount}</span>
                        comentários
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="situacao" className="space-y-4 pt-2">
                    <StatusControl provisionId={selected.id} status={selected.status} canEdit={canEdit} />
                    <dl className="space-y-2 text-xs">
                      <InfoRow label="Versão" value={`v${selected.version}`} />
                      <InfoRow label="Alteração" value={selected.alteracaoTipo.replaceAll("_", " ")} />
                      <InfoRow label="Numeração atual" value={selected.numero || "provisória"} />
                      <InfoRow label="Numeração vigente" value={selected.numeroVigente || "sem correspondente"} />
                      {selected.numeroSugerido && selected.numero && normalizarNumero(selected.numeroSugerido) !== normalizarNumero(selected.numero) && (
                        <InfoRow label="Ordem sugeriria" value={selected.numeroSugerido} warning />
                      )}
                    </dl>
                  </TabsContent>
                </Tabs>
              </div>
            </ScrollArea>
          </aside>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><ListTree className="h-3.5 w-3.5" /> A numeração é consequência da posição; a identidade interna do dispositivo permanece estável.</span>
        <Link href="/comparativo" className="font-medium text-primary hover:underline">Abrir quadro comparativo</Link>
      </div>

      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reorganizar {selected ? label(selected) : "dispositivo"}</DialogTitle>
            <DialogDescription>
              Escolha o destino e confira toda a renumeração provocada antes de confirmar. A identidade e o histórico do dispositivo permanecem os mesmos.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-xs font-medium">
              Destino estrutural
              <select
                className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm font-normal"
                value={moveParentId ?? "__root__"}
                onChange={(event) => {
                  setMoveParentId(event.target.value === "__root__" ? null : event.target.value);
                  setMoveAfterId(null);
                }}
              >
                <option value="__root__">Raiz da proposta</option>
                {possibleParents.map((node) => (
                  <option key={node.id} value={node.id}>{destinationLabel(node)}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 text-xs font-medium">
              Posição no destino
              <select
                className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm font-normal"
                value={moveAfterId ?? "__start__"}
                onChange={(event) => setMoveAfterId(event.target.value === "__start__" ? null : event.target.value)}
              >
                <option value="__start__">No início</option>
                {destinationSiblings.map((node) => (
                  <option key={node.id} value={node.id}>Após {destinationLabel(node)}</option>
                ))}
              </select>
            </label>
          </div>

          <section className="rounded-xl border bg-muted/20">
            <div className="flex items-center justify-between gap-3 border-b px-3 py-2.5">
              <h4 className="text-xs font-semibold uppercase tracking-wide">Prévia do impacto</h4>
              <span className="text-xs text-muted-foreground">
                {moveEffects.length} {moveEffects.length === 1 ? "artigo afetado" : "artigos afetados"}
              </span>
            </div>
            <div className="max-h-56 overflow-y-auto p-2">
              {moveEffects.length > 0 ? (
                <ul className="space-y-1">
                  {moveEffects.map((effect) => {
                    const affected = nodesById.get(effect.id);
                    return (
                      <li key={effect.id} className={cn("flex items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-sm", effect.id === selected?.id && "bg-primary/10 font-medium")}>
                        <span className="min-w-0 truncate">
                          {affected?.numeroVigente ? `Artigo vigente ${affected.numeroVigente}` : label(affected ?? { id: effect.id, type: "artigo", numero: effect.from })}
                          {effect.id === selected?.id && " · movimentado"}
                        </span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">{effect.from} → <strong className="text-foreground">{effect.to}</strong></span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                  Esta posição não altera a numeração dos artigos. A hierarquia ainda poderá ser alterada.
                </p>
              )}
            </div>
          </section>

          <p className="text-xs text-muted-foreground">
            Dispositivos subordinados acompanham o item movimentado. Referências internas potencialmente afetadas serão sinalizadas para revisão humana; nenhum texto é concluído automaticamente.
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMoveOpen(false)} disabled={movePending}>Cancelar</Button>
            <Button type="button" onClick={confirmMove} disabled={movePending || !canEdit}>
              {movePending && <Loader2 className="animate-spin" />}
              Confirmar movimentação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editingOpen} onOpenChange={setEditingOpen}>
        <DialogContent className="h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-none gap-0 overflow-hidden rounded-xl p-0 sm:h-[94vh] sm:w-[calc(100vw-2rem)] sm:!max-w-6xl xl:!max-w-7xl">
          <DialogHeader className="shrink-0 border-b px-4 py-4 pr-14 sm:px-6">
            <DialogTitle>Redigir {selected ? label(selected) : "dispositivo"}</DialogTitle>
            <DialogDescription>
              Edite a redação de trabalho sem sair do capítulo. Cada salvamento cria uma nova versão no histórico.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5 lg:grid lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start lg:gap-5 lg:p-6">
              <section className="min-w-0 rounded-xl border bg-background p-3 sm:p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold">Redação de trabalho</h4>
                  <span className="text-xs text-muted-foreground">Área ampliada de edição</span>
                </div>
                <WorkingTextEditor
                  key={`${selected.id}:${selected.version}`}
                  provisionId={selected.id}
                  initialText={selected.redacaoTrabalho || selected.propostaInicial || selected.textoVigente}
                  version={selected.version}
                  canEdit={canEdit && selected.status !== "aprovado"}
                  compararTexto={selected.textoVigente}
                  editorMinHeightClass="min-h-[19rem] sm:min-h-[26rem] lg:min-h-[34rem]"
                />
              </section>

              <aside className="mt-4 space-y-4 lg:sticky lg:top-0 lg:mt-0">
                <section className="rounded-xl border bg-background p-4">
                  <h4 className="mb-3 text-sm font-semibold">Justificativa da alteração</h4>
                  <JustificativaEditor
                    key={`${selected.id}:${selected.justificativa}`}
                    provisionId={selected.id}
                    initial={selected.justificativa}
                    canEdit={canEdit}
                  />
                </section>
                <ApprovalControl
                  key={`${selected.id}:${selected.status}:${selected.redacaoTrabalho}`}
                  provisionId={selected.id}
                  status={selected.status}
                  canEdit={canEdit}
                  hasWorkingText={Boolean(selected.redacaoTrabalho.trim())}
                />
                <div className="flex justify-end">
                  <Link href={`/dispositivo/${selected.id}?aba=historico&${returnQuery}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                    Abrir tela clássica: histórico e referências
                  </Link>
                </div>
              </aside>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={collaborationOpen} onOpenChange={setCollaborationOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Colaboração em {selected ? label(selected) : "dispositivo"}</DialogTitle>
            <DialogDescription>
              Registre sugestões, comentários, pendências e anotações pessoais sem perder o contexto do capítulo.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <Tabs defaultValue="sugestoes" className="min-w-0">
              <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-4">
                <TabsTrigger value="sugestoes">Sugestões ({selected.suggestions.length})</TabsTrigger>
                <TabsTrigger value="comentarios">Comentários ({selected.comments.length})</TabsTrigger>
                <TabsTrigger value="pendencias">Pendências ({selected.pendings.length})</TabsTrigger>
                <TabsTrigger value="anotacao">Minha anotação</TabsTrigger>
              </TabsList>
              <TabsContent value="sugestoes" className="space-y-3 pt-3">
                <SuggestionForm provisionId={selected.id} />
                {selected.suggestions.length === 0 ? (
                  <p className="rounded-lg border p-4 text-sm text-muted-foreground">Nenhuma sugestão registrada.</p>
                ) : (
                  selected.suggestions.map((suggestion) => (
                    <article key={suggestion.id} className="rounded-xl border bg-card p-4 text-sm">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">
                          {suggestion.author_name} · {new Date(`${suggestion.created_at}Z`).toLocaleString("pt-BR")}
                        </span>
                        <span className="rounded-full border px-2 py-0.5 text-[11px]">{suggestion.status.replaceAll("_", " ")}</span>
                      </div>
                      {suggestion.onde_esta && <p className="mb-2 text-muted-foreground"><strong>Onde está:</strong> {suggestion.onde_esta}</p>}
                      <p><strong>Sugestão:</strong> {suggestion.texto}</p>
                      {suggestion.justificativa && <p className="mt-2 text-muted-foreground"><strong>Justificativa:</strong> {suggestion.justificativa}</p>}
                    </article>
                  ))
                )}
              </TabsContent>
              <TabsContent value="comentarios" className="space-y-3 pt-3">
                <CommentForm provisionId={selected.id} suggestionId={null} />
                <CommentList comments={selected.comments} />
              </TabsContent>
              <TabsContent value="pendencias" className="space-y-3 pt-3">
                <PendingForm provisionId={selected.id} />
                {selected.pendings.length === 0 ? (
                  <p className="rounded-lg border p-4 text-sm text-muted-foreground">Nenhuma pendência registrada.</p>
                ) : selected.pendings.map((pending) => <PendingItem key={pending.id} p={pending} />)}
              </TabsContent>
              <TabsContent value="anotacao" className="pt-3">
                <PersonalNoteForm key={`${selected.id}:${selected.personalNote}`} provisionId={selected.id} initial={selected.personalNote} />
              </TabsContent>
              <div className="mt-4 flex justify-end border-t pt-4">
                <Link href={`/dispositivo/${selected.id}?aba=colaboracao&${returnQuery}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  Abrir tela clássica de consulta
                </Link>
              </div>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TextBlock({ title, text, accent = false }: { title: string; text: string; accent?: boolean }) {
  return (
    <section className={cn("rounded-lg border p-3", accent && "border-primary/30 bg-primary/5")}>
      <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      {text.trim() ? (
        <RichTextContent text={text} className="text-sm leading-6" />
      ) : (
        <p className="text-xs italic text-muted-foreground">Sem texto registrado.</p>
      )}
    </section>
  );
}

function InfoRow({ label: title, value, warning = false }: { label: string; value: string; warning?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b pb-2 last:border-b-0">
      <dt className="text-muted-foreground">{title}</dt>
      <dd className={cn("text-right font-medium", warning && "text-amber-700 dark:text-amber-300")}>{value}</dd>
    </div>
  );
}
