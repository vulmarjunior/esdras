import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { all } from "@/lib/db";
import { getProposalTree, getNumerosArmazenados } from "@/lib/data";
import { buildComparativo } from "@/lib/comparativo-core";
import { QuadroComparativo } from "@/components/comparativo/quadro-comparativo";

export const dynamic = "force-dynamic";

export default async function ComparativoPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const tree = await getProposalTree();
  const vigentes = await getNumerosArmazenados("vigente");
  const justificativas = new Map(
    (await all<{ id: string; justificativa: string }>("SELECT id, justificativa FROM provisions")).map((p) => [
      p.id,
      p.justificativa,
    ])
  );
  const linhas = buildComparativo(tree, vigentes, justificativas);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Quadro comparativo</h2>
        <p className="text-sm text-muted-foreground">
          Redação vigente × nova redação, artigo por artigo, na ordem e numeração da proposta — com tipo de alteração e
          justificativa.
        </p>
      </div>
      <QuadroComparativo linhas={linhas} />
    </div>
  );
}
