import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import {
  getArvoreDaVersao,
  getNumerosArmazenados,
  getStatusCounts,
  getStatusCountsProposta,
  getArticleCount,
  getArticleCountProposta,
  getPersonalNoteIds,
  getIdsComPendenciasAbertas,
  type TreeNode,
} from "@/lib/data";
import { all } from "@/lib/db";
import { numerarArvore, rotuloDe } from "@/lib/numeracao";
import Link from "next/link";
import { getVersaoTrabalho } from "@/lib/versao";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatusDot } from "@/components/status-badge";
import { NewProvisionForm } from "@/components/provision/provision-forms";
import { DashboardTree } from "@/components/dashboard/dashboard-tree";
import { VersionToggle } from "@/components/version-toggle";
import { FirstSteps } from "@/components/onboarding/first-steps";
import { CheckCircle2, Circle, Loader2, PenLine, RotateCcw, AlertCircle, Layers } from "lucide-react";

const ORDER = ["nao_iniciado", "em_analise", "em_discussao", "redacao_definida", "aprovado", "reaberto"];

const STATUS_META: Record<string, { label: string; icon: typeof Circle }> = {
  nao_iniciado: { label: "Não iniciados", icon: Circle },
  em_analise: { label: "Em análise", icon: Loader2 },
  em_discussao: { label: "Em discussão", icon: PenLine },
  redacao_definida: { label: "Redação definida", icon: CheckCircle2 },
  aprovado: { label: "Aprovados", icon: CheckCircle2 },
  reaberto: { label: "Reabertos", icon: RotateCcw },
};

export const dynamic = "force-dynamic";

function proximoNaoIniciado(nodes: TreeNode[]): TreeNode | null {
  for (const n of nodes) {
    if (n.alteracao_tipo === "revogado") continue;
    if (n.type === "artigo" && n.status === "nao_iniciado") return n;
    const sub = proximoNaoIniciado(n.children);
    if (sub) return sub;
  }
  return null;
}

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const versao = await getVersaoTrabalho();
  const tree = await getArvoreDaVersao(versao);
  const notedIds = await getPersonalNoteIds(user.id);
  const pendenciasIds = await getIdsComPendenciasAbertas();

  // Na proposta, o número principal é o do documento original (placements);
  // a numeração derivada da ordem entra como sugestão quando divergir.
  const numerosProposta = await getNumerosArmazenados("proposta");
  const numerosVigentes = await getNumerosArmazenados("vigente");
  const derivados = numerarArvore(tree);
  const numeros = versao === "proposta" ? numerosProposta : numerosVigentes;
  const contraparte = versao === "proposta" ? numerosVigentes : numerosProposta;
  const sugeridos = versao === "proposta" ? derivados : new Map<string, string>();

  const counts = versao === "proposta" ? await getStatusCountsProposta() : await getStatusCounts();
  const totalArtigos = versao === "proposta" ? await getArticleCountProposta() : await getArticleCount();
  const analyzed = totalArtigos - counts.nao_iniciado;
  const pct = totalArtigos ? Math.round((counts.aprovado / totalArtigos) * 100) : 0;
  const pendingCount = (await all<{ c: number }>("SELECT COUNT(*) c FROM pending_issues WHERE status = 'aberta'"))[0]?.c ?? 0;
  const capitulos = tree.filter((n) => n.type === "capitulo" && n.alteracao_tipo !== "revogado").length;
  const proximo = proximoNaoIniciado(tree);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border bg-card p-5 sm:p-8">
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div className="min-w-0">
            <p className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <Layers className="h-3.5 w-3.5" /> Painel da Reforma
            </p>
            <h2 className="font-heading text-xl font-semibold tracking-tight sm:text-3xl">
              Reforma do Estatuto Social da Igreja Batista Olaria
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              {totalArtigos} artigos organizados em {capitulos} capítulos. Analise dispositivo por
              dispositivo, apresente sugestões de redação e acompanhe a consolidação do novo Estatuto.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <VersionToggle versao={versao} />
              <span className="text-xs text-muted-foreground">
                {versao === "proposta"
                  ? "Ordem e numeração de trabalho da reforma (revogados não ocupam número)."
                  : "Estatuto registrado, na numeração histórica."}
              </span>
            </div>
          </div>
          <div className="w-full max-w-xs">
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">{analyzed} de {totalArtigos} analisados</span>
              <span className="font-heading text-3xl font-semibold text-primary">{pct}%</span>
            </div>
            <Progress value={pct} className="h-2.5" />
            <p className="mt-1.5 text-xs text-muted-foreground">
              concluído{versao === "proposta" ? " (escopo da proposta)" : ""}
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        {ORDER.map((s) => {
          const meta = STATUS_META[s];
          const Icon = meta.icon;
          const isPending = s === "nao_iniciado";
          return (
            <Card key={s} className="transition-shadow hover:shadow-md">
              <CardContent className="flex flex-col gap-1.5 p-3.5">
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                  <Icon className={`h-3.5 w-3.5 ${isPending ? "text-zinc-400" : ""}`} />
                  {meta.label}
                </span>
                <span className="text-2xl font-semibold tabular-nums">{counts[s]}</span>
                <StatusDot status={s} />
              </CardContent>
            </Card>
          );
        })}
        <Card className="transition-shadow hover:shadow-md">
          <CardContent className="flex flex-col gap-1.5 p-3.5">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
              Pendências
            </span>
            <span className="text-2xl font-semibold tabular-nums">{pendingCount}</span>
            <StatusDot status="em_discussao" />
          </CardContent>
        </Card>
      </div>

      <FirstSteps userId={user.id} />

      {(user.role === "coordenador" || user.role === "admin") && (
        <div className="flex flex-wrap items-center gap-2">
          <NewProvisionForm parentId={null} parentType="root" canEdit={true} types={["capitulo"]} label="Incluir capítulo" />
          <span className="text-xs text-muted-foreground">
            Capítulos e dispositivos novos entram como &quot;NOVO&quot;, com numeração definida na consolidação.
          </span>
        </div>
      )}

      {proximo && (
        <Link
          href={`/dispositivo/${proximo.id}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/5 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
        >
          Continuar de onde parou: {rotuloDe(proximo, numeros)} →
        </Link>
      )}

      <DashboardTree
        chapters={tree}
        notedIds={notedIds}
        pendenciasIds={pendenciasIds}
        versao={versao}
        numeros={Object.fromEntries(numeros)}
        contraparte={Object.fromEntries(contraparte)}
        sugeridos={Object.fromEntries(sugeridos)}
      />
    </div>
  );
}
