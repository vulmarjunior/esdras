import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getArtigosOrdenados, detectarReferencias } from "@/lib/renumeracao";
import { Simulator } from "@/components/renumeracao/simulator";

export const dynamic = "force-dynamic";

export default async function RenumeracaoPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "coordenador" && user.role !== "admin") redirect("/");

  const artigos = await getArtigosOrdenados();
  const referencias = await detectarReferencias();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Renumeração automática</h2>
        <p className="text-sm text-muted-foreground">
          Simule a numeração final dos artigos e veja as referências internas que seriam afetadas — sem alterar nada no
          documento (PRD §17).
        </p>
      </div>
      <Simulator artigos={artigos} referencias={referencias} />
    </div>
  );
}