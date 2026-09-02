import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { get, all } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const PER_PAGE = 100;

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/");

  const sp = await searchParams;
  const page = Math.max(1, Number(sp?.page) || 1);
  const offset = (page - 1) * PER_PAGE;

  const total = (await get<{ c: number }>("SELECT COUNT(*) c FROM audit_logs"))?.c ?? 0;
  const logs = await all<{
    id: number; user_name: string | null; action: string; entity: string | null; entity_id: string | null; detail: string | null; created_at: string;
  }>("SELECT * FROM audit_logs ORDER BY id DESC LIMIT ? OFFSET ?", [PER_PAGE, offset]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Trilha de auditoria</h2>
        <p className="text-sm text-muted-foreground">Registro permanente das ações realizadas no sistema.</p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {total} registros · exibindo {offset + 1}–{Math.min(offset + PER_PAGE, total)} (página {page} de {totalPages})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum registro ainda.</p>
          ) : (
            <ul className="divide-y divide-border">
              {logs.map((l) => (
                <li key={l.id} className="py-2 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span>
                      <span className="font-medium">{l.action}</span>
                      {l.entity_id && <span className="text-muted-foreground"> ({l.entity_id})</span>}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(l.created_at + "Z").toLocaleString("pt-BR")} · {l.user_name || "sistema"}
                    </span>
                  </div>
                  {l.detail && <p className="whitespace-pre-wrap text-xs text-muted-foreground">{l.detail}</p>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        {page > 1 ? (
          <Link href={`/auditoria?page=${page - 1}`} className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted">
            Anterior
          </Link>
        ) : (
          <span className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium text-muted-foreground opacity-60">Anterior</span>
        )}
        <span className="text-xs text-muted-foreground">
          Página {page} de {totalPages}
        </span>
        {page < totalPages ? (
          <Link href={`/auditoria?page=${page + 1}`} className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted">
            Próxima
          </Link>
        ) : (
          <span className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium text-muted-foreground opacity-60">Próxima</span>
        )}
      </div>
    </div>
  );
}