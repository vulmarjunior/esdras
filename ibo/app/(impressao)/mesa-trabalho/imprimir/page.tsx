import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { loadNovaMesaDraft } from "@/app/actions/nova-mesa-draft";
import { corpoDocumento, ESTILO_DOCUMENTO, type OpcoesExportacao } from "@/lib/nova-mesa-poc/exportar";
import PrintBar from "@/components/nova-mesa-poc/print-trigger";

export const dynamic = "force-dynamic";

type Params = { marcas?: string; sumario?: string; apreciados?: string; auto?: string; origem?: string };

export default async function ImprimirMinuta({ searchParams }: { searchParams: Promise<Params> }) {
  const user = await getSessionUser();
  if (!user || user.must_change_password) redirect("/login");
  const params = await searchParams;
  const opcoes: OpcoesExportacao = {
    marcas: params.marcas !== "0",
    sumario: params.sumario === "1",
    somenteApreciados: params.apreciados === "1",
  };
  const snapshot = await loadNovaMesaDraft();
  const corpo = corpoDocumento(snapshot.draft, { versao: snapshot.version, data: new Date() }, opcoes);
  return (
    <div className="min-h-screen py-4">
      <style dangerouslySetInnerHTML={{ __html: ESTILO_DOCUMENTO }} />
      <PrintBar auto={params.auto === "1"} backHref={params.origem === "visualizar" ? "/mesa-trabalho/visualizar" : "/mesa-trabalho"} />
      <div dangerouslySetInnerHTML={{ __html: corpo }} />
    </div>
  );
}
