"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getRedacaoVersions, restoreRedacaoVersion } from "@/app/actions/provision";
import type { RedacaoVersion } from "@/app/actions/redacao";
import { Button } from "@/components/ui/button";
import { RichTextContent } from "@/components/rich-text-content";
import { ConfirmDialog, type ConfirmDialogState } from "@/components/confirm-dialog";

interface Props {
  provisionId: string;
  version: number;
  canEdit: boolean;
  open: boolean;
}

export function WorkbenchVersionHistory({ provisionId, version, canEdit, open }: Props) {
  const router = useRouter();
  const [versions, setVersions] = useState<RedacaoVersion[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<ConfirmDialogState | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setVersions([]);
    setSelected(null);
    setLoading(true);
    getRedacaoVersions(provisionId)
      .then((rows) => { if (active) setVersions(rows); })
      .catch(() => { if (active) toast.error("Não foi possível consultar as versões."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [provisionId, version, open]);

  const current = versions.find((item) => item.version === selected);
  async function restore() {
    if (selected === null || busy) return;
    setBusy(true);
    try {
      const result = await restoreRedacaoVersion(provisionId, selected, version);
      if (result.error) {
        toast.error(result.error);
        if (result.conflict) router.refresh();
        return;
      }
      toast.success(result.message || "Versão restaurada.");
      setConfirm(null);
      setSelected(null);
      router.refresh();
    } catch {
      toast.error("Não foi possível restaurar a versão.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border bg-background p-4">
      <h4 className="text-sm font-semibold">Histórico de versões</h4>
      <p className="text-xs text-muted-foreground">
        Consulte uma redação anterior. Restaurar cria uma nova versão sem apagar as existentes.
        Salve qualquer alteração ainda não salva no editor antes de restaurar.
      </p>
      {loading ? <p className="text-sm">Carregando versões…</p> : versions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma versão de redação registrada.</p>
      ) : (
        <div className="max-h-48 space-y-1 overflow-y-auto">
          {versions.map((item) => (
            <Button
              key={item.version}
              type="button"
              size="sm"
              variant={selected === item.version ? "default" : "outline"}
              className="h-auto w-full justify-start whitespace-normal text-left"
              onClick={() => setSelected(item.version)}
            >
              v{item.version} · {item.author_name || "Autor não identificado"}
              {item.version === version ? " · atual" : ""}
            </Button>
          ))}
        </div>
      )}
      {current && (
        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">
            v{current.version} · {new Date(current.created_at.replace(" ", "T") + "Z").toLocaleString("pt-BR")}
            {current.reason ? ` · ${current.reason}` : ""}
          </p>
          <RichTextContent text={current.content} className="text-sm" />
          {canEdit && current.version !== version && (
            <Button type="button" variant="outline" size="sm" disabled={busy}
              onClick={() => setConfirm({
                title: `Restaurar a versão ${current.version}?`,
                description: `A redação atual (v${version}) será substituída por uma nova versão com o texto da v${current.version}. O histórico será preservado. Alterações não salvas no editor serão perdidas.`,
                confirmLabel: "Restaurar como nova versão",
              })}>
              Restaurar esta versão
            </Button>
          )}
        </div>
      )}
      <ConfirmDialog state={confirm} pending={busy} onConfirm={restore} onClose={() => setConfirm(null)} />
    </section>
  );
}
