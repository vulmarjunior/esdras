import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { loadNovaMesaDraft } from "@/app/actions/nova-mesa-draft";
import { CONFISSOES } from "@/lib/confissoes";
import { COMPROMISSO_MEMBRESIA } from "@/lib/nova-mesa-poc/documentos";
import PlataformaLeitura, { type DocumentoConsultavel } from "@/components/nova-mesa-poc/plataforma-leitura";
import ExportarDocumento from "@/components/nova-mesa-poc/exportar-dialog";

export const dynamic = "force-dynamic";

export default async function VisualizarCompromisso() {
  const user = await getSessionUser();
  if (!user || user.must_change_password) redirect("/login");
  const snapshot = await loadNovaMesaDraft(COMPROMISSO_MEMBRESIA.id);
  const canEdit = user.role === "admin" || user.role === "coordenador";
  const documentos: DocumentoConsultavel[] = CONFISSOES.map((doc) => ({
    id: doc.id, nome: doc.nome, grupo: doc.grupo ?? "Documentos doutrinários", resumo: doc.resumo,
  }));
  return <div data-nova-mesa-root className="min-w-0 w-full space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-semibold">Compromisso de Membresia</h1>
        <p className="text-sm text-muted-foreground">Acompanhamento somente leitura · Versão {snapshot.version} · marcas de apreciação e pontos para revisão.</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <ExportarDocumento versao={snapshot.version} origem="visualizar" documentoId={COMPROMISSO_MEMBRESIA.id} />
        {canEdit && <Link href="/compromisso" className="rounded border px-3 py-2 text-sm">Abrir editor</Link>}
      </div>
    </header>
    <PlataformaLeitura draft={snapshot.draft} candidatos={[]} documentos={documentos} documentoId={COMPROMISSO_MEMBRESIA.id} />
  </div>;
}
