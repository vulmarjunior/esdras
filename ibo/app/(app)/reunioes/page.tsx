import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { all } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateMeetingForm } from "@/components/meetings/meeting-actions";
import type { User } from "@/lib/types";

export const dynamic = "force-dynamic";

const MEETING_STATUS: Record<string, string> = {
  planejada: "Planejada",
  em_andamento: "Em andamento",
  encerrada: "Encerrada",
};

export default async function MeetingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const meetings = all<{
    id: number; numero: number; data: string; horario: string | null; status: string;
    coordenador: string | null; secretario: string | null; decisoes: number;
  }>(`
    SELECT m.*, cu.name AS coordenador, su.name AS secretario,
      (SELECT COUNT(*) FROM meeting_decisions md WHERE md.meeting_id = m.id) AS decisoes
    FROM meetings m
    LEFT JOIN users cu ON cu.id = m.coordenador_id
    LEFT JOIN users su ON su.id = m.secretario_id
    ORDER BY m.data DESC, m.numero DESC`);

  const users = all<User>("SELECT id, name, email, role, created_at FROM users ORDER BY name");
  const canEdit = user.role === "coordenador" || user.role === "admin";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Reuniões</h2>
        <p className="text-sm text-muted-foreground">Módulo de reuniões, deliberações e atas da comissão.</p>
      </div>

      <CreateMeetingForm users={users} canEdit={canEdit} />

      {meetings.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma reunião cadastrada ainda.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {meetings.map((m) => (
            <Link key={m.id} href={`/reunioes/${m.id}`} className="transition-opacity hover:opacity-90">
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">Reunião nº {m.numero}</CardTitle>
                    <Badge variant={m.status === "em_andamento" ? "default" : m.status === "encerrada" ? "secondary" : "outline"}>
                      {MEETING_STATUS[m.status]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-muted-foreground">
                  <p className="text-foreground">{m.data}{m.horario ? ` às ${m.horario}` : ""}</p>
                  {m.coordenador && <p>Coordenação: {m.coordenador}</p>}
                  {m.secretario && <p>Secretário(a): {m.secretario}</p>}
                  <p>{m.decisoes} deliberação(ões)</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
