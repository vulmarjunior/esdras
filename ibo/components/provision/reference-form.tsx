"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { REFERENCE_TYPE_LABELS } from "@/lib/labels";
import { createReference } from "@/app/actions/provision";
import { SubmitBtn } from "@/components/provision/submit-btn";

export function ReferenceForm({ provisionId }: { provisionId: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ tipo: "biblica", texto: "" });
  const [pending, setPending] = useState(false);
  const router = useRouter();
  async function submit() {
    setPending(true);
    const res = await createReference(provisionId, form.tipo, form.texto);
    setPending(false);
    if (res.error) return toast.error(res.error);
    setForm({ tipo: "biblica", texto: "" });
    setOpen(false);
    router.refresh();
  }
  if (!open) return <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Adicionar fundamento</Button>;
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
        {Object.entries(REFERENCE_TYPE_LABELS).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
      <textarea rows={2} value={form.texto} onChange={(e) => setForm({ ...form, texto: e.target.value })} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Ex.: Mateus 18.15-17" />
      <div className="flex gap-2">
        <SubmitBtn label="Adicionar" pending={pending} onClick={submit} />
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </div>
  );
}