"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Link2, Loader2, Plus, Trash2 } from "lucide-react";
import {
  addCorrespondence,
  removeCorrespondence,
  updateCorrespondence,
  type CorrespondenciaRegistro,
} from "@/app/actions/provision";
import {
  CORRESPONDENCIA_LABELS,
  TIPOS_COM_VINCULO,
  TIPOS_DECLARACAO,
  rotuloCorrespondencia,
} from "@/lib/correspondencias";
import { Button } from "@/components/ui/button";
import type { DispositivoOption } from "@/lib/data";

function agruparPorCapitulo(options: DispositivoOption[]): [string, DispositivoOption[]][] {
  const mapa = new Map<string, DispositivoOption[]>();
  for (const option of options) {
    const lista = mapa.get(option.chapter) ?? [];
    lista.push(option);
    mapa.set(option.chapter, lista);
  }
  return [...mapa.entries()];
}

/**
 * Vínculos múltiplos com o Estatuto registrado (RF-01/RF-05): cada vínculo tem
 * um tipo; acréscimo e não aplicável são declarações sem dispositivo vinculado.
 */
export function CorrespondencePanel({
  provisionId,
  canEdit,
  correspondencias,
  vigenteOptions,
}: {
  provisionId: string;
  canEdit: boolean;
  correspondencias: CorrespondenciaRegistro[];
  vigenteOptions: DispositivoOption[];
}) {
  const [novoVinculo, setNovoVinculo] = useState("");
  const [novoTipo, setNovoTipo] = useState<string>("relacionado");
  const [pending, setPending] = useState(false);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const router = useRouter();

  const grupos = useMemo(() => agruparPorCapitulo(vigenteOptions), [vigenteOptions]);
  const temDeclaracao = (tipo: string) =>
    correspondencias.some((c) => !c.vigente_id && c.tipo === tipo);

  async function adicionar() {
    if (!novoVinculo) return toast.error("Escolha um dispositivo do Estatuto registrado.");
    setPending(true);
    const res = await addCorrespondence(provisionId, novoVinculo, novoTipo);
    setPending(false);
    if (res.error) return toast.error(res.error);
    toast.success(res.message || "Correspondência registrada.");
    setNovoVinculo("");
    router.refresh();
  }

  async function declarar(tipo: string) {
    setPending(true);
    const res = await addCorrespondence(provisionId, null, tipo);
    setPending(false);
    if (res.error) return toast.error(res.error);
    toast.success(res.message || "Declaração registrada.");
    router.refresh();
  }

  async function mudarTipo(id: number, tipo: string) {
    setPendingId(id);
    const res = await updateCorrespondence(id, tipo);
    setPendingId(null);
    if (res.error) return toast.error(res.error);
    router.refresh();
  }

  async function remover(id: number) {
    setPendingId(id);
    const res = await removeCorrespondence(id);
    setPendingId(null);
    if (res.error) return toast.error(res.error);
    toast.success(res.message || "Correspondência removida.");
    router.refresh();
  }

  return (
    <section className="space-y-2 rounded-lg border p-3">
      <h4 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Link2 className="h-3.5 w-3.5" /> Vínculos com o Estatuto registrado
      </h4>
      <p className="text-[11px] text-muted-foreground">
        Um dispositivo pode corresponder a vários do Estatuto vigente e vice-versa. Acréscimo e não
        aplicável dispensam vínculo.
      </p>

      {correspondencias.length === 0 ? (
        <p className="text-xs italic text-muted-foreground">Nenhum vínculo registrado.</p>
      ) : (
        <ul className="space-y-1.5">
          {correspondencias.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-2 rounded-lg border bg-background px-2.5 py-2 text-xs">
              <span className="min-w-0 flex-1 truncate font-medium">
                {item.vigente_label ?? rotuloCorrespondencia(item.tipo)}
              </span>
              {canEdit ? (
                <select
                  value={item.tipo}
                  disabled={pendingId === item.id}
                  onChange={(event) => mudarTipo(item.id, event.target.value)}
                  className="h-8 rounded-lg border border-input bg-background px-2 text-xs"
                >
                  {(item.vigente_id ? TIPOS_COM_VINCULO : TIPOS_DECLARACAO).map((tipo) => (
                    <option key={tipo} value={tipo}>{CORRESPONDENCIA_LABELS[tipo]}</option>
                  ))}
                </select>
              ) : (
                <span className="rounded-full border px-2 py-0.5">{rotuloCorrespondencia(item.tipo)}</span>
              )}
              {canEdit && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-red-700"
                  onClick={() => remover(item.id)}
                  disabled={pendingId === item.id}
                  aria-label="Remover vínculo"
                >
                  {pendingId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <div className="space-y-2 border-t pt-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <select
              value={novoVinculo}
              onChange={(event) => setNovoVinculo(event.target.value)}
              className="h-8 min-w-0 flex-1 rounded-lg border border-input bg-background px-2 text-xs"
            >
              <option value="">Vincular a um dispositivo do Estatuto…</option>
              {grupos.map(([capitulo, options]) => (
                <optgroup key={capitulo || "__sem_capitulo__"} label={capitulo || "Sem capítulo"}>
                  {options.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <select
              value={novoTipo}
              onChange={(event) => setNovoTipo(event.target.value)}
              className="h-8 rounded-lg border border-input bg-background px-2 text-xs"
            >
              {TIPOS_COM_VINCULO.map((tipo) => (
                <option key={tipo} value={tipo}>{CORRESPONDENCIA_LABELS[tipo]}</option>
              ))}
            </select>
            <Button type="button" size="sm" variant="outline" onClick={adicionar} disabled={pending || !novoVinculo}>
              {pending ? <Loader2 className="animate-spin" /> : <Plus />}
              Vincular
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TIPOS_DECLARACAO.map((tipo) => (
              <Button
                key={tipo}
                type="button"
                size="sm"
                variant="outline"
                disabled={pending || temDeclaracao(tipo)}
                onClick={() => declarar(tipo)}
              >
                {temDeclaracao(tipo) ? "✓ " : <Plus />}
                {CORRESPONDENCIA_LABELS[tipo]}
              </Button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
