"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PROVISION_TYPE_LABELS } from "@/lib/labels";
import { addProvisionRelation, removeProvisionRelation } from "@/app/actions/provision";

export interface RelationDeviceOption {
  id: string;
  label: string;
  chapter: string;
}

export function RelationForm({
  provisionId,
  devices,
  relations,
  canManage,
}: {
  provisionId: string;
  devices: RelationDeviceOption[];
  relations: { related_id: string; type: string; numero: string | null }[];
  canManage: boolean;
}) {
  const [relatedId, setRelatedId] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function add() {
    if (!relatedId) return;
    setPending(true);
    const res = await addProvisionRelation(provisionId, relatedId);
    setPending(false);
    if (res.error) return toast.error(res.error);
    toast.success("Dispositivo vinculado.");
    setRelatedId("");
    router.refresh();
  }

  async function remove(id: string) {
    await removeProvisionRelation(provisionId, id);
    toast.success("Vínculo removido.");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-1 text-sm">
        {relations.length === 0 && (
          <p className="text-sm text-muted-foreground italic">Nenhum vínculo registrado.</p>
        )}
        {relations.map((r) => (
          <li key={r.related_id} className="flex items-center justify-between gap-2">
            <Link href={`/dispositivo/${r.related_id}`} className="text-primary hover:underline">
              {PROVISION_TYPE_LABELS[r.type] || r.type} {r.numero} ({r.related_id})
            </Link>
            {canManage && (
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground hover:text-red-600" onClick={() => remove(r.related_id)}>
                Remover
              </Button>
            )}
          </li>
        ))}
      </ul>
      {canManage && (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={relatedId}
            onChange={(e) => setRelatedId(e.target.value)}
            className="h-9 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm"
          >
            <option value="">Vincular dispositivo...</option>
            {devices
              .filter((d) => d.id !== provisionId)
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                  {d.chapter ? ` — ${d.chapter}` : ""}
                </option>
              ))}
          </select>
          <Button size="sm" variant="outline" disabled={pending || !relatedId} onClick={add}>
            Vincular
          </Button>
        </div>
      )}
    </div>
  );
}