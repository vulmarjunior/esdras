import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import {
  getActiveMeeting,
  getIdsComPendenciasAbertas,
  getNumerosArmazenados,
  getPersonalNoteIds,
  getProposalTree,
  type TreeNode,
} from "@/lib/data";
import { all } from "@/lib/db";
import { numerarArvore } from "@/lib/numeracao";
import {
  ChapterWorkbench,
  type WorkbenchNode,
} from "@/components/workbench/chapter-workbench";

export const dynamic = "force-dynamic";

type CountRow = { provision_id: string; c: number };

function mapNode(
  node: TreeNode,
  numerosProposta: Map<string, string>,
  numerosVigentes: Map<string, string>,
  numerosSugeridos: Map<string, string>,
  notes: Set<string>,
  pendings: Set<string>,
  suggestions: Map<string, number>,
  comments: Map<string, number>,
): WorkbenchNode {
  return {
    id: node.id,
    parentId: node.parent_id,
    type: node.type,
    numero: numerosProposta.get(node.id) ?? node.numero,
    numeroVigente: numerosVigentes.get(node.id) ?? null,
    numeroSugerido: numerosSugeridos.get(node.id) ?? null,
    titulo: node.titulo,
    origem: node.origem,
    alteracaoTipo: node.alteracao_tipo,
    status: node.status,
    textoVigente: node.texto_vigente,
    propostaInicial: node.proposta_inicial,
    redacaoTrabalho: node.redacao_trabalho,
    redacaoConsolidada: node.redacao_consolidada,
    justificativa: node.justificativa,
    version: node.version,
    updatedAt: node.updated_at,
    hasNote: notes.has(node.id),
    hasPending: pendings.has(node.id),
    suggestionCount: suggestions.get(node.id) ?? 0,
    commentCount: comments.get(node.id) ?? 0,
    childCount: node.child_count,
    children: node.children.map((child) =>
      mapNode(
        child,
        numerosProposta,
        numerosVigentes,
        numerosSugeridos,
        notes,
        pendings,
        suggestions,
        comments,
      ),
    ),
  };
}

export default async function WorkbenchPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [
    tree,
    numerosProposta,
    numerosVigentes,
    notedIds,
    pendingIds,
    suggestionRows,
    commentRows,
    activeMeeting,
  ] = await Promise.all([
    getProposalTree(),
    getNumerosArmazenados("proposta"),
    getNumerosArmazenados("vigente"),
    getPersonalNoteIds(user.id),
    getIdsComPendenciasAbertas(),
    all<CountRow>("SELECT provision_id, COUNT(*) c FROM suggestions GROUP BY provision_id"),
    all<CountRow>("SELECT provision_id, COUNT(*) c FROM comments WHERE provision_id IS NOT NULL GROUP BY provision_id"),
    getActiveMeeting(),
  ]);

  const numerosSugeridos = numerarArvore(tree);
  const notes = new Set(notedIds);
  const pendings = new Set(pendingIds);
  const suggestions = new Map(suggestionRows.map((row) => [row.provision_id, Number(row.c)]));
  const comments = new Map(commentRows.map((row) => [row.provision_id, Number(row.c)]));
  const chapters = tree
    .filter((node) => node.type === "capitulo" && node.alteracao_tipo !== "revogado")
    .map((node) =>
      mapNode(
        node,
        numerosProposta,
        numerosVigentes,
        numerosSugeridos,
        notes,
        pendings,
        suggestions,
        comments,
      ),
    );

  return (
    <ChapterWorkbench
      chapters={chapters}
      canEdit={user.role === "admin" || user.role === "coordenador"}
      activeMeetingId={activeMeeting?.id ?? null}
    />
  );
}
