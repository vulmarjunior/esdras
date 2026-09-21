"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { definirVersaoTrabalho } from "@/app/actions/preferencias";
import type { VersaoTrabalho } from "@/lib/types";
import { cn } from "@/lib/utils";

const OPCOES: { valor: VersaoTrabalho; label: string; titulo: string }[] = [
  { valor: "proposta", label: "Proposta", titulo: "Ordem e numeração de trabalho (com as mudanças da reforma)" },
  { valor: "vigente", label: "Vigente", titulo: "Estatuto registrado, na numeração histórica" },
];

/** Alterna a versão exibida (cookie por usuário) no painel, revisão e navegação. */
export function VersionToggle({ versao }: { versao: VersaoTrabalho }) {
  const [atual, setAtual] = useState<VersaoTrabalho>(versao);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function trocar(valor: VersaoTrabalho) {
    if (valor === atual) return;
    setAtual(valor);
    startTransition(async () => {
      await definirVersaoTrabalho(valor);
      router.refresh();
    });
  }

  return (
    <div className="inline-flex items-center rounded-full border bg-background p-0.5" title="Versão exibida">
      {OPCOES.map((o) => (
        <button
          key={o.valor}
          type="button"
          title={o.titulo}
          disabled={pending}
          onClick={() => trocar(o.valor)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:opacity-70",
            o.valor === atual ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
