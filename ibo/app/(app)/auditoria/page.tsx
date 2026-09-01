import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { all } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/");

  const logs = all<{
    id: number; user_name: string | null; action: string; entity: string | null; entity_id: string | null; detail: string | null; created_at: string;
  }>("SELECT * FROM audit_logs ORDER BY id DESC LIMIT 200");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Trilha de auditoria</h2>
        <p className="text-sm text-muted-foreground">Registro permanente das ações realizadas no sistema.</p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{logs.length} registros mais recentes</CardTitle>
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
                  {l.detail && <p className="text-xs text-muted-foreground">{l.detail}</p>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
