import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { all } from "@/lib/db";
import { provisionLabel, getProvision } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PENDING_CATEGORY_LABELS } from "@/lib/labels";
import { PendingItem } from "@/components/provision/provision-forms";
import type { PendingIssue } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PendingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const pendings = await all<PendingIssue>(`
    SELECT p.*, u.name AS author_name FROM pending_issues p
    JOIN users u ON u.id = p.author_id
    ORDER BY p.status, p.id DESC`);

  const open = pendings.filter((p) => p.status === "aberta");
  const resolved = pendings.filter((p) => p.status === "resolvida");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Pendências</h2>
        <p className="text-sm text-muted-foreground">{open.length} aberta(s) · {resolved.length} resolvida(s)</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Abertas</h3>
          <div className="space-y-3">
            {open.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma pendência aberta.</p>}
            {open.map((p) => (
              <div key={p.id}>
                <PendingWithLink p={p} />
              </div>
            ))}
          </div>
        </section>
        <section>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Resolvidas</h3>
          <div className="space-y-3">
            {resolved.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma pendência resolvida.</p>}
            {resolved.map((p) => (
              <div key={p.id}>
                <PendingWithLink p={p} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

async function PendingWithLink({ p }: { p: PendingIssue }) {
  const prov = p.provision_id ? await getProvision(p.provision_id) : null;
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <Badge variant="outline">{PENDING_CATEGORY_LABELS[p.categoria] || p.categoria}</Badge>
          {prov ? (
            <Link href={`/dispositivo/${prov.id}`} className="text-xs text-primary hover:underline">
              {provisionLabel(prov)}
            </Link>
          ) : (
            <span className="text-xs text-muted-foreground">Sem dispositivo</span>
          )}
        </div>
        <p className="text-sm">{p.descricao}</p>
        <p className="mt-1 text-xs text-muted-foreground">{p.author_name} · {new Date(p.created_at + "Z").toLocaleString("pt-BR")}</p>
        {p.status === "aberta" && p.provision_id && (
          <div className="mt-2">
            <PendingItem p={p} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
