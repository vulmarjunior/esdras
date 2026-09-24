import {redirect} from "next/navigation";
import Link from "next/link";
import {getSessionUser} from "@/lib/auth";
import ContinuousEditorLab from "@/components/nova-mesa-poc/continuous-editor-lab";

export const dynamic="force-dynamic";

export default async function MesaTrabalhoPage(){
  const user=await getSessionUser();
  if(!user || user.must_change_password)redirect("/login");
  if(user.role!=="admin"&&user.role!=="coordenador")redirect("/mesa-trabalho/visualizar");
  return <div>
    <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-3 pt-3 text-sm">
      <Link href="/mesa-trabalho/visualizar" className="rounded border px-3 py-2">Visualizar minuta</Link>
      <Link href="/legado/mesa-atual" className="rounded border px-3 py-2">Mesa anterior · Legado</Link>
    </div>
    <ContinuousEditorLab canEdit />
  </div>;
}
