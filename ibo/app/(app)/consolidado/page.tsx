import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getProposalTree, getNumerosArmazenados, provisionLabel, type TreeNode } from "@/lib/data";
import { numeracaoDesatualizada, numerarArvore } from "@/lib/numeracao";
import { EstatutoView, type ItemEstatuto } from "@/components/consolidado/estatuto-view";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function flattenItens(tree: TreeNode[], vigentes: Map<string, string>): ItemEstatuto[] {
  const itens: ItemEstatuto[] = [];
  const walk = (nodes: TreeNode[], depth: number, chapter: TreeNode | null) => {
    for (const n of nodes) {
      const cap = n.type === "capitulo" ? n : chapter;
      itens.push({
        id: n.id,
        type: n.type,
        numero: n.numero,
        numeroVigente: vigentes.get(n.id) ?? null,
        titulo: n.titulo,
        status: n.status,
        origem: n.origem,
        alteracaoTipo: n.alteracao_tipo,
        texto: n.redacao_consolidada || n.redacao_trabalho || n.proposta_inicial || n.texto_vigente || "",
        depth,
        chapterId: cap?.id ?? n.id,
        chapterLabel: cap ? provisionLabel(cap) : "",
        chapterTitulo: cap?.titulo ?? null,
        chapterNumeroVigente: cap ? vigentes.get(cap.id) ?? null : null,
      });
      walk(n.children, depth + 1, cap);
    }
  };
  walk(tree, 0, null);
  return itens;
}

export default async function ConsolidatedPage({
  searchParams,
}: {
  searchParams: Promise<{ modo?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { modo: modoParam } = await searchParams;
  const modo = modoParam === "aprovados" ? "aprovados" : "construcao";

  // Ordem e numeração da proposta (o documento final da reforma).
  const tree = await getProposalTree();
  const vigentes = await getNumerosArmazenados("vigente");
  const itens = flattenItens(tree, vigentes);
  const divergentes = numeracaoDesatualizada(
    new Map(itens.map((i) => [i.id, i.numero])),
    numerarArvore(tree)
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Estatuto em construção</h2>
        <p className="text-sm text-muted-foreground">
          O novo Estatuto sendo montado: ordem e numeração da proposta, textos atuais, dispositivos novos e revogados.
        </p>
        <div className="mt-3 inline-flex items-center rounded-full border bg-background p-0.5">
          <Link
            href="/consolidado"
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              modo === "construcao" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            )}
          >
            Em construção
          </Link>
          <Link
            href="/consolidado?modo=aprovados"
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              modo === "aprovados" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            )}
          >
            Redações concluídas
          </Link>
        </div>
        <Link href="/revisao" className="ml-3 inline-block text-sm text-primary underline underline-offset-4">
          Comparar o Estatuto inteiro, incluindo os textos em revisão
        </Link>
        {divergentes > 0 && (
          <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            A numeração da proposta ainda diverge da ordem atual em {divergentes} dispositivo(s). Antes de usar este
            documento, reordene e aplique a numeração em{" "}
            <Link href="/renumeracao" className="underline">
              Renumeração
            </Link>
            .
          </p>
        )}
      </div>

      <EstatutoView itens={itens} modo={modo} />
    </div>
  );
}
