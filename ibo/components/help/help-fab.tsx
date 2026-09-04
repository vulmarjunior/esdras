"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleHelp, BookOpenText, BookMarked, LayoutDashboard, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { HelpAssistant } from "@/components/help/help-assistant";

const FAQ = [
  {
    q: "Por que não consigo editar a redação de trabalho?",
    a: "A redação de trabalho é editada apenas pelo coordenador/relator. Como membro, contribua com sugestões de redação, comentários e fundamentos.",
  },
  {
    q: "O que é opinião consultiva?",
    a: "É sua manifestação (concordo / discordo / tenho ressalva). Ajuda a comissão, mas não é a votação formal.",
  },
  {
    q: "A IA altera algo sozinha?",
    a: "Não. A IA é assistiva: toda resposta é rotulada e você clica em 'Aplicar sugestão' para incorporar um texto.",
  },
];

export function HelpFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Ajuda"
        title="Ajuda"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:scale-105"
      >
        <CircleHelp className="h-6 w-6" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full max-w-sm gap-0 p-0">
          <SheetHeader className="border-b px-4 py-3.5">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                <CircleHelp className="h-4 w-4 text-primary" /> Ajuda
              </SheetTitle>
              <SheetClose className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted">
                <X className="h-4 w-4" />
              </SheetClose>
            </div>
            <SheetDescription>Como usar o ESDRAS — manual, atalhos e dúvidas.</SheetDescription>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
            <Link
              href="/manual"
              onClick={() => setOpen(false)}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <BookOpenText className="h-4 w-4" /> Abrir manual de utilização
            </Link>

            <div className="grid grid-cols-3 gap-2">
              {[
                { href: "/", label: "Primeiros passos", icon: LayoutDashboard },
                { href: "/guia-redacao", label: "Guia de redação", icon: BookOpenText },
                { href: "/documentos", label: "Documentos", icon: BookMarked },
              ].map((l) => {
                const Icon = l.icon;
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="flex flex-col items-center gap-1 rounded-lg border p-2.5 text-center text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Icon className="h-4 w-4 text-primary" />
                    {l.label}
                  </Link>
                );
              })}
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold">Perguntas frequentes</h4>
              <div className="space-y-2">
                {FAQ.map((f) => (
                  <details key={f.q} className="rounded-lg border bg-muted/30 p-2.5">
                    <summary className="cursor-pointer text-sm font-medium">{f.q}</summary>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
                  </details>
                ))}
              </div>
            </div>

            <div className="rounded-lg border bg-violet-50/50 p-3 dark:bg-violet-950/20">
              <h4 className="mb-2 text-sm font-semibold">Tire sua dúvida com a IA</h4>
              <HelpAssistant />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}