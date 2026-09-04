import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getProvision, getTree, provisionLabel, parentChain } from "@/lib/data";
import type { TreeNode } from "@/lib/data";
import { all, get } from "@/lib/db";
import {
  PROVISION_TYPE_LABELS,
  ORIGIN_LABELS,
  ALTERACAO_TYPE_LABELS,
} from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, NovoBadge } from "@/components/status-badge";
import { StructuralNav } from "@/components/structural-nav";
import { DeviceTabs } from "@/components/provision/device-tabs";
import type { RelationDeviceOption } from "@/components/provision/provision-forms";
import type { Suggestion, Comment, PendingIssue } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DevicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const prov = await getProvision(id);
  if (!prov) notFound();

  const canEditWork = user.role === "coordenador" || user.role === "admin";
  const canManage = canEditWork;
  const canFixExtraction = user.role === "admin";

  const chain = await parentChain(id);
  const tree = await getTree();
  const devices = flattenDevices(tree);

  const suggestions = await all<Suggestion>(`
    SELECT s.*, u.name AS author_name FROM suggestions s
    JOIN users u ON u.id = s.author_id
    WHERE s.provision_id = ? ORDER BY s.id DESC`, [id]);

  const sugVotes = await all<{ suggestion_id: number; opinion: string; c: number }>(`
    SELECT v.suggestion_id, v.opinion, COUNT(*) c FROM votes v
    WHERE v.suggestion_id IN (SELECT id FROM suggestions WHERE provision_id = ?)
    GROUP BY v.suggestion_id, v.opinion`, [id]);
  const mySugVotes = await all<{ suggestion_id: number; opinion: string }>(`
    SELECT v.suggestion_id, v.opinion FROM votes v
    WHERE v.user_id = ? AND v.suggestion_id IN (SELECT id FROM suggestions WHERE provision_id = ?)`, [user.id, id]);
  const sugVotesMap = new Map<number, Record<string, number>>();
  for (const v of sugVotes) {
    const m = sugVotesMap.get(v.suggestion_id) || {};
    m[v.opinion] = v.c;
    sugVotesMap.set(v.suggestion_id, m);
  }
  const mySugVotesMap = new Map(mySugVotes.map((v) => [v.suggestion_id, v.opinion]));

  const comments = await all<Comment>(`
    SELECT c.*, u.name AS author_name FROM comments c
    JOIN users u ON u.id = c.author_id
    WHERE c.provision_id = ? ORDER BY c.id`, [id]);

  const pendings = await all<PendingIssue>(`
    SELECT p.*, u.name AS author_name FROM pending_issues p
    JOIN users u ON u.id = p.author_id
    WHERE p.provision_id = ? ORDER BY p.id DESC`, [id]);

  const references = await all<{ id: number; tipo: string; texto: string }>(
    "SELECT id, tipo, texto FROM references_tb WHERE provision_id = ? ORDER BY id", [id]);

  const versions = await all<{ version: number; content: string; reason: string | null; author_name: string | null; created_at: string; meeting_id: number | null }>(`
    SELECT v.*, u.name AS author_name FROM provision_versions v
    LEFT JOIN users u ON u.id = v.author_id
    WHERE v.provision_id = ? ORDER BY v.version DESC`, [id]);

  const relations = await all<{ related_id: string; type: string; numero: string | null }>(`
    SELECT r.related_id, p.type, p.numero FROM provision_relations r
    JOIN provisions p ON p.id = r.related_id
    WHERE r.provision_id = ? ORDER BY p.ordem`, [id]);

  const votes = await all<{ opinion: string; c: number }>(
    "SELECT opinion, COUNT(*) c FROM votes WHERE provision_id = ? GROUP BY opinion", [id]);
  const myVote = await get<{ opinion: string }>("SELECT opinion FROM votes WHERE provision_id = ? AND user_id = ?", [id, user.id]);

  const personalNote = (await get<{ content: string }>(
    "SELECT content FROM personal_notes WHERE provision_id = ? AND user_id = ?",
    [id, user.id]
  ))?.content ?? "";

  const votedCount = (await get<{ c: number }>("SELECT COUNT(DISTINCT user_id) c FROM votes WHERE provision_id = ?", [id]))?.c ?? 0;

  const directChildren = (await get<{ c: number }>("SELECT COUNT(*) c FROM provisions WHERE parent_id = ?", [id]))?.c ?? 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="order-2 space-y-4 lg:order-1">
        <details className="rounded-xl border bg-card lg:hidden">
          <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium">
            Navegação estrutural
          </summary>
          <div className="max-h-[60vh] overflow-auto border-t p-2">
            <StructuralNav nodes={tree} activeId={id} />
          </div>
        </details>
        <div className="hidden lg:block">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Navegação estrutural</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[70vh] overflow-auto pr-1">
              <StructuralNav nodes={tree} activeId={id} />
            </CardContent>
          </Card>
        </div>
      </aside>

      <div className="order-1 min-w-0 space-y-5 lg:order-2">
        <div>
          <nav className="mb-1 text-xs text-muted-foreground">
            {chain.map((c) => (
              <span key={c.id}>
                <Link href={`/dispositivo/${c.id}`} className="transition-colors hover:text-primary hover:underline">{provisionLabel(c)}</Link>
                {" / "}
              </span>
            ))}
            <span className="font-medium text-foreground">{provisionLabel(prov)}</span>
          </nav>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight">
              {provisionLabel(prov)}{prov.titulo ? ` — ${prov.titulo}` : ""}
              {prov.origem === "novo" && <NovoBadge className="mt-1.5" />}
            </h2>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <StatusBadge status={prov.status} />
            <Badge variant="outline">{PROVISION_TYPE_LABELS[prov.type]}</Badge>
            <Badge variant="outline">Origem: {ORIGIN_LABELS[prov.origem]}</Badge>
            <Badge variant="outline">{ALTERACAO_TYPE_LABELS[prov.alteracao_tipo]}</Badge>
            {prov.posicao_sugerida && (
              <Badge variant="outline" className="border-amber-200 bg-amber-50/60 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                {prov.posicao_sugerida}
              </Badge>
            )}
          </div>
        </div>

        <DeviceTabs
          id={id}
          prov={{
            type: prov.type,
            origem: prov.origem,
            alteracao_tipo: prov.alteracao_tipo,
            status: prov.status,
            texto_vigente: prov.texto_vigente,
            proposta_inicial: prov.proposta_inicial,
            redacao_trabalho: prov.redacao_trabalho,
            justificativa: prov.justificativa,
            redacao_consolidada: prov.redacao_consolidada,
            version: prov.version,
          }}
          canEditWork={canEditWork}
          canManage={canManage}
          canFixExtraction={canFixExtraction}
          directChildren={directChildren}
          suggestions={suggestions}
          sugVotesMap={Object.fromEntries(sugVotesMap)}
          mySugVotesMap={Object.fromEntries(mySugVotesMap)}
          comments={comments}
          pendings={pendings}
          references={references}
          versions={versions}
          relations={relations}
          devices={devices}
          votes={votes}
          myVote={myVote?.opinion ?? null}
          votedCount={votedCount}
          personalNote={personalNote}
        />
      </div>
    </div>
  );
}

function flattenDevices(nodes: TreeNode[]): RelationDeviceOption[] {
  const out: RelationDeviceOption[] = [];
  const chapter = (n: TreeNode): string => {
    let cur = n;
    const seen = new Set<string>();
    while (cur.parent_id) {
      if (seen.has(cur.id)) break;
      seen.add(cur.id);
      const parent = findNode(nodes, cur.parent_id);
      if (!parent) break;
      cur = parent;
    }
    return cur.type === "capitulo" ? provisionLabel(cur) : "";
  };
  const visit = (list: TreeNode[]) => {
    for (const n of list) {
      out.push({ id: n.id, label: provisionLabel(n), chapter: chapter(n) });
      visit(n.children);
    }
  };
  visit(nodes);
  return out;
}

function findNode(nodes: TreeNode[], id: string): TreeNode | undefined {
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findNode(n.children, id);
    if (found) return found;
  }
  return undefined;
}
