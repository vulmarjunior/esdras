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
  REFERENCE_TYPE_LABELS,
} from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { WorkingTextEditor } from "@/components/provision/working-text-editor";
import { RichTextContent } from "@/components/rich-text-content";
import { FieldHelper } from "@/components/field-helper";
import { StructuralNav } from "@/components/structural-nav";
import {
  StatusControl,
  SuggestionForm,
  SuggestionItem,
  CommentForm,
  CommentList,
  PendingForm,
  PendingItem,
  ReferenceForm,
  VoteButtons,
  JustificativaEditor,
  HistoricalTextEditor,
  NewProvisionForm,
  ProvisionAdminActions,
  RelationForm,
  type RelationDeviceOption,
} from "@/components/provision/provision-forms";
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
  const canParticipate = true;
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

  const relations = await all<{ related_id: string; type: string; numero: string }>(`
    SELECT r.related_id, p.type, p.numero FROM provision_relations r
    JOIN provisions p ON p.id = r.related_id
    WHERE r.provision_id = ? ORDER BY p.ordem`, [id]);

  const votes = await all<{ opinion: string; c: number }>(
    "SELECT opinion, COUNT(*) c FROM votes WHERE provision_id = ? GROUP BY opinion", [id]);
  const myVote = await get<{ opinion: string }>("SELECT opinion FROM votes WHERE provision_id = ? AND user_id = ?", [id, user.id]);

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
            <h2 className="text-2xl font-semibold tracking-tight">
              {provisionLabel(prov)}{prov.titulo ? ` — ${prov.titulo}` : ""}
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

        <Card>
          <CardContent className="space-y-2 pt-5">
            <StatusControl provisionId={id} status={prov.status} canEdit={canManage} />
            <FieldHelper>
              Fluxo de trabalho: Não iniciado → Em análise → Em discussão → Redação definida → Aprovado. Aprovar congela a redação consolidada.
            </FieldHelper>
          </CardContent>
        </Card>

        <NewProvisionForm parentId={id} parentType={prov.type} canEdit={canManage} />

        <Card>
          <CardContent className="space-y-2 pt-5">
            <ProvisionAdminActions provisionId={id} origem={prov.origem} childCount={directChildren} canEdit={canManage} alteracaoTipo={prov.alteracao_tipo} />
          </CardContent>
        </Card>

        <Card className="border-slate-300/70 bg-slate-100/50 dark:border-slate-700/60 dark:bg-slate-900/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-400 text-xs font-semibold text-white">1</span>
              Texto vigente
              <Badge variant="outline" className="text-[10px] text-slate-500">documento histórico — não editável</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <HistoricalTextEditor
              provisionId={id}
              campo="texto_vigente"
              texto={prov.texto_vigente}
              canEdit={canFixExtraction}
              emptyLabel="Não existe no estatuto registrado."
            />
            <FieldHelper>
              É o texto atual do Estatuto registrado — apenas referência. Não precisa de ação.
            </FieldHelper>
          </CardContent>
        </Card>

        <Card className="border-amber-300/70 bg-amber-50/40 dark:border-amber-700/60 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500 text-xs font-semibold text-white">2</span>
              Proposta inicial
              <Badge variant="outline" className="border-amber-200 bg-amber-100/60 text-[10px] text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                preliminar — ponto de partida
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <HistoricalTextEditor
              provisionId={id}
              campo="proposta_inicial"
              texto={prov.proposta_inicial}
              canEdit={canFixExtraction}
              emptyLabel="Sem alteração proposta (manter redação)."
            />
            <FieldHelper>
              Ponto de partida da reforma. Edite aqui o texto proposto — use negrito ou destaque para marcar o que muda.
            </FieldHelper>
          </CardContent>
        </Card>

        <Card className="border-blue-300/70 bg-blue-50/40 dark:border-blue-700/60 dark:bg-blue-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">3</span>
              Redação de trabalho
              <Badge variant="outline" className="border-blue-200 bg-blue-100/60 text-[10px] text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                versão atual da comissão
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <WorkingTextEditor
              provisionId={id}
              initialText={prov.redacao_trabalho}
              version={prov.version}
              canEdit={canEditWork}
              compararTexto={prov.texto_vigente}
            />
            <FieldHelper>
              Redação que a comissão está trabalhando. Cada salvar cria nova versão no histórico.
            </FieldHelper>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">4</span>
              Justificativa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <JustificativaEditor provisionId={id} initial={prov.justificativa} canEdit={canManage} />
            <FieldHelper>
              Explique o porquê da alteração. Alimenta o Relatório da reforma.
            </FieldHelper>
          </CardContent>
        </Card>

        {prov.redacao_consolidada && (
          <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-600 text-xs font-semibold text-white">✓</span>
                Redação consolidada (aprovada)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <RichTextContent text={prov.redacao_consolidada} />
              <FieldHelper>Texto final aprovado — entra no Estatuto consolidado e fica bloqueado.</FieldHelper>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Fundamentação</CardTitle>
            <ReferenceForm provisionId={id} />
          </CardHeader>
          <CardContent className="space-y-3">
            <FieldHelper>
              Referências que sustentam a proposta — bíblicas, doutrinárias, jurídicas ou pastorais.
            </FieldHelper>
            <div className="grid gap-4 sm:grid-cols-2">
            {(["biblica", "doutrinaria", "juridica", "pastoral"] as const).map((tipo) => {
              const list = references.filter((r) => r.tipo === tipo);
              return (
                <div key={tipo} className="rounded-lg border bg-muted/30 p-3">
                  <h4 className="mb-1.5 text-sm font-semibold">{REFERENCE_TYPE_LABELS[tipo]}</h4>
                  {list.length ? (
                    <ul className="space-y-1 text-sm">
                      {list.map((r) => (
                        <li key={r.id} className="flex items-start gap-2">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                          <span className="text-muted-foreground">{r.texto}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">—</p>
                  )}
                </div>
              );
            })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Sugestões dos membros</CardTitle>
            <Badge variant="secondary">{suggestions.length}</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <SuggestionForm provisionId={id} />
            <FieldHelper>
              Membros propõem o que mudar no texto; o coordenador decide o destino de cada sugestão.
            </FieldHelper>
            {suggestions.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma sugestão ainda.</p>}
            {suggestions.map((s) => <SuggestionItem key={s.id} sug={s} canManage={canManage} votes={sugVotesMap.get(s.id)} myVote={mySugVotesMap.get(s.id)} />)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Pendências</CardTitle>
            <Badge variant="secondary">{pendings.length}</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <PendingForm provisionId={id} />
            <FieldHelper>
              Questões em aberto que precisam ser verificadas antes de aprovar o dispositivo.
            </FieldHelper>
            {pendings.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma pendência registrada.</p>}
            {pendings.map((p) => <PendingItem key={p.id} p={p} />)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Comentários</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {canParticipate && <CommentForm provisionId={id} suggestionId={null} />}
            <FieldHelper>Discussão livre sobre o dispositivo — troca de ideias entre os membros.</FieldHelper>
            <CommentList comments={comments} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Opinião consultiva</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <VoteButtons provisionId={id} currentOpinion={myVote?.opinion ?? null} />
            <FieldHelper>
              Manifestação consultiva dos membros — não é a votação formal da comissão.
            </FieldHelper>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{votedCount} membro(s) se manifestaram. Caráter consultivo — não constitui votação formal da comissão.</span>
              {votes.map((v) => (
                <span key={v.opinion} className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2 py-0.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${v.opinion === "concordo" ? "bg-emerald-500" : v.opinion === "discordo" ? "bg-red-500" : "bg-amber-500"}`} />
                  {v.opinion}: {v.c}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico de versões</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <FieldHelper>
              Registro de todas as versões da redação de trabalho, com autor e motivo de cada alteração.
            </FieldHelper>
            {versions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma alteração registrada ainda. Versão 0 (inicial).</p>
            ) : (
              <ol className="relative space-y-4 border-l pl-5">
                {versions.map((v) => (
                  <li key={v.version} className="relative">
                    <span className="absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-primary bg-background" />
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                        <Badge variant="outline" className="font-mono">v{v.version}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {v.author_name || "—"} · {new Date(v.created_at + "Z").toLocaleString("pt-BR")}
                        </span>
                      </div>
                      {v.reason && <p className="mb-1 text-xs font-medium text-muted-foreground">{v.reason}</p>}
                      {v.content ? (
                        <RichTextContent text={v.content} className="text-sm text-foreground/90" />
                      ) : (
                        <p className="text-sm italic text-muted-foreground">(versão sem texto — redação inicial)</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Referências cruzadas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <FieldHelper>
              Dispositivos vinculados a este — úteis para evitar contradições e detectar renumeração.
            </FieldHelper>
            <RelationForm provisionId={id} devices={devices} relations={relations} canManage={canManage} />
          </CardContent>
        </Card>
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
