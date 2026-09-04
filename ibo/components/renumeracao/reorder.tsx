"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FolderTree, MoveRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldHelper } from "@/components/field-helper";
import { NovoBadge } from "@/components/status-badge";
import { provisionLabel } from "@/lib/provision-label";
import { moveProvision } from "@/app/actions/provision";
import type { TreeNode } from "@/lib/data";

interface Props {
  nodes: TreeNode[];
}

interface Container {
  id: string | null;
  label: string;
}

/**
 * PRD §17 (2ª etapa) — reordenação física de artigos entre capítulos/seções.
 * Move de verdade na árvore (parent_id/ordem_pai), com auditoria e evento de
 * reunião. Textos nunca são alterados; a numeração é reaplicada em "Aplicar numeração".
 */
export function Reorder({ nodes }: Props) {
  const router = useRouter();

  const { artigos, containers, parentLabel, artigosDoContainer } = useMemo(() => {
    const byId = new Map<string, TreeNode>();
    const walk = (list: TreeNode[]) => {
      for (const n of list) {
        byId.set(n.id, n);
        walk(n.children);
      }
    };
    walk(nodes);

    const parentLabel = (id: string | null): string => {
      if (!id) return "Raiz do documento";
      const p = byId.get(id);
      return p ? provisionLabel(p) : id;
    };

    const containers: Container[] = [{ id: null, label: "Raiz do documento" }];
    const collect = (list: TreeNode[]) => {
      for (const n of list) {
        if (n.type === "capitulo" || n.type === "secao") containers.push({ id: n.id, label: provisionLabel(n) });
        collect(n.children);
      }
    };
    collect(nodes);

    const artigos: { node: TreeNode; parentId: string | null }[] = [];
    const collectArtigos = (list: TreeNode[]) => {
      for (const n of list) {
        if (n.type === "artigo") artigos.push({ node: n, parentId: n.parent_id });
        collectArtigos(n.children);
      }
    };
    collectArtigos(nodes);

    const artigosDoContainer = (parentId: string | null): TreeNode[] =>
      artigos.filter((a) => a.parentId === parentId).map((a) => a.node);

    return { artigos, containers, parentLabel, artigosDoContainer };
  }, [nodes]);

  const [openId, setOpenId] = useState<string | null>(null);
  const [destino, setDestino] = useState<string>("");
  const [posicao, setPosicao] = useState<string>("");
  const [pending, setPending] = useState(false);

  const artigoAtual = artigos.find((a) => a.node.id === openId)?.node ?? null;
  const destinoId = destino === "" ? null : destino;
  const irmaosDestino = destino === "" && artigoAtual?.parent_id ? artigosDoContainer(artigoAtual.parent_id) : artigosDoContainer(destinoId);

  function abrir(id: string, parentId: string | null) {
    setOpenId(id);
    setDestino(parentId ?? "");
    setPosicao("");
  }

  async function confirmar() {
    if (!openId) return;
    setPending(true);
    const res = await moveProvision(openId, destinoId, posicao === "" ? null : posicao);
    setPending(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(res.message || "Dispositivo movido.");
    setOpenId(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4">
        <div className="mb-3 flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FolderTree className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Reordenação física (PRD §17 — 2ª etapa)</h3>
            <p className="text-xs text-muted-foreground">
              Mova artigos entre capítulos/seções ou reordene dentro do mesmo destino. A mudança grava a posição na
              árvore com auditoria; depois use o simulador acima e <strong>Aplicar numeração</strong> para renumerar.
            </p>
          </div>
        </div>
        <FieldHelper>
          Textos nunca são alterados nesta operação. Mova apenas artigos; capítulos permanecem na raiz do documento.
        </FieldHelper>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 border-b bg-muted/40 px-4 py-2 text-xs font-semibold text-muted-foreground">
          <span>Artigo</span>
          <span>Onde está</span>
          <span className="w-16 text-right">Ações</span>
        </div>
        {artigos.map(({ node, parentId }) => {
          const aberto = openId === node.id;
          return (
            <div key={node.id} className="border-b last:border-0">
              <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 px-4 py-2">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  {provisionLabel(node)}
                  {node.origem === "novo" && <NovoBadge />}
                </span>
                <span className="text-xs text-muted-foreground">{parentLabel(parentId)}</span>
                <div className="w-16 text-right">
                  {!aberto && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => abrir(node.id, parentId)}
                      className="h-7 text-xs"
                    >
                      <MoveRight className="mr-1 h-3.5 w-3.5" /> Mover
                    </Button>
                  )}
                </div>
              </div>
              {aberto && (
                <div className="flex flex-wrap items-end gap-3 bg-muted/30 px-4 py-3">
                  <div className="min-w-56">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Mover para</label>
                    <select
                      value={destino}
                      onChange={(e) => {
                        setDestino(e.target.value);
                        setPosicao("");
                      }}
                      className="h-8 w-full rounded-md border bg-background px-2 text-sm"
                    >
                      {containers.map((c) => (
                        <option key={c.id ?? "__raiz" } value={c.id ?? ""}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-56">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Posição</label>
                    <select
                      value={posicao}
                      onChange={(e) => setPosicao(e.target.value)}
                      className="h-8 w-full rounded-md border bg-background px-2 text-sm"
                    >
                      <option value="">— no início —</option>
                      {irmaosDestino
                        .filter((a) => a.id !== node.id)
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            Após {provisionLabel(a)}
                          </option>
                        ))}
                    </select>
                  </div>
                  <Button size="sm" onClick={confirmar} disabled={pending}>
                    Confirmar movimento
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setOpenId(null)} disabled={pending}>
                    <X className="mr-1 h-3.5 w-3.5" /> Cancelar
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
