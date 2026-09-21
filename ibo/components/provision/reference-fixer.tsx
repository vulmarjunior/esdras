"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  atualizarReferencia,
  atualizarReferenciasDoDispositivo,
  type ItemReferencia,
} from "@/app/actions/referencias";
import { CAMPO_LABELS, type CampoReferencia } from "@/lib/referencias-core";

export interface ReferenciaAfetadaItem {
  campo: CampoReferencia;
  numeroAntigo: number;
  numeroNovo: string;
  alvoLabel: string;
  trecho: string;
  origem: "vigente" | "documento";
}

export function ReferenceFixer({
  provisionId,
  itens,
  canEdit,
}: {
  provisionId: string;
  itens: ReferenciaAfetadaItem[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pendente, setPendente] = useState<string | null>(null);
  const [todas, setTodas] = useState(false);

  if (itens.length === 0) return null;

  const chave = (i: ReferenciaAfetadaItem) => `${i.campo}:${i.numeroAntigo}`;

  async function atualizar(item: ReferenciaAfetadaItem) {
    setPendente(chave(item));
    const res = await atualizarReferencia(provisionId, item.campo, item.numeroAntigo, item.numeroNovo);
    setPendente(null);
    if (res.error) return toast.error(res.error);
    toast.success(res.message || "Referência atualizada.");
    router.refresh();
  }

  async function atualizarTodas() {
    setTodas(true);
    const lista: ItemReferencia[] = itens.map((i) => ({
      campo: i.campo,
      numeroAntigo: i.numeroAntigo,
      numeroNovo: i.numeroNovo,
    }));
    const res = await atualizarReferenciasDoDispositivo(provisionId, lista);
    setTodas(false);
    if (res.error) return toast.error(res.error);
    toast.success(res.message || "Referências atualizadas.");
    router.refresh();
  }

  return (
    <Card className="border-red-300/70 bg-red-50/40 dark:border-red-800/60 dark:bg-red-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <TriangleAlert className="h-4 w-4 text-red-600 dark:text-red-400" />
          Referências internas a atualizar
          <Badge variant="outline" className="border-red-300 text-red-700 dark:border-red-800 dark:text-red-300">
            {itens.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-2">
          {itens.map((item) => (
            <li key={chave(item)} className="rounded-lg border bg-background/70 px-3 py-2">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="outline" className="text-[10px]">
                  {CAMPO_LABELS[item.campo]}
                </Badge>
                <span className="font-medium">
                  Art. {item.numeroAntigo}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-semibold text-primary">{item.alvoLabel}</span>
                <span className="text-xs text-muted-foreground">
                  ({item.origem === "vigente" ? "numeração vigente → proposta" : "documento → ordem atual"})
                </span>
                {canEdit && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-auto h-7 text-xs"
                    disabled={pendente === chave(item) || todas}
                    onClick={() => atualizar(item)}
                  >
                    {pendente === chave(item) ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                    Atualizar
                  </Button>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">“…{item.trecho}…”</p>
            </li>
          ))}
        </ul>
        {canEdit ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={atualizarTodas} disabled={todas || pendente !== null}>
              {todas ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              Atualizar todas
            </Button>
            <span className="text-xs text-muted-foreground">
              Cada atualização é confirmada e registrada (nova versão na redação de trabalho; auditoria nos demais campos).
            </span>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Somente coordenador/administrador pode atualizar referências nos textos.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
