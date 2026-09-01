"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, TriangleAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ConfirmDialogState {
  title: string;
  description: string;
  confirmLabel?: string;
}

export function ConfirmDialog({
  state,
  pending,
  onConfirm,
  onClose,
}: {
  state: ConfirmDialogState | null;
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!state) return null;
  return (
    <Dialog open={!!state} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
              <TriangleAlert className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="font-heading text-base">{state.title}</DialogTitle>
              <DialogDescription className="whitespace-pre-wrap pt-1.5 text-sm leading-relaxed">
                {state.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm();
            }}
            disabled={pending}
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {state.confirmLabel || "Confirmar exclusão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmDialogState | null>(null);
  return { state, confirm: setState, close: () => setState(null) };
}