"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { Markdown } from "@/components/markdown";
import type { SecaoManual } from "@/lib/manual";

export function ManualView({ secoes }: { secoes: SecaoManual[] }) {
  const [secaoId, setSecaoId] = useState<string>(secoes[0]?.id ?? "");
  const [busca, setBusca] = useState("");

  const lista = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return secoes;
    return secoes.filter((s) => `${s.titulo} ${s.markdown}`.toLowerCase().includes(t));
  }, [secoes, busca]);

  const secao = secoes.find((s) => s.id === secaoId) ?? secoes[0];

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="order-2 space-y-3 lg:order-1">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar no manual..."
            className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none ring-ring transition-shadow focus:ring-2"
          />
        </div>

        <details className="rounded-xl border bg-card lg:hidden">
          <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium">
            {secao.titulo}
          </summary>
          <div className="max-h-[50vh] overflow-auto border-t p-2">
            <SectionList secoes={lista} secaoId={secaoId} onSelect={setSecaoId} />
          </div>
        </details>

        <div className="hidden max-h-[70vh] overflow-auto rounded-xl border bg-card p-2 lg:block">
          <SectionList secoes={lista} secaoId={secaoId} onSelect={setSecaoId} />
        </div>
      </aside>

      <div className="order-1 min-w-0 lg:order-2">
        <article className="rounded-xl border bg-card p-5 sm:p-6">
          <h2 className="mb-4 border-b pb-3 font-heading text-lg font-semibold tracking-tight">{secao.titulo}</h2>
          <Markdown>{secao.markdown}</Markdown>
        </article>
      </div>
    </div>
  );
}

function SectionList({
  secoes,
  secaoId,
  onSelect,
}: {
  secoes: SecaoManual[];
  secaoId: string;
  onSelect: (id: string) => void;
}) {
  if (secoes.length === 0) {
    return <p className="px-3 py-2 text-sm italic text-muted-foreground">Nenhuma seção encontrada.</p>;
  }
  return (
    <ul className="space-y-0.5">
      {secoes.map((s) => (
        <li key={s.id}>
          <button
            type="button"
            onClick={() => onSelect(s.id)}
            className={cn(
              "w-full rounded-md px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-muted",
              s.id === secaoId ? "bg-muted text-foreground" : "text-muted-foreground"
            )}
          >
            {s.titulo}
          </button>
        </li>
      ))}
    </ul>
  );
}