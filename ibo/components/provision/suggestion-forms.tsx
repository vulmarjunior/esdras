"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SUGGESTION_COLORS } from "@/components/status-badge";
import { SUGGESTION_STATUS_LABELS } from "@/lib/labels";
import { createSuggestion, updateSuggestionStatus, vote, removeVote } from "@/app/actions/provision";
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
    toast.success("Sugestão registrada.");
    setForm({ texto: "", justificativa: "", ondeEsta: "" });
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Nova sugestão
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
        <SubmitBtn label="Registrar sugestão" pending={pending} onClick={submit} />
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </div>
  );
}

export function SuggestionItem({
  sug,
  canManage,
  votes,
  myVote,
}: {
  sug: Suggestion;
  canManage: boolean;
  votes?: Record<string, number>;
  myVote?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const statuses = ["aberta", "em_discussao", "aceita", "aceita_parcialmente", "rejeitada", "retirada"];
  const OPINIONS = [
    { key: "concordo", label: "Concordo", active: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300", dot: "bg-emerald-500" },
    { key: "discordo", label: "Discordo", active: "border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950/40 dark:text-red-300", dot: "bg-red-500" },
    { key: "ressalva", label: "Ressalva", active: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300", dot: "bg-amber-500" },
  ];

  async function go(status: string) {
    setPending(true);
    await updateSuggestionStatus(sug.id, status);
    setPending(false);
    router.refresh();
  }

  async function voteSug(opinion: string) {
    setPending(true);
    const res = await vote(null, opinion, sug.id);
    setPending(false);
    if (res.error) return toast.error(res.error);
    toast.success("Voto registrado na sugestão.");
    router.refresh();
  }

  async function removeSugVote() {
    setPending(true);
    await removeVote(null, sug.id);
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
      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t pt-2.5">
        {OPINIONS.map((o) => {
          const isMine = myVote === o.key;
          return (
            <button
              key={o.key}
              type="button"
              disabled={pending}
              onClick={() => (isMine ? removeSugVote() : voteSug(o.key))}
              title={isMine ? "Clique para remover seu voto" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-60",
                isMine ? o.active : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", o.dot)} />
              {o.label}
              {votes?.[o.key] ? ` ${votes[o.key]}` : ""}
            </button>
          );
        })}
        <span className="text-[11px] text-muted-foreground">consulta aos membros — caráter consultivo</span>
      </div>
    </div>
  );
}