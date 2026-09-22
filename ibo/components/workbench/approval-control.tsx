"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { setStatus } from "@/app/actions/provision";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ApprovalControl({
  provisionId,
  status,
  canEdit,
  hasWorkingText,
}: {
  provisionId: string;
  status: string;
  canEdit: boolean;
  hasWorkingText: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function changeStatus(next: "aprovado" | "reaberto") {
    setPending(true);
    const result = await setStatus(provisionId, next);
    setPending(false);
    if (result.error) return toast.error(result.error);
    setConfirming(false);
    toast.success(next === "aprovado" ? "Redação concluída para a proposta." : "Redação reaberta para edição.");
    router.refresh();
  }

  if (status === "aprovado") {
    return (
      <section className="rounded-xl border border-emerald-300 bg-emerald-50/60 p-4 dark:border-emerald-800 dark:bg-emerald-950/25">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
              <CheckCircle2 className="h-4 w-4" /> Redação concluída
            </h4>
            <p className="mt-1 text-xs text-emerald-800/75 dark:text-emerald-200/75">
              Esta versão foi definida como redação final do dispositivo na proposta.
            </p>
          </div>
          {canEdit && (
            <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => changeStatus("reaberto")}>
              {pending ? <Loader2 className="animate-spin" /> : <RotateCcw />}
              Reabrir redação
            </Button>
          )}
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="rounded-xl border border-emerald-300 bg-emerald-50/40 p-4 dark:border-emerald-800 dark:bg-emerald-950/20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold">Conclusão da redação</h4>
            <p className="mt-1 text-xs text-muted-foreground">
              Ao concluir, a redação de trabalho atual será definida como texto final deste dispositivo na proposta.
            </p>
          </div>
          {canEdit && (
            <Button type="button" size="sm" disabled={!hasWorkingText} onClick={() => setConfirming(true)} className="bg-emerald-600 text-white hover:bg-emerald-700">
              <CheckCircle2 /> Concluir redação
            </Button>
          )}
        </div>
        {!hasWorkingText && <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">Salve primeiro uma redação de trabalho para concluir esta etapa.</p>}
      </section>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar a redação final deste dispositivo?</DialogTitle>
            <DialogDescription>
              A versão de trabalho atual será registrada como texto final deste dispositivo na proposta. Isso é uma conclusão editorial, não uma aprovação formal da comissão. Alterações posteriores exigirão reabertura.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={() => setConfirming(false)}>Cancelar</Button>
            <Button type="button" disabled={pending} onClick={() => changeStatus("aprovado")} className="bg-emerald-600 text-white hover:bg-emerald-700">
              {pending && <Loader2 className="animate-spin" />}
              Confirmar conclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
