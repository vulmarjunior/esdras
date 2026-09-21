"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { StatusDot, StatusBadge, NovoBadge, NotedBadge } from "@/components/status-badge";
import { filtrarPorAnotacao } from "@/lib/dashboard-filter";
import { normalizarNumero, rotuloDe } from "@/lib/numeracao";
import type { TreeNode } from "@/lib/data";
import type { VersaoTrabalho } from "@/lib/types";
import { StickyNote, TriangleAlert } from "lucide-react";

/**
 * Árvore do painel com filtro "Somente com minhas anotações".
 * As anotações pessoais são privadas: apenas o próprio usuário vê as marcas.
 */
export function DashboardTree({
  chapters,
  notedIds,
  pendenciasIds = [],
  versao,
  numeros,
  contraparte,
  sugeridos = {},
}: {
  chapters: TreeNode[];
  notedIds: string[];
  /** IDs de dispositivos com pendência aberta. */
  pendenciasIds?: string[];
  versao: VersaoTrabalho;
  numeros: Record<string, string>;
  contraparte: Record<string, string>;
  /** Números derivados da ordem atual (sugestão quando divergem do documento). */
  sugeridos?: Record<string, string>;
}) {
  const [soNotadas, setSoNotadas] = useState(false);
  const [soPendentes, setSoPendentes] = useState(false);
  const notas = useMemo(() => new Set(notedIds), [notedIds]);
  const pendentes = useMemo(() => new Set(pendenciasIds), [pendenciasIds]);

  const lista = useMemo(() => {
    let base = chapters;
    if (soPendentes) {
      base = base.map((c) => filtrarPorAnotacao(c, pendentes)).filter((c): c is TreeNode => c !== null);
    }
    if (soNotadas) {
      base = base.map((c) => filtrarPorAnotacao(c, notas)).filter((c): c is TreeNode => c !== null);
    }
    return base;
  }, [soNotadas, soPendentes, chapters, notas, pendentes]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setSoNotadas((v) => !v)}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
            soNotadas
              ? "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300"
              : "border-border bg-background text-muted-foreground hover:bg-muted"
          )}
        >
          <StickyNote className="h-3.5 w-3.5" />
          Somente com minhas anotações
          {notedIds.length > 0 && (
            <span className={cn("rounded-full px-1.5", soNotadas ? "bg-violet-200/70 text-violet-900 dark:bg-violet-900 dark:text-violet-100" : "bg-muted")}>
              {notedIds.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setSoPendentes((v) => !v)}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
            soPendentes
              ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
              : "border-border bg-background text-muted-foreground hover:bg-muted"
          )}
        >
          <TriangleAlert className="h-3.5 w-3.5" />
          Somente com pendências
          {pendenciasIds.length > 0 && (
            <span className={cn("rounded-full px-1.5", soPendentes ? "bg-amber-200/70 text-amber-900 dark:bg-amber-900 dark:text-amber-100" : "bg-muted")}>
              {pendenciasIds.length}
            </span>
          )}
        </button>
        {notedIds.length === 0 && (
          <span className="text-xs text-muted-foreground">Você ainda não fez anotações pessoais em dispositivos.</span>
        )}
      </div>

      {lista.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">Nenhum dispositivo com anotação pessoal.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {lista.map((chapter) => (
            <ChapterCard
              key={chapter.id}
              chapter={chapter}
              notas={notas}
              versao={versao}
              numeros={numeros}
              contraparte={contraparte}
              sugeridos={sugeridos}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function contarNoEscopo(node: TreeNode): { aprovados: number; total: number } {
  let aprovados = 0;
  let total = 0;
  for (const child of node.children) {
    if (child.alteracao_tipo === "revogado") continue;
    total++;
    if (child.status === "aprovado") aprovados++;
    const sub = contarNoEscopo(child);
    aprovados += sub.aprovados;
    total += sub.total;
  }
  return { aprovados, total };
}

function ChapterCard({
  chapter,
  notas,
  versao,
  numeros,
  contraparte,
  sugeridos,
}: {
  chapter: TreeNode;
  notas: ReadonlySet<string>;
  versao: VersaoTrabalho;
  numeros: Record<string, string>;
  contraparte: Record<string, string>;
  sugeridos: Record<string, string>;
}) {
  const { aprovados, total } = contarNoEscopo(chapter);
  const revogado = chapter.alteracao_tipo === "revogado";
  return (
    <section className={cn("overflow-hidden rounded-xl border bg-card", revogado && "opacity-60")}>
      <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-4 py-2.5">
        <Link href={`/dispositivo/${chapter.id}`} className="min-w-0 transition-opacity hover:opacity-80">
          <h3 className={cn("truncate font-heading text-sm font-semibold leading-tight", revogado && "line-through")}>
            {rotuloDe(chapter, numeros)}
            {chapter.titulo ? ` — ${chapter.titulo}` : ""}
            {revogado && <span className="ml-2 text-xs font-normal text-muted-foreground">(revogado)</span>}
          </h3>
        </Link>
        <Badge variant="secondary" className="shrink-0">
          {aprovados}/{total} aprovados
        </Badge>
      </div>
      <ul className="divide-y divide-border">
        {chapter.children.map((child) => (
          <DeviceRow
            key={child.id}
            node={child}
            depth={0}
            notas={notas}
            versao={versao}
            numeros={numeros}
            contraparte={contraparte}
            sugeridos={sugeridos}
          />
        ))}
      </ul>
    </section>
  );
}

function DeviceRow({
  node,
  depth,
  notas,
  versao,
  numeros,
  contraparte,
  sugeridos,
}: {
  node: TreeNode;
  depth: number;
  notas: ReadonlySet<string>;
  versao: VersaoTrabalho;
  numeros: Record<string, string>;
  contraparte: Record<string, string>;
  sugeridos: Record<string, string>;
}) {
  const temNota = notas.has(node.id);
  const revogado = node.alteracao_tipo === "revogado";
  const numeroExibido = numeros[node.id];
  const numeroContraparte = contraparte[node.id];
  const numeroSugerido = sugeridos[node.id];
  const mostrarChip =
    numeroExibido && numeroContraparte && normalizarNumero(numeroExibido) !== normalizarNumero(numeroContraparte);
  const divergente =
    versao === "proposta" && numeroExibido && numeroSugerido && normalizarNumero(numeroExibido) !== normalizarNumero(numeroSugerido);
  return (
    <li>
      <Link
        href={`/dispositivo/${node.id}`}
        className="group flex items-center justify-between gap-2 px-4 py-2 transition-colors hover:bg-muted/50"
        style={{ paddingLeft: `${16 + depth * 22}px` }}
      >
        <span className="flex min-w-0 items-center gap-2.5 text-sm">
          <StatusDot status={node.status} />
          <span className={cn("font-medium transition-colors group-hover:text-primary", revogado && "text-muted-foreground line-through")}>
            {rotuloDe(node, numeros)}
          </span>
          {mostrarChip && (
            <span
              className="shrink-0 rounded-full border border-amber-300/70 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
              title={versao === "proposta" ? "Numeração no Estatuto vigente" : "Numeração na proposta"}
            >
              {versao === "proposta" ? `era ${numeroContraparte}` : `→ ${numeroContraparte}`}
            </span>
          )}
          {divergente && (
            <span
              className="shrink-0 rounded-full border border-red-300/70 bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
              title="A ordem atual da proposta sugeriria outro número — reordene em Renumeração para alinhar"
            >
              ordem: {numeroSugerido}
            </span>
          )}
          {node.titulo && <span className="truncate text-muted-foreground">— {node.titulo}</span>}
          {node.origem === "novo" && <NovoBadge />}
          {revogado && (
            <span className="shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">revogado</span>
          )}
          {temNota && <NotedBadge />}
        </span>
        <StatusBadge status={node.status} className="shrink-0" />
      </Link>
      {node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <DeviceRow
              key={child.id}
              node={child}
              depth={depth + 1}
              notas={notas}
              versao={versao}
              numeros={numeros}
              contraparte={contraparte}
              sugeridos={sugeridos}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
