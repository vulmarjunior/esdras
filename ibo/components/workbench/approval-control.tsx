"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, History, Loader2, PencilLine, RotateCcw } from "lucide-react";
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

function formatarData(valor: string | null): string {
  if (!valor) return "";
  const data = new Date(`${valor}Z`);
  return Number.isNaN(data.getTime()) ? valor : data.toLocaleString("pt-BR");
}

export function ApprovalControl({
  provisionId,
  status,
  canEdit,
  hasWorkingText,
  acordoEm,
  acordoPorName,
  acordoVersion,
  currentVersion,
}: {
  provisionId: string;
  status: string;
  canEdit: boolean;
  hasWorkingText: boolean;
  acordoEm: string | null;
  acordoPorName: string | null;
  acordoVersion: number | null;
  currentVersion: number;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const acordada = status === "aprovado";
  const alteradaDepois = acordada && acordoVersion !== null && currentVersion > acordoVersion;

  async function registrar() {
    setPending(true);
    const result = await setStatus(provisionId, "aprovado");
    setPending(false);
    if (result.error) return toast.error(result.error);
    setConfirming(false);
    toast.success("Concordância registrada. A redação continua editável.");
    router.refresh();
  }

  async function desfazer() {
    setPending(true);
    const result = await setStatus(provisionId, "reaberto");
    setPending(false);
    if (result.error) return toast.error(result.error);
    toast.success("Concordância desfeita. O registro histórico foi preservado.");
    router.refresh();
  }

  if (acordada) {
    return (
      <section className="rounded-xl border border-emerald-300 bg-emerald-50/60 p-4 dark:border-emerald-800 dark:bg-emerald-950/25">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
          <CheckCircle2 className="h-4 w-4" /> Redação acordada
        </h4>
        <p className="mt-1 text-xs text-emerald-800/75 dark:text-emerald-200/75">
          Concordância da comissão com a versão {acordoVersion ?? "—"} da redação
          {acordoPorName ? `, registrada por ${acordoPorName}` : ""}
          {acordoEm ? ` em ${formatarData(acordoEm)}` : ""}. Não é aprovação formal da Assembleia.
        </p>
        {alteradaDepois && (
          <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            A redação foi alterada depois desta concordância (versão atual: {currentVersion}). Nenhuma
            reabertura é necessária; atualize a concordância se a comissão concordar com o texto atual.
          </p>
        )}
        {canEdit && (
          <div className="mt-3 flex flex-wrap gap-2">
            {alteradaDepois && (
              <Button type="button" size="sm" disabled={pending} onClick={registrar} className="bg-emerald-600 text-white hover:bg-emerald-700">
                {pending ? <Loader2 className="animate-spin" /> : <PencilLine />}
                Atualizar concordância
              </Button>
            )}
            <Button type="button" size="sm" variant="outline" disabled={pending} onClick={desfazer}>
              {pending ? <Loader2 className="animate-spin" /> : <RotateCcw />}
              Desfazer concordância
            </Button>
          </div>
        )}
      </section>
    );
  }

  return (
    <>
      <section className="rounded-xl border border-emerald-300 bg-emerald-50/40 p-4 dark:border-emerald-800 dark:bg-emerald-950/20">
        <h4 className="text-sm font-semibold">Concordância da redação</h4>
        <p className="mt-1 text-xs text-muted-foreground">
          Registre que a comissão concordou com a redação atual. É um marcador de progresso: não é
          aprovação formal e não bloqueia edições posteriores.
        </p>
        {acordoEm && (
          <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
            <History className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Última concordância: versão {acordoVersion ?? "—"}
              {acordoPorName ? `, por ${acordoPorName}` : ""} em {formatarData(acordoEm)}.
            </span>
          </p>
        )}
        {canEdit && (
          <div className="mt-3">
            <Button
              type="button"
              size="sm"
              disabled={!hasWorkingText}
              onClick={() => setConfirming(true)}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <CheckCircle2 /> Registrar concordância
            </Button>
          </div>
        )}
        {!hasWorkingText && (
          <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">
            Salve primeiro uma redação de trabalho para registrar a concordância.
          </p>
        )}
      </section>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar concordância com a redação atual?</DialogTitle>
            <DialogDescription>
              A versão {currentVersion} será registrada como redação acordada pela comissão. A edição
              continua liberada e o histórico permanece; a aprovação formal ocorre na Assembleia.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={() => setConfirming(false)}>Cancelar</Button>
            <Button type="button" disabled={pending} onClick={registrar} className="bg-emerald-600 text-white hover:bg-emerald-700">
              {pending && <Loader2 className="animate-spin" />}
              Registrar concordância
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
