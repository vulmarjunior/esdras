"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, FileDown, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { ComparedText } from "@/components/review/compared-text";
import { ALTERACAO_TYPE_LABELS } from "@/lib/labels";
import type { LinhaComparativo } from "@/lib/comparativo-core";
import { cn } from "@/lib/utils";

const changeColors: Record<string, string> = {
  "Não alterado": "border-border bg-muted text-muted-foreground",
  Alterado: "border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  Novo: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  Revogado: "border-red-300 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-200",
};

function classeMudanca(linha: LinhaComparativo): keyof typeof changeColors {
  if (linha.revogado) return "Revogado";
  if (!linha.labelVigente) return "Novo";
  if (!linha.alterado) return "Não alterado";
  return "Alterado";
}

/** Quadro comparativo final: vigente × nova redação, artigo por artigo. */
export function QuadroComparativo({ linhas }: { linhas: LinhaComparativo[] }) {
  const [capitulo, setCapitulo] = useState("");
  const [busca, setBusca] = useState("");
  const [soAlterados, setSoAlterados] = useState(true);
  const [soAprovados, setSoAprovados] = useState(false);
  const [comJustificativa, setComJustificativa] = useState(false);
  const [ocultarRevogados, setOcultarRevogados] = useState(false);

  const capitulos = useMemo(() => [...new Set(linhas.map((l) => l.capitulo).filter(Boolean))], [linhas]);

  const filtradas = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return linhas.filter((l) => {
      if (capitulo && l.capitulo !== capitulo) return false;
      if (soAlterados && !l.alterado && !l.revogado) return false;
      if (soAprovados && l.status !== "aprovado") return false;
      if (comJustificativa && !l.justificativa) return false;
      if (ocultarRevogados && l.revogado) return false;
      if (t && !`${l.label} ${l.labelVigente ?? ""} ${l.titulo} ${l.before} ${l.after} ${l.justificativa}`.toLowerCase().includes(t)) return false;
      return true;
    });
  }, [linhas, capitulo, busca, soAlterados, soAprovados, comJustificativa, ocultarRevogados]);

  const alterados = linhas.filter((l) => l.alterado && !l.revogado).length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-4">
        <label className="space-y-1 text-sm">
          Buscar
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Ex.: assembleia ou Art. 12"
              className="h-10 w-full rounded-md border bg-background pl-9 pr-3"
            />
          </div>
        </label>
        <label className="space-y-1 text-sm">
          Capítulo
          <select value={capitulo} onChange={(e) => setCapitulo(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3">
            <option value="">Todos os capítulos</option>
            {capitulos.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col justify-end gap-1.5 text-sm md:col-span-2 md:flex-row md:items-end md:gap-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={soAlterados} onChange={(e) => setSoAlterados(e.target.checked)} />
            Somente alterados
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={soAprovados} onChange={(e) => setSoAprovados(e.target.checked)} />
            Somente redações concluídas
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={comJustificativa} onChange={(e) => setComJustificativa(e.target.checked)} />
            Com justificativa
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={ocultarRevogados} onChange={(e) => setOcultarRevogados(e.target.checked)} />
            Ocultar revogados
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Badge variant="outline" className="border-primary/40 text-primary">
          {linhas.length} artigos
        </Badge>
        <Badge variant="outline">{alterados} com alteração de texto</Badge>
        <span className="text-xs text-muted-foreground">{filtradas.length} exibido(s)</span>
        <a
          href="/api/export?type=comparativo"
          className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors hover:bg-muted"
        >
          <FileDown className="h-3.5 w-3.5" /> Baixar .txt
        </a>
      </div>

      {filtradas.length === 0 ? (
        <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          Nenhum artigo encontrado com os filtros atuais.
        </p>
      ) : (
        <div className="space-y-4">
          {filtradas.map((l) => {
            const mudanca = classeMudanca(l);
            return (
              <section key={l.id} className="overflow-hidden rounded-xl border bg-card">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/40 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                      <ArrowLeftRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="text-muted-foreground">{l.labelVigente ?? "sem correspondente no vigente"}</span>
                      <span className="text-muted-foreground">→</span>
                      <span>{l.label}</span>
                      {l.titulo ? <span className="font-normal text-muted-foreground">— {l.titulo}</span> : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {l.capitulo || "Sem capítulo"}
                      {l.origem === "novo" ? " · novo dispositivo" : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", changeColors[mudanca])}>{mudanca}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {ALTERACAO_TYPE_LABELS[l.alteracaoTipo] || l.alteracaoTipo}
                    </Badge>
                    <StatusBadge status={l.status} />
                    <Link href={`/dispositivo/${l.id}`} className="text-xs font-medium text-primary underline underline-offset-4">
                      Abrir
                    </Link>
                  </div>
                </div>
                <div className="grid md:grid-cols-2">
                  <div className="min-w-0 space-y-2 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Redação vigente</p>
                    {l.before ? (
                      <ComparedText parts={l.beforeParts} side="before" highlight={mudanca === "Alterado"} />
                    ) : (
                      <p className="text-sm italic text-muted-foreground">Sem texto vigente cadastrado.</p>
                    )}
                  </div>
                  <div className="min-w-0 space-y-2 border-t p-4 md:border-t-0 md:border-l">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nova redação</p>
                    {l.revogado ? (
                      <p className="text-sm italic text-muted-foreground">Dispositivo revogado na proposta.</p>
                    ) : l.after ? (
                      <ComparedText parts={l.afterParts} side="after" highlight={mudanca === "Alterado"} />
                    ) : (
                      <p className="text-sm italic text-muted-foreground">Redação ainda não cadastrada.</p>
                    )}
                    {l.justificativa && (
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Justificativa</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{l.justificativa}</p>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
