import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getTree, getStatusCounts, getArticleCount, provisionLabel } from "@/lib/data";
import { all } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatusDot, StatusBadge } from "@/components/status-badge";
import { NewProvisionForm } from "@/components/provision/provision-forms";
import { CheckCircle2, Circle, Loader2, PenLine, RotateCcw, AlertCircle, Layers } from "lucide-react";
import type { TreeNode } from "@/lib/data";

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

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const tree = await getTree();
  const counts = await getStatusCounts();
  const totalArtigos = await getArticleCount();
  const analyzed = totalArtigos - counts.nao_iniciado;
  const pct = totalArtigos ? Math.round((counts.aprovado / totalArtigos) * 100) : 0;
  const pendingCount = (await all<{ c: number }>("SELECT COUNT(*) c FROM pending_issues WHERE status = 'aberta'"))[0]?.c ?? 0;

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
              {totalArtigos} artigos organizados em {tree.length} capítulos. Analise dispositivo por
              dispositivo, apresente sugestões e acompanhe a consolidação do novo Estatuto.
            </p>
          </div>
          <div className="w-full max-w-xs">
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">{analyzed} de {totalArtigos} analisados</span>
              <span className="font-heading text-3xl font-semibold text-primary">{pct}%</span>
            </div>
            <Progress value={pct} className="h-2.5" />
            <p className="mt-1.5 text-xs text-muted-foreground">concluído</p>
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

      {(user.role === "coordenador" || user.role === "admin") && (
        <div className="flex flex-wrap items-center gap-2">
          <NewProvisionForm parentId={null} parentType="root" canEdit={true} types={["capitulo"]} label="Incluir capítulo" />
          <span className="text-xs text-muted-foreground">
            Capítulos e dispositivos novos entram como &quot;NOVO&quot;, com numeração definida na consolidação.
          </span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {tree.map((chapter) => (
          <ChapterSection key={chapter.id} chapter={chapter} />
        ))}
      </div>
    </div>
  );
}

function ChapterSection({ chapter }: { chapter: TreeNode }) {
  const approved = chapter.children.filter((c) => c.status === "aprovado").length;
  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-4 py-2.5">
        <Link href={`/dispositivo/${chapter.id}`} className="min-w-0 transition-opacity hover:opacity-80">
          <h3 className="truncate font-heading text-sm font-semibold leading-tight">
            {provisionLabel(chapter)}{chapter.titulo ? ` — ${chapter.titulo}` : ""}
          </h3>
        </Link>
        <Badge variant="secondary" className="shrink-0">
          {approved}/{chapter.child_count} aprovados
        </Badge>
      </div>
      <ul className="divide-y divide-border">
        {chapter.children.map((child) => (
          <DeviceRow key={child.id} node={child} depth={0} />
        ))}
      </ul>
    </section>
  );
}

function DeviceRow({ node, depth }: { node: TreeNode; depth: number }) {
  const label = provisionLabel(node);
  return (
    <li>
      <Link
        href={`/dispositivo/${node.id}`}
        className="group flex items-center justify-between gap-2 px-4 py-2 transition-colors hover:bg-muted/50"
        style={{ paddingLeft: `${16 + depth * 22}px` }}
      >
        <span className="flex min-w-0 items-center gap-2.5 text-sm">
          <StatusDot status={node.status} />
          <span className="font-medium transition-colors group-hover:text-primary">{label}</span>
          {node.titulo && (
            <span className="truncate text-muted-foreground">— {node.titulo}</span>
          )}
          {node.origem === "novo" && (
            <Badge variant="outline" className="shrink-0 border-primary/40 text-[10px] text-primary">novo</Badge>
          )}
        </span>
        <StatusBadge status={node.status} className="shrink-0" />
      </Link>
      {node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <DeviceRow key={child.id} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}