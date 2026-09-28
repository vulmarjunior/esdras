import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { loadNovaMesaDraft } from "@/app/actions/nova-mesa-draft";
import { carregarCandidatosVinculo } from "@/lib/nova-mesa-vinculos";
import { flattenDraft, vinculosOf } from "@/lib/nova-mesa-poc/model";
import PlataformaLeitura from "@/components/nova-mesa-poc/plataforma-leitura";
import ExportarDocumento from "@/components/nova-mesa-poc/exportar-dialog";

export const dynamic = "force-dynamic";

export default async function VisualizarNovaMesa() {
  const user = await getSessionUser();
  if (!user || user.must_change_password) redirect("/login");
  const snapshot = await loadNovaMesaDraft();
  const canEdit = user.role === "admin" || user.role === "coordenador";
  const ids = new Set<string>();
  for (const row of flattenDraft(snapshot.draft)) for (const id of vinculosOf(row.node)) ids.add(id);
  const candidatos = (ids.size ? await carregarCandidatosVinculo() : []).filter((candidato) => ids.has(candidato.id));
  return <div data-nova-mesa-root className="min-w-0 w-full space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-semibold">Nova minuta do Estatuto</h1>
        <p className="text-sm text-muted-foreground">Acompanhamento somente leitura · Versão {snapshot.version} · consulte cada dispositivo com o Estatuto vigente e a proposta inicial.</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <ExportarDocumento versao={snapshot.version} origem="visualizar" />
        {canEdit && <Link href="/mesa-trabalho" className="rounded border px-3 py-2 text-sm">Abrir editor</Link>}
      </div>
    </header>
    <PlataformaLeitura draft={snapshot.draft} candidatos={candidatos} />
  </div>;
}