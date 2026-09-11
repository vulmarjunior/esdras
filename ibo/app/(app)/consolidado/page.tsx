import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getTree, provisionLabel } from "@/lib/data";
import type { TreeNode } from "@/lib/data";
import { ApprovedBadge, NovoBadge } from "@/components/status-badge";
import { RichTextContent } from "@/components/rich-text-content";

export const dynamic = "force-dynamic";

export default async function ConsolidatedPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const tree = await getTree();
  const approvedCount = countApproved(tree);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Estatuto consolidado</h2>
        <p className="text-sm text-muted-foreground">
          Exibe exclusivamente os dispositivos aprovados, na ordem final. {approvedCount} dispositivo(s) aprovado(s).
        </p>
        <Link href="/revisao" className="mt-2 inline-block text-sm text-primary underline underline-offset-4">
          Comparar o Estatuto inteiro, incluindo os textos em revisão
        </Link>
      </div>

      {approvedCount === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum dispositivo aprovado ainda. Aprove dispositivos na tela de análise para compor o Estatuto consolidado.
        </p>
      ) : (
        <div className="rounded-xl border bg-card">
          {tree.map((chapter) => (
            <ChapterView key={chapter.id} node={chapter} />
          ))}
        </div>
      )}
    </div>
  );
}

function countApproved(nodes: TreeNode[]): number {
  let c = 0;
  for (const n of nodes) {
    if (n.status === "aprovado") c++;
    c += countApproved(n.children);
  }
  return c;
}

function ChapterView({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  const approved = node.status === "aprovado";
  const childrenApproved = node.children.filter((c) => c.status === "aprovado" || hasApproved(c));

  if (!approved && childrenApproved.length === 0) return null;

  const label = provisionLabel(node);
  const text = approved
    ? node.redacao_consolidada || node.redacao_trabalho || node.texto_vigente
    : "";

  return (
    <section className={depth === 0 ? "border-b" : "border-t"}>
      <div
        className="flex flex-wrap items-center justify-between gap-2 border-l-2 border-primary/40 px-4 py-2"
        style={{ paddingLeft: `${16 + depth * 20}px` }}
      >
        <h3 className="flex flex-wrap items-center gap-1.5 font-semibold leading-tight">
          {label}
          {node.titulo ? ` — ${node.titulo}` : ""}
          {node.origem === "novo" && <NovoBadge />}
        </h3>
        {approved && (
          <ApprovedBadge className="h-5 px-2 text-[11px]" />
        )}
      </div>
      {approved && text && (
        <div style={{ paddingLeft: `${16 + depth * 20}px` }}>
          <RichTextContent text={text} className="px-4 pb-3" />
        </div>
      )}
      {node.children.map((c) => (
        <ChapterView key={c.id} node={c} depth={depth + 1} />
      ))}
    </section>
  );
}

function hasApproved(node: TreeNode): boolean {
  if (node.status === "aprovado") return true;
  return node.children.some(hasApproved);
}
