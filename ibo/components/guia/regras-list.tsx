"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RegraRef, FonteRef } from "@/lib/legal-refs";

const FONTE_COLORS: Record<FonteRef, string> = {
  lc95: "border-blue-200 bg-blue-50/40 dark:border-blue-800 dark:bg-blue-950/20",
  mrpr: "border-emerald-200 bg-emerald-50/40 dark:border-emerald-800 dark:bg-emerald-950/20",
};

export function RegrasList({
  regras,
  fontes,
}: {
  regras: RegraRef[];
  fontes: Record<FonteRef, string>;
}) {
  const [termo, setTermo] = useState("");
  const t = termo.trim().toLowerCase();
  const filtradas = t
    ? regras.filter((r) => `${r.regra} ${r.secao} ${fontes[r.fonte]}`.toLowerCase().includes(t))
    : regras;
  const fontesList = Object.keys(fontes) as FonteRef[];

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">Regras de referência</CardTitle>
        <input
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder="Buscar regra..."
          className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none ring-ring transition-shadow focus:ring-2 sm:w-64"
        />
      </CardHeader>
      <CardContent className="space-y-5">
        {fontesList.map((fonte) => {
          const itens = filtradas.filter((r) => r.fonte === fonte);
          return (
            <div key={fonte}>
              <h3 className="mb-2 text-sm font-semibold">{fontes[fonte]}</h3>
              {itens.length === 0 ? (
                <p className="text-sm italic text-muted-foreground">Nenhuma regra encontrada para este filtro.</p>
              ) : (
                <ul className={`space-y-2 rounded-lg border p-3 ${FONTE_COLORS[fonte]}`}>
                  {itens.map((r) => (
                    <li key={r.id} className="flex items-start gap-2 text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                      <span className="text-muted-foreground">
                        <span className="font-semibold text-foreground">{r.secao}: </span>
                        {r.regra}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}