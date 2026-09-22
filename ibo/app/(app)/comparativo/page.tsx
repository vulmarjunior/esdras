import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { all } from "@/lib/db";
import { getProposalTree, getNumerosArmazenados } from "@/lib/data";
import { buildComparativo } from "@/lib/comparativo-core";
import {
  Acompanhamento,
  type LinhaAcompanhamento,
} from "@/components/comparativo/acompanhamento";
import type { Comment, PendingIssue, Suggestion } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ComparativoPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [tree, vigentes, provisionRows, suggestionRows, commentRows, pendingRows, noteRows] = await Promise.all([
    getProposalTree(),
    getNumerosArmazenados("vigente"),
    all<{ id: string; justificativa: string }>("SELECT id, justificativa FROM provisions"),
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
  ]);

  const justificativas = new Map(provisionRows.map((row) => [row.id, row.justificativa]));
  const suggestions = groupByProvision(suggestionRows);
  const comments = groupByProvision(commentRows);
  const pendings = groupByProvision(pendingRows);
  const notes = new Map(noteRows.map((row) => [row.provision_id, row.content]));
  const linhas: LinhaAcompanhamento[] = buildComparativo(tree, vigentes, justificativas).map((linha) => ({
    ...linha,
    suggestions: suggestions.get(linha.id) ?? [],
    comments: comments.get(linha.id) ?? [],
    pendings: pendings.get(linha.id) ?? [],
    personalNote: notes.get(linha.id) ?? "",
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Acompanhamento da reforma</h2>
        <p className="text-sm text-muted-foreground">
          Consulte a evolução de cada dispositivo e registre contribuições. O quadro comparativo completo continua disponível
          nesta mesma tela.
        </p>
      </div>
      <Acompanhamento linhas={linhas} />
    </div>
  );
}

function groupByProvision<T extends { provision_id: string | null }>(rows: T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    if (!row.provision_id) continue;
    const current = grouped.get(row.provision_id) ?? [];
    current.push(row);
    grouped.set(row.provision_id, current);
  }
  return grouped;
}
