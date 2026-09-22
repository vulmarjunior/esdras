import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import {
  getProposalTree,
  getProvision,
  getTree,
  getVigenteTree,
  getProvisionPlacement,
  provisionLabel,
  parentChain,
  getPersonalNoteIds,
} from "@/lib/data";
import type { TreeNode } from "@/lib/data";
import { numerarArvore, aplicarNumeracao, numeracaoDesatualizada, numerosDaArvore, normalizarNumero } from "@/lib/numeracao";
import { getVersaoTrabalho } from "@/lib/versao";
import { getReferenciasDoDispositivo } from "@/lib/referencias";
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
import { DeviceTabs, type TabKey } from "@/components/provision/device-tabs";
import type { RelationDeviceOption } from "@/components/provision/provision-forms";
import type { Suggestion, Comment, PendingIssue } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DevicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aba?: string; origem?: string; capitulo?: string; dispositivo?: string }>;
}) {
  const [{ id }, query, user] = await Promise.all([params, searchParams, getSessionUser()]);
  if (!user) redirect("/login");

  const prov = await getProvision(id);
  if (!prov) notFound();

  const parentType = prov.parent_id ? (await getProvision(prov.parent_id))?.type ?? null : null;

  const canEditWork = user.role === "coordenador" || user.role === "admin";
  const canManage = canEditWork;
  const canFixExtraction = user.role === "admin";

  const chain = await parentChain(id);
  const versao = await getVersaoTrabalho();
  const tree = await getTree();
  const proposalTree = await getProposalTree();
  // Números do documento original (armazenados) × derivados da ordem atual.
  const numerosPropostaDerivados = numerarArvore(proposalTree);
  const proposalTreeNumerada = aplicarNumeracao(proposalTree, numerosPropostaDerivados);
  const numerosPropostaDocumento = numerosDaArvore(proposalTree);
  const proposalNodeDocumento = findNode(proposalTree, id);
  const proposalChainDocumento = proposalNodeDocumento ? nodeChain(proposalTree, id) : [];
  const proposalNodeOrdem = findNode(proposalTreeNumerada, id);
  const proposalChainOrdem = proposalNodeOrdem ? nodeChain(proposalTreeNumerada, id) : [];
  const vigenteTree = await getVigenteTree();
  const vigenteNode = findNode(vigenteTree, id);
  const vigenteChain = vigenteNode ? nodeChain(vigenteTree, id) : chain;
  const placementProposta = await getProvisionPlacement(id, "proposta");
  const numeracaoPropostaDesatualizada = numeracaoDesatualizada(
    new Map([[id, placementProposta?.numero ?? null]]),
    numerosPropostaDerivados
  ).length > 0;
  const navTree = versao === "proposta" ? proposalTree : tree;
  const numerosVigentes = numerosDaArvore(vigenteTree);
  const navNumeros = versao === "proposta" ? numerosPropostaDocumento : numerosVigentes;
  const navContraparte = versao === "proposta" ? numerosVigentes : numerosPropostaDocumento;
  const navSugeridos = versao === "proposta" ? numerosPropostaDerivados : new Map<string, string>();
  const devices = flattenDevices(tree);
  const notedIds = await getPersonalNoteIds(user.id);
  const referenciasAfetadas = (await getReferenciasDoDispositivo(id)).map((r) => ({
    campo: r.campo,
    numeroAntigo: r.numeroAntigo,
    numeroNovo: r.numeroNovo,
    alvoLabel: r.alvoLabel,
    trecho: r.trecho,
    origem: r.origem,
  }));

  const suggestions = await all<Suggestion>(`
    SELECT s.*, u.name AS author_name FROM suggestions s
    JOIN users u ON u.id = s.author_id
    WHERE s.provision_id = ? ORDER BY s.id DESC`, [id]);

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

  const personalNote = (await get<{ content: string }>(
    "SELECT content FROM personal_notes WHERE provision_id = ? AND user_id = ?",
    [id, user.id]
  ))?.content ?? "";

  const directChildren = (await get<{ c: number }>("SELECT COUNT(*) c FROM provisions WHERE parent_id = ?", [id]))?.c ?? 0;
  const allowedTabs: TabKey[] = ["analise", "colaboracao", "pendencias", "historico"];
  const initialTab = allowedTabs.includes(query.aba as TabKey) ? (query.aba as TabKey) : "analise";
  const workbenchHref = query.origem === "mesa"
    ? `/mesa-trabalho?${new URLSearchParams({
      ...(query.capitulo ? { capitulo: query.capitulo } : {}),
      dispositivo: query.dispositivo || id,
    }).toString()}`
    : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="order-2 space-y-4 lg:order-1">
        <details className="rounded-xl border bg-card lg:hidden">
          <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium">
            Navegação estrutural
          </summary>
          <div className="max-h-[60vh] overflow-auto border-t p-2">
            <StructuralNav
              nodes={navTree}
              activeId={id}
              notedIds={notedIds}
              versao={versao}
              numeros={Object.fromEntries(navNumeros)}
              contraparte={Object.fromEntries(navContraparte)}
              sugeridos={Object.fromEntries(navSugeridos)}
            />
          </div>
        </details>
        <div className="hidden lg:block">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between gap-2 text-sm font-medium">
                Navegação estrutural
                <span className="text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
                  {versao === "proposta" ? "proposta" : "vigente"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-[70vh] overflow-auto pr-1">
              <StructuralNav
                nodes={navTree}
                activeId={id}
                notedIds={notedIds}
                versao={versao}
                numeros={Object.fromEntries(navNumeros)}
                contraparte={Object.fromEntries(navContraparte)}
              />
            </CardContent>
          </Card>
        </div>
      </aside>

      <div className="order-1 min-w-0 space-y-5 lg:order-2">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/70 bg-amber-50/50 px-4 py-3 text-sm dark:border-amber-800 dark:bg-amber-950/20">
          <div>
            <p className="font-semibold">Tela clássica de consulta</p>
            <p className="text-xs text-muted-foreground">Mantida como referência e contingência. O trabalho principal por capítulo acontece na Mesa de Trabalho.</p>
          </div>
          <Link href={workbenchHref || `/mesa-trabalho?dispositivo=${id}`} className="font-medium text-primary underline underline-offset-4">
            Ir para a Mesa de Trabalho
          </Link>
        </div>
        <div>
          {workbenchHref && (
            <Link href={workbenchHref} className="mb-3 inline-flex items-center text-sm font-medium text-primary hover:underline">
              ← Voltar à Mesa de Trabalho
            </Link>
          )}
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
            {personalNote && (
              <Badge variant="outline" className="border-violet-300 bg-violet-50/60 text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300">
                Anotação pessoal
              </Badge>
            )}
          </div>
        </div>

        {proposalNodeDocumento && (
          <Card className="mt-4 border-amber-300/70 bg-amber-50/40 dark:border-amber-700/60 dark:bg-amber-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Localização nas versões</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="w-28 shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">Vigente</span>
                <span>{vigenteNode ? vigenteChain.map((c) => provisionLabel(c)).concat(provisionLabel(vigenteNode)).join(" / ") : "Não existe no Estatuto vigente"}</span>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="w-28 shrink-0 text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">
                  Proposta (documento)
                </span>
                <span>
                  {proposalChainDocumento
                    .map((c) => provisionLabel(c))
                    .concat(proposalNodeDocumento ? [provisionLabel(proposalNodeDocumento)] : [])
                    .join(" / ")}
                </span>
                {!vigenteNode ? (
                  <Badge className="bg-amber-600 text-white hover:bg-amber-600">novo na proposta</Badge>
                ) : proposalNodeDocumento &&
                  (proposalNodeDocumento.parent_id !== vigenteNode.parent_id ||
                    normalizarNumero(proposalNodeDocumento.numero) !== normalizarNumero(vigenteNode.numero)) ? (
                  <Badge className="bg-amber-600 text-white hover:bg-amber-600">movido/renumerado</Badge>
                ) : null}
              </div>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="w-28 shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Ordem atual
                </span>
                <span className="text-muted-foreground">
                  {proposalChainOrdem
                    .map((c) => provisionLabel(c))
                    .concat(proposalNodeOrdem ? [provisionLabel(proposalNodeOrdem)] : [])
                    .join(" / ")}
                </span>
                {numeracaoPropostaDesatualizada && (
                  <Badge variant="outline" className="border-red-300 text-red-700 dark:border-red-800 dark:text-red-300">
                    ordem divergente do documento — reordene em Renumeração
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                O número da proposta vem do documento original importado; a &quot;ordem atual&quot; mostra o número sugerido
                pela posição no sistema (divergências indicam que a ordem ainda não reflete o documento). O identificador
                interno deste dispositivo permanece o mesmo para preservar o histórico.
              </p>
            </CardContent>
          </Card>
        )}

        <DeviceTabs
          initialTab={initialTab}
          id={id}
          prov={{
            type: prov.type,
            numero: prov.numero,
            titulo: prov.titulo,
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
          parentType={parentType}
          suggestions={suggestions}
          comments={comments}
          pendings={pendings}
          references={references}
          versions={versions}
          relations={relations}
          devices={devices}
          personalNote={personalNote}
          referenciasAfetadas={referenciasAfetadas}
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

function nodeChain(nodes: TreeNode[], id: string): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  const visit = (list: TreeNode[]) => {
    for (const n of list) {
      byId.set(n.id, n);
      visit(n.children);
    }
  };
  visit(nodes);
  const node = byId.get(id);
  if (!node) return [];
  const chain: TreeNode[] = [];
  let cur = node;
  const seen = new Set<string>();
  while (cur.parent_id && byId.has(cur.parent_id) && !seen.has(cur.id)) {
    seen.add(cur.id);
    const parent = byId.get(cur.parent_id)!;
    chain.unshift(parent);
    cur = parent;
  }
  return chain;
}
