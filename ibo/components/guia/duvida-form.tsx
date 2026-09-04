"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, TriangleAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldHelper } from "@/components/field-helper";

export function DuvidaForm() {
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
        body: JSON.stringify({ action: "duvida", pergunta }),
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tirar dúvidas de redação</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <textarea
          rows={3}
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          placeholder="Ex.: quando usar 'Parágrafo único' em vez de § 1º? Posso usar 'bem como' em uma enumeração?"
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-ring transition-shadow focus:ring-2"
        />
        <div className="flex items-center justify-between gap-2">
          <FieldHelper>IA responde com base na LC 95/1998 e no Manual de Redação — revisar antes de usar.</FieldHelper>
          <Button
            type="button"
            onClick={perguntar}
            disabled={loading || !pergunta.trim()}
            className="bg-violet-600 text-white hover:bg-violet-700"
          >
            {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
            {loading ? "Consultando..." : "Perguntar"}
          </Button>
        </div>
        {resposta && (
          <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-800 dark:bg-violet-950/30">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-violet-800 dark:text-violet-200">
              <TriangleAlert className="h-4 w-4" /> Resposta gerada por IA — revisar antes de usar.
            </p>
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{resposta}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}