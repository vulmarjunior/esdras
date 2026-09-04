"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Rocket, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { lerFlag, gravarFlag } from "@/components/onboarding/onboarding-store";

export function WelcomeModal({ userId, name }: { userId: number; name: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = setTimeout(() => {
      if (!lerFlag(userId, "welcome")) setOpen(true);
    }, 0);
    return () => clearTimeout(t);
  }, [userId]);

  function concluir(id: "comecar" | "manual") {
    gravarFlag(userId, "welcome", true);
    setOpen(false);
    if (id === "manual") router.push("/manual");
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) gravarFlag(userId, "welcome", true); setOpen(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogClose className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <X className="h-4 w-4" />
        </DialogClose>
        <DialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <BookOpen className="h-5 w-5" />
          </div>
          <DialogTitle>Bem-vindo(a), {name}!</DialogTitle>
          <DialogDescription>
            Este é o ambiente da Comissão de Reforma do Estatuto Social da IBO. Aqui você analisa o
            Estatuto dispositivo por dispositivo, propõe sugestões de redação, registra fundamentos, participa das
            reuniões e acompanha a construção do novo Estatuto consolidado.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <Rocket className="h-4 w-4 text-primary" /> No Painel você encontra o card &quot;Primeiros passos&quot; com o
            fluxo completo de trabalho.
          </span>
          <span className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" /> O Manual de utilização explica cada tela e cada termo do
            sistema.
          </span>
        </div>
        <DialogFooter className="gap-2">
          <button
            type="button"
            onClick={() => concluir("manual")}
            className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors hover:bg-muted"
          >
            Ver manual
          </button>
          <button
            type="button"
            onClick={() => concluir("comecar")}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Começar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}