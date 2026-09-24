import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import {
  getActiveMeeting,
  getNumerosArmazenados,
  getProposalTree,
  getVigenteTree,
  listarDispositivos,
  type TreeNode,
} from "@/lib/data";
import { all } from "@/lib/db";
import { numerarArvore } from "@/lib/numeracao";
import type { Comment, PendingIssue, Suggestion } from "@/lib/types";
import {
  ChapterWorkbench,
  type WorkbenchNode,
} from "@/components/workbench/chapter-workbench";

export const dynamic = "force-dynamic";

function groupByProvision<T extends { provision_id: string | null }>(rows: T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    if (!row.provision_id) continue;
    const current = grouped.get(row.provision_id);
    if (current) current.push(row);
    else grouped.set(row.provision_id, [row]);
  }
  return grouped;
}

function mapNode(
  node: TreeNode,
  numerosProposta: Map<string, string>,
  numerosVigentes: Map<string, string>,
  numerosSugeridos: Map<string, string>,
  notes: Map<string, string>,
  suggestions: Map<string, Suggestion[]>,
  comments: Map<string, Comment[]>,
  pendings: Map<string, PendingIssue[]>,
  dispositivosVigentes: Set<string>,
): WorkbenchNode {
  const nodeSuggestions = suggestions.get(node.id) ?? [];
  const nodeComments = comments.get(node.id) ?? [];
  const nodePendings = pendings.get(node.id) ?? [];
  return {
    id: node.id,
    parentId: node.parent_id,
    type: node.type,
    numero: numerosProposta.get(node.id) ?? node.numero,
    numeroVigente: numerosVigentes.get(node.id) ?? null,
    numeroSugerido: numerosSugeridos.get(node.id) ?? null,
    titulo: node.titulo,
    origem: node.origem,
    origemRefId: node.origem_ref_id,
    semOrigem: Boolean(node.sem_origem),
    temVigente: dispositivosVigentes.has(node.id) || node.texto_vigente.trim() !== "",
    alteracaoTipo: node.alteracao_tipo,
    status: node.status,
    textoVigente: node.texto_vigente,
    propostaInicial: node.proposta_inicial,
    redacaoTrabalho: node.redacao_trabalho,
    redacaoConsolidada: node.redacao_consolidada,
    justificativa: node.justificativa,
    version: node.version,
    updatedAt: node.updated_at,
    hasNote: Boolean(notes.get(node.id)),
    hasPending: nodePendings.some((pending) => pending.status === "aberta"),
    personalNote: notes.get(node.id) ?? "",
    suggestions: nodeSuggestions,
    comments: nodeComments,
    pendings: nodePendings,
    suggestionCount: nodeSuggestions.length,
    commentCount: nodeComments.length,
    childCount: node.child_count,
    children: node.children.map((child) =>
      mapNode(
        child,
        numerosProposta,
        numerosVigentes,
        numerosSugeridos,
        notes,
        suggestions,
        comments,
        pendings,
        dispositivosVigentes,
      ),
    ),
  };
}

export default async function WorkbenchPage({
  searchParams,
}: {
  searchParams: Promise<{ capitulo?: string; dispositivo?: string }>;
}) {
  const [query, user] = await Promise.all([searchParams, getSessionUser()]);
  if (!user) redirect("/login");

  const [
    tree,
    vigenteTree,
    numerosProposta,
    numerosVigentes,
    suggestionRows,
    commentRows,
    pendingRows,
    noteRows,
    activeMeeting,
  ] = await Promise.all([
    getProposalTree(),
    getVigenteTree(),
    getNumerosArmazenados("proposta"),
    getNumerosArmazenados("vigente"),
    all<Suggestion>(`SELECT s.*, u.name AS author_name FROM suggestions s
      JOIN users u ON u.id = s.author_id ORDER BY s.id DESC`),
    all<Comment>(`SELECT c.*, u.name AS author_name FROM comments c
      JOIN users u ON u.id = c.author_id WHERE c.provision_id IS NOT NULL ORDER BY c.id`),
    all<PendingIssue>(`SELECT p.*, u.name AS author_name FROM pending_issues p
      JOIN users u ON u.id = p.author_id WHERE p.provision_id IS NOT NULL ORDER BY p.id DESC`),
    all<{ provision_id: string; content: string }>(
      "SELECT provision_id, content FROM personal_notes WHERE user_id = ?",
      [user.id],
    ),
    getActiveMeeting(),
  ]);

  const numerosSugeridos = numerarArvore(tree);
  const notes = new Map(noteRows.map((row) => [row.provision_id, row.content]));
  const suggestions = groupByProvision(suggestionRows);
  const comments = groupByProvision(commentRows);
  const pendings = groupByProvision(pendingRows);
  const dispositivosVigentes = new Set<string>();
  const visitarVigentes = (nodes: TreeNode[]) => {
    for (const node of nodes) {
      dispositivosVigentes.add(node.id);
      visitarVigentes(node.children);
    }
  };
  visitarVigentes(vigenteTree);
  const vigenteOptions = listarDispositivos(vigenteTree);
  const documentTree = tree.map((node) =>
    mapNode(
      node,
      numerosProposta,
      numerosVigentes,
      numerosSugeridos,
      notes,
      suggestions,
      comments,
      pendings,
      dispositivosVigentes,
    ),
  );
  const chapters = documentTree.filter(
    (node) => node.type === "capitulo" && node.alteracaoTipo !== "revogado",
  );

  return (
    <ChapterWorkbench
      chapters={chapters}
      documentTree={documentTree}
      canEdit={user.role === "admin" || user.role === "coordenador"}
      activeMeetingId={activeMeeting?.id ?? null}
      vigenteOptions={vigenteOptions}
      initialChapterId={query.capitulo}
      initialSelectedId={query.dispositivo}
    />
  );
}
