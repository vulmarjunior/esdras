"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, TriangleAlert } from "lucide-react";
import { Markdown } from "@/components/markdown";

export function HelpAssistant() {
  const [pergunta, setPergunta] = useState("");
  const [loading, setLoading] = useState(false);
  const [resposta, setResposta] = useState<string | null>(null);

  async function perguntar() {
    if (!pergunta.trim()) return toast.error("Digite sua dúvida.");
    setLoading(true);
    setResposta(null);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ajuda", pergunta }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro na IA");
      setResposta(data.result);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao consultar a IA.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <textarea
        rows={2}
        value={pergunta}
        onChange={(e) => setPergunta(e.target.value)}
        placeholder="Ex.: como aprovo um artigo? onde vejo o estatuto consolidado?"
        className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-ring transition-shadow focus:ring-2"
      />
      <Button
        type="button"
        size="sm"
        onClick={perguntar}
        disabled={loading || !pergunta.trim()}
        className="w-full bg-violet-600 text-white hover:bg-violet-700"
      >
        {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
        {loading ? "Consultando..." : "Tirar dúvida"}
      </Button>
      {resposta && (
        <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3 dark:border-violet-800 dark:bg-violet-950/30">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-violet-800 dark:text-violet-200">
            <TriangleAlert className="h-3.5 w-3.5" /> Resposta gerada por IA — revisar antes de usar.
          </p>
          <Markdown>{resposta}</Markdown>
        </div>
      )}
    </div>
  );
}