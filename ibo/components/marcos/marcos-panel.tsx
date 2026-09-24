"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArchiveRestore, Camera, GitCompareArrows, Loader2 } from "lucide-react";
import { compararMarco, criarMarco, restaurarMarco, type MarcoResumo } from "@/app/actions/marcos";
import type { DiferencaMarco } from "@/lib/marcos-core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog, type ConfirmDialogState } from "@/components/confirm-dialog";

const DIFERENCA_LABELS: Record<DiferencaMarco["tipo"], string> = {
  adicionado: "Criados depois do marco",
  retirado: "Retirados depois do marco",
  restaurado: "Restaurados depois do marco",
  texto: "Redação alterada",
  posicao: "Posição alterada",
  status: "Marcadores alterados",
  correspondencia: "Correspondências alteradas",
};

export function MarcosPanel({ marcos }: { marcos: MarcoResumo[] }) {
  const [rotulo, setRotulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [criando, setCriando] = useState(false);
  const [restaurandoId, setRestaurandoId] = useState<number | null>(null);
  const [comparandoId, setComparandoId] = useState<number | null>(null);
  const [comparacao, setComparacao] = useState<{ rotulo: string; diferencas: DiferencaMarco[] } | null>(null);
  const [confirmacao, setConfirmacao] = useState<ConfirmDialogState | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const router = useRouter();

  async function registrar() {
    setCriando(true);
    const res = await criarMarco(rotulo, descricao);
    setCriando(false);
    if (res.error) return toast.error(res.error);
    toast.success(res.message || "Marco registrado.");
    setRotulo("");
    setDescricao("");
    router.refresh();
  }

  async function restaurar(id: number) {
    setConfirmando(true);
    const res = await restaurarMarco(id);
    setConfirmando(false);
    setConfirmacao(null);
    if (res.error) return toast.error(res.error);
    toast.success(res.message || "Marco restaurado.");
    router.refresh();
  }

  async function comparar(marco: MarcoResumo) {
    setComparandoId(marco.id);
    const res = await compararMarco(marco.id);
    setComparandoId(null);
    if (res.error) return toast.error(res.error);
    setComparacao({ rotulo: marco.rotulo || `Marco ${marco.id}`, diferencas: res.diferencas ?? [] });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-card p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Camera className="h-4 w-4" /> Registrar marco integral
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          O marco guarda árvore, conteúdos, posições, correspondências, justificativas e marcadores.
          Restaurar um marco aplica o estado como novo estado recuperável e preserva o anterior.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
          <Input value={rotulo} onChange={(e) => setRotulo(e.target.value)} placeholder="Rótulo (ex.: Após reunião 12)" />
          <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição (opcional)" />
          <Button type="button" onClick={registrar} disabled={criando}>
            {criando ? <Loader2 className="animate-spin" /> : <Camera />}
            Registrar marco
          </Button>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Marcos registrados ({marcos.length})</h3>
        {marcos.length === 0 ? (
          <p className="rounded-xl border p-4 text-sm text-muted-foreground">Nenhum marco registrado ainda.</p>
        ) : (
          <ul className="space-y-2">
            {marcos.map((marco) => (
              <li key={marco.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{marco.rotulo || `Marco ${marco.id}`}</p>
                  {marco.descricao && <p className="truncate text-xs text-muted-foreground">{marco.descricao}</p>}
                  <p className="text-xs text-muted-foreground">
                    {marco.created_at}
                    {marco.created_by_name ? ` · ${marco.created_by_name}` : ""} · {marco.dispositivos} dispositivos ·{" "}
                    {marco.correspondencias} correspondências
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={comparandoId === marco.id}
                  onClick={() => comparar(marco)}
                >
                  {comparandoId === marco.id ? <Loader2 className="animate-spin" /> : <GitCompareArrows />}
                  Comparar com o atual
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={restaurandoId === marco.id}
                  onClick={() =>
                    setConfirmacao({
                      title: `Restaurar "${marco.rotulo || `Marco ${marco.id}`}"?`,
                      description:
                        "O estado atual será preservado em um marco de segurança automático. Dispositivos criados depois do marco serão retirados da minuta de forma reversível.",
                      confirmLabel: "Restaurar marco",
                    })
                  }
                >
                  {restaurandoId === marco.id ? <Loader2 className="animate-spin" /> : <ArchiveRestore />}
                  Restaurar
                </Button>
                <ConfirmDialog
                  state={confirmacao}
                  pending={confirmando}
                  onConfirm={() => {
                    setRestaurandoId(marco.id);
                    void restaurar(marco.id).finally(() => setRestaurandoId(null));
                  }}
                  onClose={() => setConfirmacao(null)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={Boolean(comparacao)} onOpenChange={(open) => { if (!open) setComparacao(null); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Diferenças em relação ao marco</DialogTitle>
            <DialogDescription>
              {comparacao
                ? `${comparacao.diferencas.length} diferença(s) entre “${comparacao.rotulo}” e o estado atual. A comparação não altera nada.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {comparacao && comparacao.diferencas.length === 0 ? (
            <p className="rounded-lg border p-4 text-sm text-muted-foreground">
              Nenhuma diferença: o estado atual é igual a este marco.
            </p>
          ) : (
            <div className="space-y-4">
              {(Object.keys(DIFERENCA_LABELS) as DiferencaMarco["tipo"][]).map((tipo) => {
                const lista = comparacao?.diferencas.filter((d) => d.tipo === tipo) ?? [];
                if (lista.length === 0) return null;
                return (
                  <section key={tipo} className="space-y-1.5">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {DIFERENCA_LABELS[tipo]} ({lista.length})
                    </h4>
                    <ul className="divide-y rounded-lg border text-sm">
                      {lista.map((diferenca, index) => (
                        <li key={`${diferenca.provision_id}-${index}`} className="px-3 py-2">
                          <span className="font-mono text-xs">{diferenca.provision_id}</span>
                          <span className="block text-xs text-muted-foreground">{diferenca.detalhe}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
