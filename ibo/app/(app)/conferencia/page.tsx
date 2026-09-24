import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { all } from "@/lib/db";
import { getNumerosArmazenados, getProposalTree, listarDispositivos, provisionLabel, type TreeNode } from "@/lib/data";
import { numerarArvore } from "@/lib/numeracao";
import { conferirMinuta, type AchadoConferencia, type AchadoTipo } from "@/lib/conferencia-core";
import { RemissaoLinks, type RemissaoLivre } from "@/components/conferencia/remissao-links";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TIPOS: { tipo: AchadoTipo; titulo: string; descricao: string }[] = [
  { tipo: "pendencia_aberta", titulo: "Pendências abertas", descricao: "Questões registradas e ainda não resolvidas." },
  { tipo: "numeracao_divergente", titulo: "Numeração divergente da ordem", descricao: "O número exibido difere da posição atual — aplicar numeração em Renumeração." },
  { tipo: "provisorio_vazio", titulo: "Dispositivos provisórios vazios", descricao: "Nós sem título ou redação, criados como rascunho estrutural." },
  { tipo: "correspondencia_nao_examinada", titulo: "Correspondências não examinadas", descricao: "Vínculos com o Estatuto registrados, mas ainda não avaliados." },
  { tipo: "correspondencia_ausente", titulo: "Correspondências ausentes", descricao: "Redação de trabalho sem correspondência declarada — possível acréscimo." },
  { tipo: "justificativa_ausente", titulo: "Justificativas ausentes", descricao: "Redações sem justificativa registrada (opcional durante a elaboração)." },
  { tipo: "supressao", titulo: "Supressões propostas", descricao: "Regras vigentes marcadas como revogadas no texto final (informativo)." },
];

function classeGravidade(gravidade: AchadoConferencia["gravidade"]): string {
  if (gravidade === "alerta") return "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200";
  if (gravidade === "atencao") return "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200";
  return "border-border bg-muted/40 text-muted-foreground";
}

export default async function ConferenciaPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "coordenador" && user.role !== "admin") redirect("/");

  const [tree, numerosProposta, numerosVigentes, correspondencias, pendencias, relacoes] = await Promise.all([
    getProposalTree(),
    getNumerosArmazenados("proposta"),
    getNumerosArmazenados("vigente"),
    all<{ provision_id: string; tipo: string; vigente_id: string | null }>(
      "SELECT provision_id, tipo, vigente_id FROM provision_correspondences",
    ),
    all<{ provision_id: string | null; status: string; descricao: string }>(
      "SELECT provision_id, status, descricao FROM pending_issues WHERE status = 'aberta'",
    ),
    all<{ provision_id: string; related_id: string }>(
      "SELECT provision_id, related_id FROM provision_relations",
    ),
  ]);

  const labels = new Map<string, string>();
  const visitar = (nodes: TreeNode[]) => {
    for (const node of nodes) {
      labels.set(node.id, provisionLabel(node));
      visitar(node.children);
    }
  };
  visitar(tree);

  const achados = conferirMinuta(tree, {
    numerosDerivados: numerarArvore(tree),
    numerosArmazenados: numerosProposta,
    correspondencias,
    pendencias,
    labels,
  });

  const alertas = achados.filter((a) => a.gravidade === "alerta").length;
  const atencoes = achados.filter((a) => a.gravidade === "atencao").length;
  const infos = achados.filter((a) => a.gravidade === "info").length;
  const remissoes: RemissaoLivre[] = achados
    .filter((a) => a.tipo === "remissao_a_revisar" && a.provision_id && a.numero !== undefined)
    .map((a) => ({
      provisionId: a.provision_id!,
      label: a.label,
      numero: a.numero!,
      trecho: a.detalhe,
    }));
  const dispositivos = listarDispositivos(tree);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Conferência da minuta</h2>
          <p className="text-sm text-muted-foreground">
            Alertas automáticos separados de questões de conteúdo. A conferência orienta a revisão humana;
            não altera nem conclui nada sozinha.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/api/export?type=correspondencias" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Exportar correspondências
          </Link>
          <Link href="/marcos" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Marcos da minuta
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <span className={cn("rounded-full border px-3 py-1 font-medium", classeGravidade("alerta"))}>{alertas} alertas</span>
        <span className={cn("rounded-full border px-3 py-1 font-medium", classeGravidade("atencao"))}>{atencoes} pontos de atenção</span>
        <span className={cn("rounded-full border px-3 py-1 font-medium", classeGravidade("info"))}>{infos} informativos</span>
        <span className="rounded-full border px-3 py-1 text-muted-foreground">
          {numerosVigentes.size} dispositivos com era vigente mapeada
        </span>
      </div>

      <RemissaoLinks itens={remissoes} dispositivos={dispositivos} relacoes={relacoes} />

      {TIPOS.map(({ tipo, titulo, descricao }) => {
        const lista = achados.filter((a) => a.tipo === tipo);
        if (lista.length === 0) return null;
        return (
          <section key={tipo} className="space-y-2">
            <div>
              <h3 className="text-sm font-semibold">
                {titulo} <span className="text-muted-foreground">({lista.length})</span>
              </h3>
              <p className="text-xs text-muted-foreground">{descricao}</p>
            </div>
            <ul className="divide-y rounded-xl border bg-card">
              {lista.map((achado, index) => (
                <li key={`${achado.tipo}-${achado.provision_id ?? "geral"}-${index}`} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <span className="font-medium">{achado.label}</span>
                    <span className="block text-xs text-muted-foreground">{achado.detalhe}</span>
                  </div>
                  {achado.provision_id && (
                    <Link
                      href={`/mesa-trabalho?dispositivo=${encodeURIComponent(achado.provision_id)}`}
                      className="shrink-0 text-xs font-medium text-primary hover:underline"
                    >
                      Abrir na Mesa
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {achados.length === 0 && (
        <p className="rounded-xl border p-6 text-sm text-muted-foreground">
          Nenhum achado automático no momento. Gere um marco antes de encaminhar a proposta final.
        </p>
      )}
    </div>
  );
}
