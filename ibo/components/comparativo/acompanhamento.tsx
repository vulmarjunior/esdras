"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  FileText,
  MessageSquarePlus,
} from "lucide-react";
import { QuadroComparativo } from "@/components/comparativo/quadro-comparativo";
import { CommentForm, CommentList } from "@/components/provision/comment-forms";
import { PendingForm } from "@/components/provision/pending-forms";
import { PersonalNoteForm } from "@/components/provision/personal-note-form";
import { SuggestionForm, SuggestionItem } from "@/components/provision/suggestion-forms";
import { RichTextContent } from "@/components/rich-text-content";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ALTERACAO_TYPE_LABELS, PENDING_CATEGORY_LABELS } from "@/lib/labels";
import { rotuloCorrespondencia } from "@/lib/correspondencias";
import type { CorrespondenciaRegistro } from "@/app/actions/provision";
import type { LinhaComparativo } from "@/lib/comparativo-core";
import type { Comment, PendingIssue, Suggestion } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface LinhaAcompanhamento extends LinhaComparativo {
  suggestions: Suggestion[];
  comments: Comment[];
  pendings: PendingIssue[];
  personalNote: string;
  correspondencias: CorrespondenciaRegistro[];
  justificativasEscopo: { label: string; texto: string }[];
}

type ContributionTab = "sugestao" | "comentario" | "pendencia" | "anotacao";

export function Acompanhamento({ linhas }: { linhas: LinhaAcompanhamento[] }) {
  const [mode, setMode] = useState<"acompanhar" | "quadro">("acompanhar");
  const [selectedId, setSelectedId] = useState(linhas.find((linha) => !linha.revogado)?.id ?? linhas[0]?.id ?? "");
  const [chapter, setChapter] = useState("");
  const [contributionOpen, setContributionOpen] = useState(false);
  const [contributionTab, setContributionTab] = useState<ContributionTab>("sugestao");

  const chapters = useMemo(() => [...new Set(linhas.map((linha) => linha.capitulo).filter(Boolean))], [linhas]);
  const chapterLines = useMemo(
    () => (chapter ? linhas.filter((linha) => linha.capitulo === chapter) : linhas),
    [chapter, linhas],
  );
  const selected = linhas.find((linha) => linha.id === selectedId) ?? chapterLines[0] ?? linhas[0];
  const selectedIndex = selected ? chapterLines.findIndex((linha) => linha.id === selected.id) : -1;

  function chooseChapter(value: string) {
    setChapter(value);
    const first = (value ? linhas.filter((linha) => linha.capitulo === value) : linhas)[0];
    if (first) setSelectedId(first.id);
  }

  function openContribution(tab: ContributionTab) {
    setContributionTab(tab);
    setContributionOpen(true);
  }

  if (!selected) {
    return <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">Nenhum artigo disponível para acompanhamento.</p>;
  }

  const openPendings = selected.pendings.filter((pending) => pending.status === "aberta");

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid w-full grid-cols-1 gap-1 rounded-lg bg-muted p-1 min-[390px]:grid-cols-2 sm:w-auto">
          <Button className="w-full" size="sm" variant={mode === "acompanhar" ? "default" : "ghost"} onClick={() => setMode("acompanhar")}>
            <FileText /> Acompanhar a reforma
          </Button>
          <Button className="w-full" size="sm" variant={mode === "quadro" ? "default" : "ghost"} onClick={() => setMode("quadro")}>
            <ArrowLeftRight /> Quadro comparativo
          </Button>
        </div>
        {mode === "acompanhar" && (
          <Button className="hidden sm:inline-flex" onClick={() => openContribution("sugestao")}>
            <MessageSquarePlus /> Contribuir
          </Button>
        )}
      </div>

      {mode === "quadro" ? (
        <QuadroComparativo linhas={linhas} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
          <aside className="hidden rounded-xl border bg-card lg:block">
            <div className="border-b p-3">
              <label className="space-y-1 text-sm font-medium">
                Capítulo
                <select value={chapter} onChange={(event) => chooseChapter(event.target.value)} className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm">
                  <option value="">Todos os capítulos</option>
                  {chapters.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
            </div>
            <nav className="max-h-[68vh] space-y-1 overflow-y-auto p-2" aria-label="Artigos para acompanhamento">
              {chapterLines.map((linha) => (
                <button
                  key={linha.id}
                  type="button"
                  onClick={() => setSelectedId(linha.id)}
                  className={cn(
                    "w-full rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors",
                    linha.id === selected.id ? "border-primary/40 bg-primary/10" : "hover:bg-muted",
                  )}
                >
                  <span className="flex items-center justify-between gap-2 text-sm font-medium">
                    <span>{linha.label}</span>
                    {linha.pendings.some((pending) => pending.status === "aberta") && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">{linha.titulo || linha.capitulo}</span>
                </button>
              ))}
            </nav>
          </aside>

          <main className="min-w-0 space-y-4">
            <div className="grid gap-2 rounded-xl border bg-card p-3 lg:hidden">
              <label className="text-sm font-medium">
                Capítulo
                <select value={chapter} onChange={(event) => chooseChapter(event.target.value)} className="mt-1 h-11 w-full rounded-lg border bg-background px-3 text-base">
                  <option value="">Todos os capítulos</option>
                  {chapters.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium">
                Dispositivo
                <select value={selected.id} onChange={(event) => setSelectedId(event.target.value)} className="mt-1 h-11 w-full rounded-lg border bg-background px-3 text-base">
                  {chapterLines.map((linha) => <option key={linha.id} value={linha.id}>{linha.label}{linha.titulo ? ` — ${linha.titulo}` : ""}</option>)}
                </select>
              </label>
            </div>

            <section className="overflow-hidden rounded-xl border bg-card">
              <header className="space-y-3 border-b bg-muted/30 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">{selected.capitulo || "Sem capítulo"}</p>
                    <h2 className="mt-1 font-heading text-xl font-semibold">{selected.label}{selected.titulo ? ` — ${selected.titulo}` : ""}</h2>
                    {selected.labelVigente && selected.labelVigente !== selected.label && (
                      <p className="mt-1 text-sm text-muted-foreground">No Estatuto vigente: {selected.labelVigente}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={selected.status} />
                    <Badge variant="outline">{ALTERACAO_TYPE_LABELS[selected.alteracaoTipo] || selected.alteracaoTipo}</Badge>
                    {openPendings.length > 0 && <Badge variant="outline" className="border-amber-300 text-amber-700">{openPendings.length} pendência(s)</Badge>}
                  </div>
                </div>
              </header>

              <div className="p-3 sm:p-5">
                <Tabs defaultValue="redacao">
                  <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-6">
                    <TabsTrigger value="redacao">Redação atual</TabsTrigger>
                    <TabsTrigger value="vigente">Vigente</TabsTrigger>
                    <TabsTrigger value="inicial">Proposta inicial</TabsTrigger>
                    <TabsTrigger value="justificativa">Justificativa</TabsTrigger>
                    <TabsTrigger value="vinculos">Vínculos ({selected.correspondencias.length})</TabsTrigger>
                    <TabsTrigger value="pendencias">Pendências ({openPendings.length})</TabsTrigger>
                  </TabsList>
                  <TabsContent value="redacao" className="pt-4">
                    <TextPanel text={selected.currentText} empty="Redação ainda não cadastrada." accent />
                  </TabsContent>
                  <TabsContent value="vigente" className="pt-4">
                    <TextPanel text={selected.before} empty="Sem texto vigente cadastrado." />
                  </TabsContent>
                  <TabsContent value="inicial" className="pt-4">
                    <TextPanel text={selected.propostaInicial} empty="Sem proposta inicial cadastrada." />
                  </TabsContent>
                  <TabsContent value="justificativa" className="space-y-3 pt-4">
                    <TextPanel text={selected.justificativa} empty="Nenhuma justificativa registrada para este dispositivo." />
                    {selected.justificativasEscopo.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Justificativas de escopo (capítulos/seções que contêm este dispositivo)
                        </h4>
                        {selected.justificativasEscopo.map((item) => (
                          <div key={item.label} className="rounded-lg border bg-muted/20 p-3">
                            <p className="mb-1 text-xs font-medium text-muted-foreground">{item.label}</p>
                            <RichTextContent text={item.texto} className="text-sm leading-6" />
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="vinculos" className="space-y-3 pt-4">
                    {selected.correspondencias.length === 0 ? (
                      <p className="rounded-lg border p-4 text-sm text-muted-foreground">
                        Nenhum vínculo com o Estatuto registrado. O dispositivo usa correspondência automática pelo próprio número.
                      </p>
                    ) : (
                      <ul className="divide-y rounded-lg border">
                        {selected.correspondencias.map((vinculo) => (
                          <li key={vinculo.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                            <span className="font-medium">{vinculo.vigente_label ?? "Sem dispositivo vinculado"}</span>
                            <Badge variant="outline">{rotuloCorrespondencia(vinculo.tipo)}</Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </TabsContent>
                  <TabsContent value="pendencias" className="space-y-3 pt-4">
                    {selected.pendings.length === 0 ? (
                      <p className="rounded-lg border p-4 text-sm text-muted-foreground">Nenhuma pendência registrada.</p>
                    ) : selected.pendings.map((pending) => (
                      <div key={pending.id} className={cn("rounded-lg border p-3", pending.status === "aberta" && "border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20")}>
                        <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                          <Badge variant="outline">{PENDING_CATEGORY_LABELS[pending.categoria] || pending.categoria}</Badge>
                          <span className="text-muted-foreground">{pending.status === "aberta" ? "aberta" : "resolvida"} · {pending.author_name}</span>
                        </div>
                        <p className="text-sm">{pending.descricao}</p>
                      </div>
                    ))}
                    <Button variant="outline" onClick={() => openContribution("pendencia")}>Registrar pendência</Button>
                  </TabsContent>
                </Tabs>
              </div>

              <footer className="flex items-center justify-between gap-2 border-t bg-muted/20 p-3 sm:px-5">
                <Button variant="outline" size="sm" disabled={selectedIndex <= 0} onClick={() => setSelectedId(chapterLines[selectedIndex - 1].id)}>
                  <ChevronLeft /> Anterior
                </Button>
                <span className="text-xs text-muted-foreground">{selectedIndex + 1} de {chapterLines.length}</span>
                <Button variant="outline" size="sm" disabled={selectedIndex < 0 || selectedIndex >= chapterLines.length - 1} onClick={() => setSelectedId(chapterLines[selectedIndex + 1].id)}>
                  Próximo <ChevronRight />
                </Button>
              </footer>
            </section>

            <Button className="sticky bottom-3 z-20 w-full shadow-lg lg:hidden" onClick={() => openContribution("sugestao")}>
              <MessageSquarePlus /> Contribuir sobre {selected.label}
            </Button>
          </main>
        </div>
      )}

      <Dialog open={contributionOpen} onOpenChange={setContributionOpen}>
        <DialogContent className="max-h-[94vh] overflow-y-auto sm:!max-w-3xl">
          <DialogHeader>
            <DialogTitle>Contribuir sobre {selected.label}</DialogTitle>
            <DialogDescription>Sua contribuição fica vinculada a este dispositivo e não altera automaticamente a redação da comissão.</DialogDescription>
          </DialogHeader>
          <Tabs value={contributionTab} onValueChange={(value) => setContributionTab(value as ContributionTab)}>
            <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-4">
              <TabsTrigger value="sugestao">Sugerir redação</TabsTrigger>
              <TabsTrigger value="comentario">Comentar</TabsTrigger>
              <TabsTrigger value="pendencia">Pendência</TabsTrigger>
              <TabsTrigger value="anotacao">Anotação pessoal</TabsTrigger>
            </TabsList>
            <TabsContent value="sugestao" className="space-y-4 pt-3">
              <SuggestionForm key={`suggestion-${selected.id}`} provisionId={selected.id} defaultOpen />
              {selected.suggestions.length > 0 && (
                <div className="space-y-3 border-t pt-4">
                  <h3 className="text-sm font-semibold">Sugestões já registradas</h3>
                  {selected.suggestions.map((suggestion) => <SuggestionItem key={suggestion.id} sug={suggestion} canManage={false} />)}
                </div>
              )}
            </TabsContent>
            <TabsContent value="comentario" className="space-y-4 pt-3">
              <CommentForm provisionId={selected.id} suggestionId={null} />
              <CommentList comments={selected.comments} />
            </TabsContent>
            <TabsContent value="pendencia" className="space-y-4 pt-3">
              <PendingForm key={`pending-${selected.id}`} provisionId={selected.id} defaultOpen />
            </TabsContent>
            <TabsContent value="anotacao" className="pt-3">
              <PersonalNoteForm key={`note-${selected.id}`} provisionId={selected.id} initial={selected.personalNote} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TextPanel({ text, empty, accent = false }: { text: string; empty: string; accent?: boolean }) {
  return (
    <div className={cn("min-h-44 rounded-xl border bg-background p-4 sm:p-6", accent && "border-primary/30 bg-primary/[0.03]")}>
      {text.trim() ? <RichTextContent text={text} className="text-base leading-8" /> : <p className="text-sm italic text-muted-foreground">{empty}</p>}
    </div>
  );
}
