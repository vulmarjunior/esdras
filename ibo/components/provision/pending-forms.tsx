"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PENDING_CATEGORY_LABELS } from "@/lib/labels";
import { createPendingIssue, resolvePending } from "@/app/actions/provision";
import { SubmitBtn } from "@/components/provision/submit-btn";
import type { PendingIssue } from "@/lib/types";

export function PendingForm({ provisionId }: { provisionId: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ categoria: "juridica", descricao: "" });
  const [pending, setPending] = useState(false);
  const router = useRouter();
  async function submit() {
    setPending(true);
    const res = await createPendingIssue(provisionId, form.categoria, form.descricao);
    setPending(false);
    if (res.error) return toast.error(res.error);
    setForm({ categoria: "juridica", descricao: "" });
    setOpen(false);
    router.refresh();
  }
  if (!open) {
    return <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Registrar pendência</Button>;
  }
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <select
        value={form.categoria}
        onChange={(e) => setForm({ ...form, categoria: e.target.value })}
        className="h-9 w-full rounded-md border bg-background px-2 text-sm"
      >
        {Object.entries(PENDING_CATEGORY_LABELS).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
      <textarea rows={2} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Questão pendente..." />
      <div className="flex gap-2">
        <SubmitBtn label="Registrar" pending={pending} onClick={submit} />
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </div>
  );
}

export function PendingItem({ p }: { p: PendingIssue }) {
  const router = useRouter();
  async function resolve() {
    if (!p.provision_id) return;
    await resolvePending(p.id, p.provision_id);
    toast.success("Pendência resolvida.");
    router.refresh();
  }
  return (
    <div
      className={cn(
        "rounded-xl border p-4 text-sm",
        p.status === "aberta"
          ? "border-amber-200 bg-amber-50/40 dark:border-amber-800/60 dark:bg-amber-950/20"
          : "border-border bg-muted/30"
      )}
    >
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className={p.status === "aberta" ? "border-amber-300 bg-amber-100/60 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200" : undefined}>
            {PENDING_CATEGORY_LABELS[p.categoria] || p.categoria}
          </Badge>
          {p.status === "aberta" ? (
            <span className="text-[11px] font-medium text-amber-700 dark:text-amber-300">● aberta</span>
          ) : (
            <span className="text-[11px] font-medium text-muted-foreground">✓ resolvida</span>
          )}
        </div>
        {p.status === "aberta" && (
          <Button size="sm" variant="outline" onClick={resolve}>Marcar resolvida</Button>
        )}
      </div>
      <p className="text-foreground">{p.descricao}</p>
      <p className="mt-1.5 text-xs text-muted-foreground">{p.author_name} · {new Date(p.created_at + "Z").toLocaleString("pt-BR")}</p>
    </div>
  );
}