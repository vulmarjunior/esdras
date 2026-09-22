"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SUGGESTION_COLORS } from "@/components/status-badge";
import { SUGGESTION_STATUS_LABELS } from "@/lib/labels";
import { createSuggestion, updateSuggestionStatus } from "@/app/actions/provision";
import { SubmitBtn } from "@/components/provision/submit-btn";
import type { Suggestion } from "@/lib/types";

export function SuggestionForm({ provisionId }: { provisionId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const [form, setForm] = useState({ texto: "", justificativa: "", ondeEsta: "" });

  async function submit() {
    setPending(true);
    const res = await createSuggestion(provisionId, form.texto, form.justificativa, form.ondeEsta);
    setPending(false);
    if (res.error) return toast.error(res.error);
    toast.success("Sugestão de redação registrada.");
    setForm({ texto: "", justificativa: "", ondeEsta: "" });
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Nova sugestão de redação
      </Button>
    );
  }
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Onde está (opcional)</label>
        <textarea rows={2} value={form.ondeEsta} onChange={(e) => setForm({ ...form, ondeEsta: e.target.value })} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Trecho atual que se pretende alterar..." />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Sugiro</label>
        <textarea rows={3} value={form.texto} onChange={(e) => setForm({ ...form, texto: e.target.value })} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Texto sugerido..." />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Justificativa</label>
        <textarea rows={2} value={form.justificativa} onChange={(e) => setForm({ ...form, justificativa: e.target.value })} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Por que sugerir esta alteração?" />
      </div>
      <div className="flex gap-2">
        <SubmitBtn label="Registrar sugestão de redação" pending={pending} onClick={submit} />
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </div>
  );
}

export function SuggestionItem({
  sug,
  canManage,
}: {
  sug: Suggestion;
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const statuses = ["aberta", "em_discussao", "aceita", "aceita_parcialmente", "rejeitada", "retirada"];

  async function go(status: string) {
    setPending(true);
    await updateSuggestionStatus(sug.id, status);
    setPending(false);
    router.refresh();
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          <span className="font-mono text-muted-foreground/70">#{sug.id}</span> — {sug.author_name} ·{" "}
          {new Date(sug.created_at + "Z").toLocaleString("pt-BR")}
        </span>
        <span
          className={cn(
            "inline-flex h-5 w-fit items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
            SUGGESTION_COLORS[sug.status] || "border-border bg-muted text-muted-foreground"
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full bg-current opacity-70")} />
          {SUGGESTION_STATUS_LABELS[sug.status] || sug.status}
        </span>
      </div>
      {sug.onde_esta && (
        <div className="mb-2 rounded-lg border border-red-200/60 bg-red-50/40 p-2.5 text-sm dark:border-red-800/60 dark:bg-red-950/20">
          <span className="font-semibold text-red-700 dark:text-red-300">Onde está:</span>{" "}
          <span className="text-muted-foreground line-through decoration-red-300/60">{sug.onde_esta}</span>
        </div>
      )}
      <div className="rounded-lg border border-emerald-200/60 bg-emerald-50/40 p-2.5 text-sm dark:border-emerald-800/60 dark:bg-emerald-950/20">
        <span className="font-semibold text-emerald-700 dark:text-emerald-300">Sugiro:</span>{" "}
        <span className="text-foreground">{sug.texto}</span>
      </div>
      {sug.justificativa && (
        <p className="mt-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Justificativa:</span> {sug.justificativa}
        </p>
      )}
      {canManage && (
        <div className="mt-3 flex flex-wrap gap-1 border-t pt-2.5">
          {statuses.map((s) => (
            <Button key={s} size="sm" variant={s === sug.status ? "default" : "outline"} disabled={pending} onClick={() => go(s)}>
              {SUGGESTION_STATUS_LABELS[s]}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
