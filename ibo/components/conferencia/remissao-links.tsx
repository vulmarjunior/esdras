"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Link2, Loader2, X } from "lucide-react";
import { addProvisionRelation, removeProvisionRelation } from "@/app/actions/provision";
import { Button } from "@/components/ui/button";
import type { DispositivoOption } from "@/lib/data";

export interface RemissaoLivre {
  provisionId: string;
  label: string;
  numero: number;
  trecho: string;
}

export interface RelacaoExistente {
  provision_id: string;
  related_id: string;
}

/**
 * Remissões estruturadas (RF-04): converte uma menção livre ("Art. N") em um
 * vínculo persistente com o ID estável do dispositivo de destino. O vínculo
 * aparece em "Dispositivos relacionados" na tela clássica.
 */
export function RemissaoLinks({
  itens,
  dispositivos,
  relacoes,
}: {
  itens: RemissaoLivre[];
  dispositivos: DispositivoOption[];
  relacoes: RelacaoExistente[];
}) {
  const [destino, setDestino] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<string | null>(null);
  const router = useRouter();

  const porDispositivo = new Map<string, RelacaoExistente[]>();
  for (const relacao of relacoes) {
    const lista = porDispositivo.get(relacao.provision_id) ?? [];
    lista.push(relacao);
    porDispositivo.set(relacao.provision_id, lista);
  }
  const labelPorId = new Map(dispositivos.map((option) => [option.id, option.label]));

  async function vincular(item: RemissaoLivre) {
    const alvo = destino[item.provisionId];
    if (!alvo) return toast.error("Escolha o dispositivo de destino.");
    setPending(`${item.provisionId}:${item.numero}`);
    const res = await addProvisionRelation(item.provisionId, alvo);
    setPending(null);
    if (res.error) return toast.error(res.error);
    toast.success(`Remissão vinculada a ${labelPorId.get(alvo) ?? alvo}.`);
    router.refresh();
  }

  async function desvincular(provisionId: string, relatedId: string) {
    setPending(`${provisionId}:${relatedId}`);
    const res = await removeProvisionRelation(provisionId, relatedId);
    setPending(null);
    if (res.error) return toast.error(res.error);
    toast.success("Vínculo removido.");
    router.refresh();
  }

  if (itens.length === 0) return null;

  return (
    <section className="space-y-2">
      <div>
        <h3 className="text-sm font-semibold">
          Remissões livres — vincular a IDs estáveis ({itens.length})
        </h3>
        <p className="text-xs text-muted-foreground">
          Menções a artigos sem alvo na numeração atual podem ser vinculadas ao dispositivo correto.
          O vínculo é persistente e sobrevive a renumerações; nenhum texto é alterado automaticamente.
        </p>
      </div>
      <ul className="divide-y rounded-xl border bg-card">
        {itens.map((item) => {
          const existentes = porDispositivo.get(item.provisionId) ?? [];
          const chave = `${item.provisionId}:${item.numero}`;
          return (
            <li key={chave} className="space-y-2 px-3 py-3 text-sm">
              <div className="min-w-0">
                <span className="font-medium">{item.label}</span>
                <span className="block text-xs text-muted-foreground">{item.trecho}</span>
              </div>
              {existentes.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {existentes.map((relacao) => (
                    <span key={relacao.related_id} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
                      {labelPorId.get(relacao.related_id) ?? relacao.related_id}
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-red-700"
                        onClick={() => desvincular(item.provisionId, relacao.related_id)}
                        disabled={pending === `${item.provisionId}:${relacao.related_id}`}
                        aria-label="Remover vínculo"
                      >
                        {pending === `${item.provisionId}:${relacao.related_id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={destino[item.provisionId] ?? ""}
                  onChange={(event) => setDestino({ ...destino, [item.provisionId]: event.target.value })}
                  className="h-8 min-w-0 flex-1 rounded-lg border border-input bg-background px-2 text-xs"
                >
                  <option value="">Escolher dispositivo de destino…</option>
                  {dispositivos
                    .filter((option) => option.id !== item.provisionId)
                    .map((option) => (
                      <option key={option.id} value={option.id}>{option.label}{option.chapter ? ` · ${option.chapter}` : ""}</option>
                    ))}
                </select>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => vincular(item)}
                  disabled={pending === chave || !destino[item.provisionId]}
                >
                  {pending === chave ? <Loader2 className="animate-spin" /> : <Link2 />}
                  Vincular
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
