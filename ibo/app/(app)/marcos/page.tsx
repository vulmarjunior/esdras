import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listarMarcos } from "@/app/actions/marcos";
import { MarcosPanel } from "@/components/marcos/marcos-panel";

export const dynamic = "force-dynamic";

export default async function MarcosPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "coordenador" && user.role !== "admin") redirect("/");

  const marcos = await listarMarcos();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Marcos da minuta</h2>
        <p className="text-sm text-muted-foreground">
          Fotografias integrais recuperáveis do documento em elaboração. Restaurar não apaga revisões
          nem o estado anterior — nada é destrutivo.
        </p>
      </div>
      <MarcosPanel marcos={marcos} />
    </div>
  );
}
