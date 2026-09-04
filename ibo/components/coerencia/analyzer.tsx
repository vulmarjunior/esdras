"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Markdown } from "@/components/markdown";

export function CoherenceAnalyzer({ textos }: { textos: { id: string; label: string; texto: string }[] }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function analisar() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "coerencia", textos: textos.map((t) => `${t.label}: ${t.texto}`) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro na IA");
      setResult(data.result);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao consultar a IA.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={analisar} disabled={loading || textos.length === 0} className="bg-violet-600 text-white hover:bg-violet-700">
          {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
          {loading ? "Analisando..." : "Analisar coerência"}
        </Button>
        <span className="text-xs text-muted-foreground">
          Analisa {textos.length} dispositivo(s) aprovado(s). Sempre como alerta — nenhuma alteração automática.
        </span>
      </div>

      {result && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-800 dark:bg-amber-950/30">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-800 dark:text-amber-200">
            <TriangleAlert className="h-4 w-4" /> Relatório de coerência — gerado por IA, revisar antes de agir.
          </p>
          <Markdown>{result}</Markdown>
        </div>
      )}
    </div>
  );
}