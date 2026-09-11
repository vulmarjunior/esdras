import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getArtigosOrdenados, detectarReferencias } from "@/lib/renumeracao";
import { getProposalTree, getTree } from "@/lib/data";
import { Simulator } from "@/components/renumeracao/simulator";
import { Reorder } from "@/components/renumeracao/reorder";

export const dynamic = "force-dynamic";

export default async function RenumeracaoPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "coordenador" && user.role !== "admin") redirect("/");

  const artigos = await getArtigosOrdenados();
  const referencias = await detectarReferencias();
  const tree = await getTree();
  const proposalTree = await getProposalTree();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Renumeração automática</h2>
        <p className="text-sm text-muted-foreground">
          Simule a numeração final da proposta e veja as referências internas que precisam ser conferidas. A estrutura
          vigente permanece preservada (PRD §17).
        </p>
      </div>
      <Simulator artigos={artigos} referencias={referencias} />
      <Reorder nodes={proposalTree} mode="proposta" />
      <Reorder nodes={tree} mode="vigente" />
    </div>
  );
}
