import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CAMPO_LABELS } from "@/lib/referencias-core";
import type { ReferenciaAfetada } from "@/lib/referencias";

/** Lista global (server) das referências internas que precisam de revisão humana. */
export function ReferenciasGlobais({ itens }: { itens: ReferenciaAfetada[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Referências internas a atualizar ({itens.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {itens.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma menção a números de artigo foi afetada pela numeração da proposta.
          </p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              A atualização é sempre humana e confirmada no dispositivo (a lista aponta onde). &quot;Vigente → proposta&quot;
              são textos que citam a numeração do Estatuto registrado; &quot;documento → ordem atual&quot; são textos que já
              usam a numeração da proposta importada.
            </p>
            <ul className="divide-y">
              {itens.map((r, i) => (
                <li key={`${r.provisionId}-${r.campo}-${r.numeroAntigo}-${i}`} className="py-2">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Link href={`/dispositivo/${r.provisionId}`} className="font-medium text-primary hover:underline">
                      {r.provisionLabel}
                    </Link>
                    <Badge variant="outline" className="text-[10px]">
                      {CAMPO_LABELS[r.campo]}
                    </Badge>
                    <span>Art. {r.numeroAntigo}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-semibold">{r.alvoLabel}</span>
                    <span className="text-xs text-muted-foreground">
                      ({r.origem === "vigente" ? "vigente → proposta" : "documento → ordem atual"})
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">“…{r.trecho}…”</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
