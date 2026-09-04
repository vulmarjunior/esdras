"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/labels";
import { setStatus } from "@/app/actions/provision";

export function StatusControl({
  provisionId,
  status,
  canEdit,
}: {
  provisionId: string;
  status: string;
  canEdit: boolean;
}) {
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const statuses = ["nao_iniciado", "em_analise", "em_discussao", "redacao_definida", "aprovado", "reaberto"];
  if (!canEdit) {
    return <Badge>{STATUS_LABELS[status]}</Badge>;
  }
  async function go(next: string) {
    setPending(true);
    const res = await setStatus(provisionId, next);
    setPending(false);
    if (res.error) return toast.error(res.error);
    toast.success(next === "aprovado" ? "Dispositivo aprovado e redação consolidada." : `Status: ${STATUS_LABELS[next]}`);
    router.refresh();
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-sm font-medium text-muted-foreground">Status:</span>
      {statuses.map((s) => {
        const active = s === status;
        return (
          <Button
            key={s}
            size="sm"
            variant={active ? "default" : "outline"}
            disabled={pending}
            onClick={() => go(s)}
            title={s === "aprovado" ? "Aprova o dispositivo e congela a redação consolidada" : undefined}
            className={cn(
              active &&
                (s === "aprovado"
                  ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
                  : s === "reaberto"
                    ? "border-red-600 bg-red-600 text-white hover:bg-red-700"
                    : s === "em_discussao"
                      ? "border-amber-500 bg-amber-500 text-white hover:bg-amber-600"
                      : undefined)
            )}
          >
            {STATUS_LABELS[s]}
          </Button>
        );
      })}
    </div>
  );
}