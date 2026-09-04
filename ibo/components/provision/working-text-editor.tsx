"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateRedacao } from "@/app/actions/provision";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Sparkles, Check, X } from "lucide-react";
import { RichTextEditor } from "@/components/rich-text-editor";
import { RichTextContent } from "@/components/rich-text-content";
import { Markdown } from "@/components/markdown";
import { htmlToText, plainToHtml } from "@/lib/rich-text";

const AI_TOOLS = [
  { key: "gramatica", label: "Revisar gramática" },
  { key: "clareza", label: "Melhorar clareza" },
  { key: "estatutario", label: "Linguagem estatutária" },
  { key: "simplificar", label: "Simplificar redação" },
  { key: "comparar", label: "Comparar com vigente", needsComparar: true },
  { key: "valida_tecnica", label: "Checklist técnico (LC 95)" },
];

interface Props {
  provisionId: string;
  initialText: string;
  version: number;
  canEdit: boolean;
  compararTexto?: string;
}

export function WorkingTextEditor({ provisionId, initialText, version, canEdit, compararTexto }: Props) {
  const [text, setText] = useState(initialText);
  const [reason, setReason] = useState("");
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiTool, setAiTool] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);
  const router = useRouter();

  const plainText = htmlToText(text);

  async function runAi(toolKey: string) {
    setAiLoading(true);
    setAiTool(toolKey);
    try {
      const isChecklist = toolKey === "valida_tecnica";
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isChecklist
            ? { action: "valida_tecnica", texto: plainText, rotulo: "Redação de trabalho" }
            : {
                action: "editorial",
                tool: toolKey,
                text: plainText,
                comparar: toolKey === "comparar" ? htmlToText(compararTexto || "") : undefined,
              }
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro na IA");
      setAiResult(data.result);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao consultar a IA.");
    } finally {
      setAiLoading(false);
    }
  }

  async function save() {
    setSaving(true);
    setConflict(null);
    const res = await updateRedacao(provisionId, text, version, reason);
    setSaving(false);
    if (res.conflict) {
      setConflict(res.error || "Conflito de versão.");
      return;
    }
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(res.message || "Redação salva.");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {canEdit ? (
        <RichTextEditor
          value={text}
          onChange={setText}
          placeholder="Redação de trabalho ainda não definida."
        />
      ) : (
        <RichTextContent text={text} />
      )}

      {canEdit && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-violet-500" /> IA:
            </span>
            {AI_TOOLS.map((t) => (
              <Button
                key={t.key}
                type="button"
                variant="outline"
                size="sm"
                disabled={aiLoading || !plainText.trim() || (t.needsComparar && !htmlToText(compararTexto || "").trim())}
                onClick={() => runAi(t.key)}
              >
                {aiLoading && aiTool === t.key && <Loader2 className="h-3 w-3 animate-spin" />}
                {t.label}
              </Button>
            ))}
          </div>

          {aiResult && (
            <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-800 dark:bg-violet-950/30">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-violet-800 dark:text-violet-200">
                <Sparkles className="h-4 w-4" />
                {aiTool === "valida_tecnica"
                  ? "Checklist de técnica legislativa — gerado por IA, revisar antes de agir."
                  : "Sugestão gerada por IA — revisar antes de incorporar."}
              </p>
              <Markdown className="mb-3 rounded-lg bg-white/70 p-3 font-serif dark:bg-black/20">{aiResult}</Markdown>
              <div className="flex gap-2">
                {aiTool !== "valida_tecnica" && (
                  <Button type="button" size="sm" onClick={() => { setText(plainToHtml(aiResult)); setAiResult(null); }}>
                    <Check className="mr-1 h-4 w-4" /> Aplicar sugestão
                  </Button>
                )}
                <Button type="button" size="sm" variant="outline" onClick={() => setAiResult(null)}>
                  <X className="mr-1 h-4 w-4" /> Descartar
                </Button>
              </div>
            </div>
          )}

          {conflict && (
            <Alert variant="destructive">
              <AlertTitle>Conflito de versão</AlertTitle>
              <AlertDescription>{conflict}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Motivo da alteração (registrado no histórico)"
              className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none ring-ring transition-shadow focus:ring-2"
            />
            <Button type="button" onClick={save} disabled={saving || !plainText.trim()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar versão {version + 1}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Toda alteração cria uma nova versão. Versão atual: {version}.
          </p>
        </>
      )}
    </div>
  );
}