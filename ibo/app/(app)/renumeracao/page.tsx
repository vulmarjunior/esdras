import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getArtigosOrdenados, getNumeraveisOrdenados } from "@/lib/renumeracao";
import { normalizarNumero } from "@/lib/numeracao";
import { getProposalTree, getTree } from "@/lib/data";
import { getReferenciasAfetadas } from "@/lib/referencias";
import { Simulator } from "@/components/renumeracao/simulator";
import { Reorder } from "@/components/renumeracao/reorder";
import { ReferenciasGlobais } from "@/components/renumeracao/referencias-globais";

export const dynamic = "force-dynamic";

export default async function RenumeracaoPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "coordenador" && user.role !== "admin") redirect("/");

  const artigos = await getArtigosOrdenados();
  const numeraveis = await getNumeraveisOrdenados("proposta");
  const capitulos = numeraveis
    .filter((n) => n.type === "capitulo")
    .map((n) => ({
      id: n.id,
      label: n.label,
      armazenado: n.numeroArmazenado,
      derivado: n.derivado,
      mudou: normalizarNumero(n.numeroArmazenado) !== normalizarNumero(n.derivado),
    }));
  const tree = await getTree();
  const proposalTree = await getProposalTree();
  const referenciasAfetadas = await getReferenciasAfetadas();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Renumeração automática</h2>
        <p className="text-sm text-muted-foreground">
          A numeração de trabalho da proposta é derivada da ordem atual (artigos em sequência e capítulos em romanos).
          Aqui você confere o que muda em relação ao documento original, aplica a numeração e revisa as referências
          internas. A estrutura vigente permanece preservada (PRD §17).
        </p>
      </div>
      <Simulator artigos={artigos} capitulos={capitulos} />
      <ReferenciasGlobais itens={referenciasAfetadas} />
      <Reorder nodes={proposalTree} mode="proposta" />
      <Reorder nodes={tree} mode="vigente" />
    </div>
  );
}
