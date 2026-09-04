"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FieldHelper } from "@/components/field-helper";
import { ConfirmDialog, type ConfirmDialogState } from "@/components/confirm-dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ArrowDownUp, RotateCcw, TriangleAlert, Check, BadgeCheck } from "lucide-react";
import { applyRenumeracao } from "@/app/actions/renumeracao";
import { renumerar, parseNumeroArtigo, type ArtigoRenumeravel, type ReferenciaDetectada } from "@/lib/renumeracao-core";

interface Props {
  artigos: ArtigoRenumeravel[];
  referencias: ReferenciaDetectada[];
}

export function Simulator({ artigos, referencias }: Props) {
  const [order, setOrder] = useState<string[]>(artigos.map((a) => a.id));
  const [applyState, setApplyState] = useState<ConfirmDialogState | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  const artigosById = useMemo(() => new Map(artigos.map((a) => [a.id, a])), [artigos]);

  const numeros = useMemo(() => renumerar(order), [order]);

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

  const referenciasAfetadas = useMemo(() => {
    const numPorArtigo = new Map<number, string>();
    for (const a of artigos) {
      const n = parseNumeroArtigo(a.numeroAtual);
      if (n != null) numPorArtigo.set(n, a.id);
    }
    const out: { ref: ReferenciaDetectada; de: string; para: string }[] = [];
    for (const ref of referencias) {
      const id = numPorArtigo.get(ref.numero);
      if (!id) continue;
      const novo = numeros.get(id);
      if (novo && ref.numero !== parseInt(novo, 10)) {
        out.push({ ref, de: `Art. ${ref.numero}º`, para: `Art. ${novo}` });
      }
    }
    return out;
  }, [referencias, numeros, artigos]);

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

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
        <FieldHelper className="text-amber-800 dark:text-amber-200">
          Simulação apenas — <strong>nenhuma alteração é aplicada</strong> ao documento. Para cada artigo, escolha
          &quot;mover após&quot; para montar a ordem final; o sistema calcula a numeração nova e alerta as referências
          internas afetadas.
        </FieldHelper>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="outline" className="border-primary/40 text-primary">
          {order.length} artigos
        </Badge>
        <Badge variant={changed.length ? "destructive" : "outline"} className={changed.length ? "" : "text-muted-foreground"}>
          {changed.length} artigo(s) mudariam de número
        </Badge>
        <Badge variant={referenciasAfetadas.length ? "destructive" : "outline"} className={referenciasAfetadas.length ? "" : "text-muted-foreground"}>
          {referenciasAfetadas.length} referência(s) interna(s) afetada(s)
        </Badge>
        <Button size="sm" variant="outline" onClick={() => setOrder(artigos.map((a) => a.id))}>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Restaurar ordem
        </Button>
        <Button
          size="sm"
          variant="default"
          className="bg-primary text-primary-foreground"
          onClick={() =>
            setApplyState({
              title: "Aplicar numeração final",
              description:
                "Grava os números dos artigos conforme a ordem ATUAL da árvore, com auditoria. A reordenação física entre capítulos ainda é etapa separada. Referências nos textos NÃO são reescritas — apenas alertadas. Continuar?",
              confirmLabel: "Aplicar numeração",
            })
          }
        >
          <BadgeCheck className="mr-1.5 h-4 w-4" /> Aplicar numeração
        </Button>
      </div>

      <ConfirmDialog state={applyState} pending={pending} onConfirm={confirmApply} onClose={() => setApplyState(null)} />

      <div className="overflow-x-auto rounded-xl border bg-card">
        <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 border-b bg-muted/40 px-4 py-2 text-xs font-semibold text-muted-foreground">
          <span>Artigo</span>
          <span>Capítulo</span>
          <span>Nº atual</span>
          <span>Nº proposto</span>
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

      <section>
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
          <Check className="h-4 w-4 text-emerald-600" /> Referências internas afetadas
        </h3>
        {referenciasAfetadas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma referência interna aos números que mudariam foi encontrada nos textos.
          </p>
        ) : (
          <ul className="space-y-2">
            {referenciasAfetadas.map(({ ref, de, para }, i) => (
              <li key={i} className="rounded-lg border border-amber-200 bg-amber-50/40 p-3 dark:border-amber-800 dark:bg-amber-950/20">
                <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                  {ref.provisionLabel} — {ref.campo}: referência a <strong>{de}</strong> (passaria a <strong>{para}</strong>)
                </p>
                <p className="mt-1 text-sm text-muted-foreground">&quot;…{ref.excerpt}…&quot;</p>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Detecção heurística de menções a &quot;Art./art./artigo&quot; nos textos. Referências a números que não
          correspondem a artigos do estatuto (ex.: leis externas) não são listadas. A decisão final é sempre humana.
        </p>
      </section>
    </div>
  );
}