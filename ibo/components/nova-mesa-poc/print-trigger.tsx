"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function PrintBar({ auto, backHref }: { auto: boolean; backHref: string }) {
  useEffect(() => {
    if (!auto) return;
    const timer = setTimeout(() => window.print(), 600);
    return () => clearTimeout(timer);
  }, [auto]);
  return (
    <div className="mx-auto mb-4 flex w-full max-w-[46rem] flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2 print:hidden">
      <p className="text-xs text-muted-foreground">Ajuste as opções na Mesa ou use os controles do navegador para salvar em PDF.</p>
      <div className="flex gap-2">
        <button type="button" className="rounded border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-semibold" onClick={() => window.print()}>
          Imprimir / Salvar PDF
        </button>
        <Link href={backHref} className="rounded border px-3 py-2 text-sm">
          Voltar
        </Link>
      </div>
    </div>
  );
}
