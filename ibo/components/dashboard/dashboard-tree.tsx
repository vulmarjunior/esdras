"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { StatusDot, StatusBadge, NovoBadge, NotedBadge } from "@/components/status-badge";
import { provisionLabel } from "@/lib/provision-label";
import { filtrarPorAnotacao } from "@/lib/dashboard-filter";
import type { TreeNode } from "@/lib/data";
import { StickyNote } from "lucide-react";

/**
 * Árvore do painel com filtro "Somente com minhas anotações".
 * As anotações pessoais são privadas: apenas o próprio usuário vê as marcas.
 */
export function DashboardTree({ chapters, notedIds }: { chapters: TreeNode[]; notedIds: string[] }) {
  const [soNotadas, setSoNotadas] = useState(false);
  const notas = useMemo(() => new Set(notedIds), [notedIds]);

  const lista = useMemo(() => {
    if (!soNotadas) return chapters;
    return chapters
      .map((c) => filtrarPorAnotacao(c, notas))
      .filter((c): c is TreeNode => c !== null);
  }, [soNotadas, chapters, notas]);

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
        {notedIds.length === 0 && (
          <span className="text-xs text-muted-foreground">Você ainda não fez anotações pessoais em dispositivos.</span>
        )}
      </div>

      {lista.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">Nenhum dispositivo com anotação pessoal.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {lista.map((chapter) => (
            <ChapterCard key={chapter.id} chapter={chapter} notas={notas} />
          ))}
        </div>
      )}
    </div>
  );
}

function ChapterCard({ chapter, notas }: { chapter: TreeNode; notas: ReadonlySet<string> }) {
  const approved = chapter.children.filter((c) => c.status === "aprovado").length;
  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-4 py-2.5">
        <Link href={`/dispositivo/${chapter.id}`} className="min-w-0 transition-opacity hover:opacity-80">
          <h3 className="truncate font-heading text-sm font-semibold leading-tight">
            {provisionLabel(chapter)}
            {chapter.titulo ? ` — ${chapter.titulo}` : ""}
          </h3>
        </Link>
        <Badge variant="secondary" className="shrink-0">
          {approved}/{chapter.child_count} aprovados
        </Badge>
      </div>
      <ul className="divide-y divide-border">
        {chapter.children.map((child) => (
          <DeviceRow key={child.id} node={child} depth={0} notas={notas} />
        ))}
      </ul>
    </section>
  );
}

function DeviceRow({ node, depth, notas }: { node: TreeNode; depth: number; notas: ReadonlySet<string> }) {
  const label = provisionLabel(node);
  const temNota = notas.has(node.id);
  return (
    <li>
      <Link
        href={`/dispositivo/${node.id}`}
        className="group flex items-center justify-between gap-2 px-4 py-2 transition-colors hover:bg-muted/50"
        style={{ paddingLeft: `${16 + depth * 22}px` }}
      >
        <span className="flex min-w-0 items-center gap-2.5 text-sm">
          <StatusDot status={node.status} />
          <span className="font-medium transition-colors group-hover:text-primary">{label}</span>
          {node.titulo && <span className="truncate text-muted-foreground">— {node.titulo}</span>}
          {node.origem === "novo" && <NovoBadge />}
          {temNota && <NotedBadge />}
        </span>
        <StatusBadge status={node.status} className="shrink-0" />
      </Link>
      {node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <DeviceRow key={child.id} node={child} depth={depth + 1} notas={notas} />
          ))}
        </ul>
      )}
    </li>
  );
}