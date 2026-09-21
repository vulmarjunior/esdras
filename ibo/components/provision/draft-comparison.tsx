"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FieldHelper } from "@/components/field-helper";
import { HistoricalTextEditor } from "@/components/provision/historical-text-editor";
import { WorkingTextEditor } from "@/components/provision/working-text-editor";
import { ComparedText } from "@/components/review/compared-text";
import { diffWords, normalizeText } from "@/lib/review-core";
import { cn } from "@/lib/utils";

/**
 * Rascunho comparativo do dispositivo: texto vigente, referência (proposta
 * inicial) e proposta (redação de trabalho) lado a lado, com destaque opcional
 * das diferenças entre o vigente e a redação atual.
 */
export function DraftComparison({
  id,
  textoVigente,
  propostaInicial,
  redacaoTrabalho,
  versao,
  canEditWork,
  canFixExtraction,
}: {
  id: string;
  textoVigente: string;
  propostaInicial: string;
  redacaoTrabalho: string;
  versao: number;
  canEditWork: boolean;
  canFixExtraction: boolean;
}) {
  const [destacar, setDestacar] = useState(false);

  const diff = useMemo(() => {
    if (!destacar) return null;
    const antes = normalizeText(textoVigente);
    const depois = normalizeText(redacaoTrabalho || propostaInicial || textoVigente);
    if (antes === depois) return null;
    const [beforeParts, afterParts] = diffWords(antes, depois);
    return { beforeParts, afterParts, igual: false };
  }, [destacar, textoVigente, propostaInicial, redacaoTrabalho]);

  const semDiferencas = destacar && !diff;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <ArrowLeftRight className="h-4 w-4 text-primary" />
          Rascunho comparativo
          <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
            vigente · referência · proposta
          </Badge>
        </p>
        <button
          type="button"
          onClick={() => setDestacar((v) => !v)}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
            destacar
              ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
              : "border-border bg-background text-muted-foreground hover:bg-muted"
          )}
        >
          Destacar diferenças
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-slate-300/70 bg-slate-100/50 dark:border-slate-700/60 dark:bg-slate-900/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
              Texto vigente
              <Badge variant="outline" className="text-[10px] text-slate-500">
                documento histórico
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <HistoricalTextEditor
              provisionId={id}
              campo="texto_vigente"
              texto={textoVigente}
              canEdit={canFixExtraction}
              emptyLabel="Não existe no estatuto registrado."
            />
          </CardContent>
        </Card>

        <Card className="border-amber-300/70 bg-amber-50/40 dark:border-amber-700/60 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
              Referência (proposta inicial)
              <Badge variant="outline" className="border-amber-200 bg-amber-100/60 text-[10px] text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                ponto de partida
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <HistoricalTextEditor
              provisionId={id}
              campo="proposta_inicial"
              texto={propostaInicial}
              canEdit={canFixExtraction}
              emptyLabel="Sem alteração proposta (manter redação)."
            />
          </CardContent>
        </Card>

        <Card className="border-blue-300/70 bg-blue-50/40 dark:border-blue-700/60 dark:bg-blue-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
              Proposta (redação de trabalho)
              <Badge variant="outline" className="border-blue-200 bg-blue-100/60 text-[10px] text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                versão da comissão
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <WorkingTextEditor
              provisionId={id}
              initialText={redacaoTrabalho}
              version={versao}
              canEdit={canEditWork}
              compararTexto={textoVigente}
            />
          </CardContent>
        </Card>
      </div>

      {destacar && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Diferenças (vigente → redação atual)</CardTitle>
          </CardHeader>
          <CardContent>
            {semDiferencas ? (
              <p className="text-sm italic text-muted-foreground">Sem diferenças de texto em relação ao vigente.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="min-w-0 space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vigente (retirado)</p>
                  <ComparedText parts={diff!.beforeParts} side="before" highlight />
                </div>
                <div className="min-w-0 space-y-1 border-t pt-3 md:border-t-0 md:border-l md:pt-0 md:pl-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Redação atual (acrescentado)</p>
                  <ComparedText parts={diff!.afterParts} side="after" highlight />
                </div>
              </div>
            )}
            <FieldHelper>
              Comparação por palavras entre o texto vigente e a redação de trabalho (ou a proposta inicial, se a redação
              estiver vazia). Apenas leitura — não altera nada.
            </FieldHelper>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
