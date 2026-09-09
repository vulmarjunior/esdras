"use client";

import { useDeferredValue, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import type { DiffPart, ReviewRow } from "@/lib/review-core";

const changeColors = {
  "Não alterado": "border-border bg-muted text-muted-foreground",
  Alterado: "border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  Novo: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  Revogado: "border-red-300 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-200",
};

function ComparedText({ parts, side, highlight }: { parts: DiffPart[]; side: "before" | "after"; highlight: boolean }) {
  return <p className="whitespace-pre-wrap break-words text-sm leading-7">{parts.map((part, i) => {
    if (!highlight || !part.changed) return <span key={i}>{part.text}</span>;
    return side === "before"
      ? <del key={i} className="bg-red-100 text-red-900 decoration-red-600 dark:bg-red-950 dark:text-red-200">{part.text}</del>
      : <ins key={i} className="bg-emerald-100 text-emerald-900 decoration-emerald-600 dark:bg-emerald-950 dark:text-emerald-200">{part.text}</ins>;
  })}</p>;
}

export function StatuteReview({ rows }: { rows: ReviewRow[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Todos");
  const [chapter, setChapter] = useState("");
  const [highlight, setHighlight] = useState(true);
  const deferredQuery = useDeferredValue(query).trim().toLocaleLowerCase("pt-BR");
  const router = useRouter();
  const chapters = [...new Map(rows.map(row => [row.chapterId, row.chapterLabel])).entries()];
  const visible = rows.filter(row => {
    if (chapter && row.chapterId !== chapter) return false;
    if (filter === "Somente alterados" && row.change === "Não alterado" && !row.moved && !row.renumbered) return false;
    if (filter === "Não alterados" && row.change !== "Não alterado") return false;
    if (filter === "Não aprovados" && row.status === "aprovado") return false;
    return !deferredQuery || [row.label, row.originalLabel, row.title, row.originalTitle, row.context, row.before, row.after].join(" ").toLocaleLowerCase("pt-BR").includes(deferredQuery);
  });
  return <div className="space-y-5">
    <header className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">Reforma · leitura comparativa</p>
      <h2 className="text-2xl font-semibold tracking-tight">Estatuto em revisão</h2>
      <p className="text-sm text-muted-foreground">O Estatuto registrado e a redação atual, dispositivo por dispositivo, na ordem da reforma.</p>
      <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100">Versão em revisão — inclui textos ainda não aprovados. Para consultar apenas as aprovações, abra o <Link className="underline" href="/consolidado">Consolidado</Link>.</p>
    </header>
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="space-y-1 text-sm">Buscar texto ou artigo<input className="h-10 w-full rounded-md border bg-background px-3" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Ex.: Art. 8º ou assembleia" /></label>
        <label className="space-y-1 text-sm">Capítulo<select className="h-10 w-full rounded-md border bg-background px-3" value={chapter} onChange={e => setChapter(e.target.value)}><option value="">Todos os capítulos</option>{chapters.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label className="space-y-1 text-sm">Exibir<select className="h-10 w-full rounded-md border bg-background px-3" value={filter} onChange={e => setFilter(e.target.value)}>{["Todos", "Somente alterados", "Não alterados", "Não aprovados"].map(value => <option key={value}>{value}</option>)}</select></label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={highlight} onChange={e => setHighlight(e.target.checked)} />Destacar trechos retirados e acrescentados</label>
        <Button variant="outline" size="sm" onClick={() => router.refresh()}>Atualizar leitura</Button>
      </div>
      <p className="text-xs text-muted-foreground">Prioridade do texto atual: redação de trabalho → proposta inicial → texto vigente. “Não alterado” compara o conteúdo, ignorando formatação e espaços; a etapa de análise aparece separadamente.</p>
    </div>
    <p role="status" className="text-sm text-muted-foreground">{visible.length} de {rows.length} dispositivos · {rows.filter(r => r.change === "Não alterado").length} com texto não alterado</p>
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="hidden grid-cols-2 border-b bg-muted md:grid"><h3 className="px-5 py-3 font-semibold">Versão anterior · Estatuto registrado</h3><h3 className="border-l px-5 py-3 font-semibold">Versão atual · Reforma em andamento</h3></div>
      {visible.length === 0 ? <p className="p-8 text-center text-muted-foreground">Nenhum dispositivo encontrado. Ajuste os filtros ou a busca.</p> : visible.map(row => <section key={row.id} aria-label={`Comparação de ${row.label}`} className="border-b last:border-b-0">
        <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/40 px-4 py-3">
          <div className="min-w-0"><p className="break-words text-xs text-muted-foreground">{row.context || "Estrutura do documento"}</p><h4 className="font-semibold">{row.label}{row.title ? ` — ${row.title}` : ""}</h4></div>
          <Link href={`/dispositivo/${row.id}`} className="shrink-0 text-sm font-medium text-primary underline underline-offset-4">Abrir dispositivo</Link>
        </div>
        <div className="grid md:grid-cols-2">
          <div className="min-w-0 space-y-3 p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase text-muted-foreground md:hidden">Versão anterior</p>
            <p className="text-sm font-semibold">{row.change === "Novo" ? "Sem correspondente no Estatuto registrado" : row.originalLabel ?? "Numeração original não disponível"}{row.originalTitle ? ` — ${row.originalTitle}` : ""}</p>
            {row.before ? <ComparedText parts={row.beforeParts} side="before" highlight={highlight} /> : <p className="text-sm italic text-muted-foreground">{row.change === "Novo" ? "Dispositivo incluído na reforma." : "Sem texto vigente cadastrado."}</p>}
          </div>
          <div className="min-w-0 space-y-3 border-t p-4 sm:p-5 md:border-t-0 md:border-l">
            <p className="text-xs font-semibold uppercase text-muted-foreground md:hidden">Versão atual</p>
            <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${changeColors[row.change]}`}>{row.change}</span><StatusBadge status={row.status} />{row.renumbered ? <span className="text-xs">Numeração alterada · antigo {row.originalLabel}</span> : null}{row.moved ? <span className="text-xs">Posição alterada</span> : null}</div>
            {row.change === "Revogado" ? <p className="text-sm">Retirada indicada na reforma. O texto anterior permanece ao lado para comparação; confira a etapa de análise antes de considerar a decisão aprovada.</p> : row.after ? <ComparedText parts={row.afterParts} side="after" highlight={highlight} /> : <p className="text-sm italic text-muted-foreground">Redação ainda não cadastrada.</p>}
            <p className="text-xs text-muted-foreground">{row.source}</p>
          </div>
        </div>
      </section>)}
    </div>
  </div>;
}
