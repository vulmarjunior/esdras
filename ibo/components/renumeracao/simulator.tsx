"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FieldHelper } from "@/components/field-helper";
import { ConfirmDialog, type ConfirmDialogState } from "@/components/confirm-dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ArrowDownUp, RotateCcw, TriangleAlert, BadgeCheck } from "lucide-react";
import { applyRenumeracao, ordenarPorNumeroDocumentoAction } from "@/app/actions/renumeracao";
import { renumerar, parseNumeroArtigo, type ArtigoRenumeravel } from "@/lib/renumeracao-core";

export interface CapituloNumeravel {
  id: string;
  label: string;
  armazenado: string | null;
  derivado: string;
  mudou: boolean;
}

interface Props {
  artigos: ArtigoRenumeravel[];
  capitulos: CapituloNumeravel[];
}

export function Simulator({ artigos, capitulos }: Props) {
  const [order, setOrder] = useState<string[]>(artigos.map((a) => a.id));
  const [applyState, setApplyState] = useState<ConfirmDialogState | null>(null);
  const [ordenarState, setOrdenarState] = useState<ConfirmDialogState | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  const artigosById = useMemo(() => new Map(artigos.map((a) => [a.id, a])), [artigos]);

  const numeros = useMemo(() => renumerar(order), [order]);
  const capitulosMudados = useMemo(() => capitulos.filter((c) => c.mudou).length, [capitulos]);

  const changed = useMemo(() => {
    const list: { artigo: ArtigoRenumeravel; atual: string | null; novo: string }[] = [];
    for (const id of order) {
      const a = artigosById.get(id)!;
      const novo = numeros.get(id)!;
      if (parseNumeroArtigo(a.numeroAtual) !== parseInt(novo, 10)) {
        list.push({ artigo: a, atual: a.numeroAtual, novo });
      }
    }
    return list;
  }, [order, numeros, artigosById]);

  function moveAfter(id: string, afterId: string | null) {
    const list = order.filter((x) => x !== id);
    if (afterId == null) {
      list.unshift(id);
    } else {
      const idx = list.indexOf(afterId);
      list.splice(idx + 1, 0, id);
    }
    setOrder(list);
  }

  async function confirmApply() {
    setPending(true);
    const res = await applyRenumeracao();
    setPending(false);
    setApplyState(null);
    if (res.error) return toast.error(res.error);
    toast.success(res.message || "Renumeração aplicada.");
    router.refresh();
  }

  async function confirmOrdenar() {
    setPending(true);
    const res = await ordenarPorNumeroDocumentoAction();
    setPending(false);
    setOrdenarState(null);
    if (res.error) return toast.error(res.error);
    toast.success(res.message || "Ordem atualizada pela numeração do documento.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
        <FieldHelper className="text-amber-800 dark:text-amber-200">
          <strong>Documento original</strong> é a numeração gravada na importação da proposta; <strong>proposta (ordem
          atual)</strong> é a numeração derivada da posição no sistema. Se a ordem ainda não refletir o documento, use
          &quot;Ordenar pela numeração do documento&quot; (reordena dentro de cada capítulo). A simulação não altera nada
          — &quot;Aplicar numeração&quot; grava a numeração de trabalho (artigos e capítulos) e cria pendências de revisão
          para artigos com redação concluída que mudarem de número.
        </FieldHelper>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="outline" className="border-primary/40 text-primary">
          {order.length} artigos · {capitulos.length} capítulos
        </Badge>
        <Badge
          variant={changed.length + capitulosMudados ? "destructive" : "outline"}
          className={changed.length + capitulosMudados ? "" : "text-muted-foreground"}
        >
          {changed.length} artigo(s) e {capitulosMudados} capítulo(s) mudariam de número
        </Badge>
        <Button size="sm" variant="outline" onClick={() => setOrder(artigos.map((a) => a.id))}>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Restaurar ordem
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            setOrdenarState({
              title: "Ordenar pela numeração do documento",
              description:
                "Reordena os artigos de cada capítulo pela numeração do documento original da proposta (empates mantêm a ordem atual). Não cruza capítulos, não altera textos e não toca na estrutura vigente. A ordem é gravada com auditoria.",
              confirmLabel: "Ordenar pela numeração",
            })
          }
        >
          <ArrowDownUp className="mr-1.5 h-3.5 w-3.5" /> Ordenar pela numeração do documento
        </Button>
        <Button
          size="sm"
          variant="default"
          className="bg-primary text-primary-foreground"
          onClick={() =>
            setApplyState({
              title: "Aplicar numeração final",
              description:
                "Grava os números dos artigos conforme a ordem ATUAL da estrutura proposta, com auditoria. A estrutura vigente permanece intacta. Referências nos textos NÃO são reescritas — apenas alertadas. Continuar?",
              confirmLabel: "Aplicar numeração",
            })
          }
        >
          <BadgeCheck className="mr-1.5 h-4 w-4" /> Aplicar numeração
        </Button>
      </div>

      <ConfirmDialog state={applyState} pending={pending} onConfirm={confirmApply} onClose={() => setApplyState(null)} />
      <ConfirmDialog state={ordenarState} pending={pending} onConfirm={confirmOrdenar} onClose={() => setOrdenarState(null)} />

      <div className="overflow-x-auto rounded-xl border bg-card">
        <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 border-b bg-muted/40 px-4 py-2 text-xs font-semibold text-muted-foreground">
          <span>Artigo</span>
          <span>Capítulo</span>
          <span>Documento original</span>
          <span>Proposta (ordem atual)</span>
        </div>
        {order.map((id, idx) => {
          const a = artigosById.get(id)!;
          const novo = numeros.get(id)!;
          const mudou = parseNumeroArtigo(a.numeroAtual) !== parseInt(novo, 10);
          return (
            <div key={id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 border-b px-4 py-2 last:border-0">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-muted-foreground/60">{idx + 1}.</span>
                  <span className="text-sm font-medium">{a.label}</span>
                  {mudou && <TriangleAlert className="h-3.5 w-3.5 text-amber-500" />}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <ArrowDownUp className="h-3.5 w-3.5 text-muted-foreground/50" />
                  <select
                    value=""
                    onChange={(e) => moveAfter(id, e.target.value || null)}
                    className="h-7 rounded-md border bg-background px-1.5 text-xs text-muted-foreground"
                  >
                    <option value="">Mover após...</option>
                    <option value="">— início do documento —</option>
                    {order
                      .filter((x) => x !== id)
                      .map((x) => (
                        <option key={x} value={x}>
                          {artigosById.get(x)!.label}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">{a.chapter}</span>
              <span className="text-sm tabular-nums">{a.numeroAtual || "—"}</span>
              <span>
                <Badge variant={mudou ? "default" : "outline"} className={cn(mudou && "bg-primary text-primary-foreground")}>
                  {novo}
                </Badge>
              </span>
            </div>
          );
        })}
      </div>

      <section>
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
          <ArrowDownUp className="h-4 w-4 text-muted-foreground" /> Capítulos
        </h3>
        <div className="overflow-x-auto rounded-xl border bg-card">
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 border-b bg-muted/40 px-4 py-2 text-xs font-semibold text-muted-foreground">
            <span>Capítulo (ordem atual)</span>
            <span>Documento original</span>
            <span>Proposta (ordem atual)</span>
          </div>
          {capitulos.map((c) => (
            <div key={c.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 border-b px-4 py-2 text-sm last:border-0">
              <span className="flex items-center gap-1.5">
                {c.label}
                {c.mudou && <TriangleAlert className="h-3.5 w-3.5 text-amber-500" />}
              </span>
              <span className="text-muted-foreground">{c.armazenado || "—"}</span>
              <Badge variant={c.mudou ? "default" : "outline"} className={cn(c.mudou && "bg-primary text-primary-foreground")}>
                {c.derivado}
              </Badge>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Capítulos são renumerados em romanos na ordem atual; capítulos revogados não ocupam número.
        </p>
      </section>

      {changed.length > 0 && (
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <TriangleAlert className="h-4 w-4 text-amber-500" /> Artigos renumerados
          </h3>
          <ul className="space-y-1.5">
            {changed.map(({ artigo, atual, novo }) => (
              <li key={artigo.id} className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                <span className="font-medium">{artigo.label}</span>
                <span className="text-muted-foreground line-through">{atual || "NOVO"}</span>
                <span className="text-muted-foreground">→</span>
                <span className="font-semibold text-primary">{novo}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

    </div>
  );
}
