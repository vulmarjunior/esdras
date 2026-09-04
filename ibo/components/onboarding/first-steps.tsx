"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, ChevronDown, Rocket } from "lucide-react";
import { lerFlag, gravarFlag, lerPassosFeitos, gravarPasso } from "@/components/onboarding/onboarding-store";

const PASSOS = [
  { id: "painel", label: "Conheça o Painel da Reforma", desc: "Progresso, capítulos e status dos artigos.", href: "/" },
  { id: "dispositivo", label: "Abra um dispositivo", desc: "Leia o texto vigente, a proposta inicial e a redação de trabalho.", href: "/" },
  { id: "colaborar", label: "Sugira e comente", desc: "Apresente sugestões e opiniões na aba Colaboração.", href: "/" },
  { id: "fundamentar", label: "Fundamente e registre pendências", desc: "Referências bíblicas, doutrinárias, jurídicas e pastorais.", href: "/" },
  { id: "guia", label: "Use o Guia de redação", desc: "Dúvidas de redação e checklist técnico (LC 95).", href: "/guia-redacao" },
  { id: "documentos", label: "Consulte os documentos doutrinários", desc: "Confissões e declarações de fé.", href: "/documentos" },
  { id: "reunioes", label: "Acompanhe reuniões e atas", desc: "Presença, deliberações, minuta e aprovação da ata.", href: "/reunioes" },
  { id: "consolidado", label: "Veja o Estatuto consolidado", desc: "Somente os dispositivos aprovados, na ordem final.", href: "/consolidado" },
];

export function FirstSteps({ userId }: { userId: number }) {
  const [pronto, setPronto] = useState(false);
  const [aberto, setAberto] = useState(true);
  const [feitos, setFeitos] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = setTimeout(() => {
      setAberto(!lerFlag(userId, "firstStepsHidden"));
      setFeitos(lerPassosFeitos(userId));
      setPronto(true);
    }, 0);
    return () => clearTimeout(t);
  }, [userId]);

  if (!pronto) return null;

  const total = PASSOS.length;
  const concluidos = PASSOS.filter((p) => feitos.includes(p.id)).length;
  const pct = Math.round((concluidos / total) * 100);

  function toggle(passoId: string) {
    const feito = !feitos.includes(passoId);
    gravarPasso(userId, passoId, feito);
    setFeitos((prev) => (feito ? [...prev, passoId] : prev.filter((id) => id !== passoId)));
  }

  function ocultar(v: boolean) {
    gravarFlag(userId, "firstStepsHidden", v);
    setAberto(!v);
  }

  return (
    <Card className="border-violet-200/70 bg-violet-50/40 dark:border-violet-800/60 dark:bg-violet-950/20">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <div className="flex items-center gap-2">
          <Rocket className="h-4 w-4 text-violet-600 dark:text-violet-300" />
          <CardTitle className="text-base">Primeiros passos</CardTitle>
          <span className="rounded-full bg-violet-200/70 px-2 py-0.5 text-[11px] font-semibold text-violet-900 dark:bg-violet-900 dark:text-violet-100">
            {concluidos}/{total}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {aberto && (
            <>
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-violet-200/70 dark:bg-violet-900">
                <div className="h-full rounded-full bg-violet-600 transition-all dark:bg-violet-400" style={{ width: `${pct}%` }} />
              </div>
              <button
                type="button"
                onClick={() => ocultar(true)}
                className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Ocultar
              </button>
            </>
          )}
          {!aberto && (
            <button
              type="button"
              onClick={() => setAberto(true)}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronDown className="h-3.5 w-3.5" /> Reabrir
            </button>
          )}
        </div>
      </CardHeader>
      {aberto && (
        <CardContent>
          <ol className="grid gap-2 sm:grid-cols-2">
            {PASSOS.map((p) => {
              const feito = feitos.includes(p.id);
              return (
                <li key={p.id} className="flex items-start gap-2.5 rounded-lg border bg-background/70 p-3 dark:bg-background/40">
                  <button
                    type="button"
                    aria-label={feito ? "Marcar como não concluído" : "Marcar como concluído"}
                    onClick={() => toggle(p.id)}
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                      feito
                        ? "border-violet-500 bg-violet-600 text-white dark:border-violet-400"
                        : "border-border bg-background text-transparent hover:border-violet-400"
                    )}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <div className="min-w-0">
                    <Link href={p.href} className="text-sm font-medium transition-colors hover:text-primary hover:underline">
                      {p.label}
                    </Link>
                    <p className="text-xs text-muted-foreground">{p.desc}</p>
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="mt-3 text-xs text-muted-foreground">
            Marque os passos que já conhece. Tudo está explicado no{" "}
            <Link href="/manual" className="font-medium text-primary hover:underline">
              Manual de utilização
            </Link>
            .
          </p>
        </CardContent>
      )}
    </Card>
  );
}