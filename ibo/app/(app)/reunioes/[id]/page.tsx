import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { get, all } from "@/lib/db";
import { provisionLabel } from "@/lib/data";
import type { User } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MeetingControls,
  EditMeetingForm,
  PresenceList,
  ManualEventForm,
  DecisionForm,
  MinutesPanel,
  ReviewAtaForm,
} from "@/components/meetings/meeting-actions";
import { ApproveDeviceForm } from "@/components/provision/provision-forms";
import { MeetingPresence } from "@/components/meetings/meeting-presence";

export const dynamic = "force-dynamic";

const MEETING_STATUS: Record<string, string> = {
  planejada: "Planejada",
  em_andamento: "Em andamento",
  encerrada: "Encerrada",
};

const DECISION_TYPE_LABELS: Record<string, string> = {
  aprovacao: "Aprovação",
  manutencao: "Manter redação atual",
  incorporacao: "Incorporar sugestão",
  rejeicao: "Rejeitar sugestão",
  alteracao: "Alterar redação",
  adiamento: "Adiar análise",
  outra: "Outra",
};

export default async function MeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meetingId = Number(id);
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const meeting = await get<{
    id: number; numero: number; data: string; horario: string | null; local: string | null; pauta: string | null;
    status: string; started_at: string | null; ended_at: string | null;
    coordenador_id: number | null; secretario_id: number | null;
    coordenador: string | null; secretario: string | null;
  }>(`
    SELECT m.*, cu.name AS coordenador, su.name AS secretario
    FROM meetings m
    LEFT JOIN users cu ON cu.id = m.coordenador_id
    LEFT JOIN users su ON su.id = m.secretario_id
    WHERE m.id = ?`, [meetingId]);
  if (!meeting) notFound();

  const canEdit = user.role === "coordenador" || user.role === "admin";

  const members = await all<{ user_id: number; name: string; role: string; presente: number; phone: string | null }>(`
    SELECT mm.user_id, u.name, u.role, mm.presente, u.phone
    FROM meeting_members mm JOIN users u ON u.id = mm.user_id
    WHERE mm.meeting_id = ? ORDER BY u.name`, [meetingId]);

  const events = await all<{ id: number; hora: string; tipo: string; descricao: string; user_name: string | null }>(`
    SELECT e.*, u.name AS user_name FROM meeting_events e
    LEFT JOIN users u ON u.id = e.user_id
    WHERE e.meeting_id = ? ORDER BY e.id`, [meetingId]);

  const decisions = await all<{ id: number; code: string; provision_id: string | null; provision_ref: string | null; tipo: string; texto: string; user_name: string | null; created_at: string }>(`
    SELECT md.*, p.numero AS provision_ref, u.name AS user_name
    FROM meeting_decisions md
    LEFT JOIN provisions p ON p.id = md.provision_id
    LEFT JOIN users u ON u.id = md.user_id
    WHERE md.meeting_id = ? ORDER BY md.id`, [meetingId]);

  const minutes = (await get<{ id: number; status: string; conteudo: string | null }>(
    "SELECT id, status, conteudo FROM minutes WHERE meeting_id = ?", [meetingId])) ?? null;

  const reviews = minutes
    ? await all<{ opinion: string; content: string | null; name: string; created_at: string }>(`
        SELECT mr.opinion, mr.content, u.name, mr.created_at FROM minutes_reviews mr
        JOIN users u ON u.id = mr.user_id WHERE mr.minutes_id = ? ORDER BY mr.id`, [minutes.id])
    : [];

  const retifications = minutes
    ? await all<{ content: string; name: string; created_at: string }>(`
        SELECT mr.content, u.name, mr.created_at FROM minutes_retifications mr
        JOIN users u ON u.id = mr.author_id WHERE mr.minutes_id = ? ORDER BY mr.id`, [minutes.id])
    : [];

  const provisions = await all<{ id: string; type: string; numero: string }>(
    "SELECT id, type, numero FROM provisions WHERE type IN ('artigo','capitulo') ORDER BY ordem");

  const allUsers = await all<User>("SELECT id, name, email, role, created_at FROM users ORDER BY name");

  const presentCount = members.filter((m) => m.presente).length;
  const aprovados = decisions.filter((d) => d.tipo === "aprovacao").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Reunião nº {meeting.numero}</h2>
          <p className="text-sm text-muted-foreground">
            {meeting.data}{meeting.horario ? ` às ${meeting.horario}` : ""}
            {meeting.local ? ` · ${meeting.local}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant={meeting.status === "em_andamento" ? "default" : "outline"}>{MEETING_STATUS[meeting.status]}</Badge>
            {meeting.coordenador && <Badge variant="secondary">Coordenação: {meeting.coordenador}</Badge>}
            {meeting.secretario && <Badge variant="secondary">Secretário(a): {meeting.secretario}</Badge>}
          </div>
          {meeting.pauta && (
            <p className="mt-2 text-sm text-muted-foreground"><span className="font-medium text-foreground">Pauta:</span> {meeting.pauta}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <MeetingControls meetingId={meetingId} status={meeting.status} canEdit={canEdit} />
          <EditMeetingForm
            meetingId={meetingId}
            initial={{
              numero: meeting.numero,
              data: meeting.data,
              horario: meeting.horario,
              local: meeting.local,
              pauta: meeting.pauta,
              coordenador_id: meeting.coordenador_id,
              secretario_id: meeting.secretario_id,
            }}
            users={allUsers}
            canEdit={canEdit}
          />
        </div>
      </div>

      {meeting.status === "em_andamento" && (
        <div className="rounded-lg border bg-primary/5 px-4 py-2 text-sm font-medium">
          Modo Reunião ativo — presença {presentCount}/{members.length}
        </div>
      )}

      <MeetingPresence meetingId={meetingId} userId={user.id} userName={user.name} userRole={user.role} />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Presença</CardTitle>
          </CardHeader>
          <CardContent>
            <PresenceList meetingId={meetingId} members={members} canEdit={canEdit} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registro da sessão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ManualEventForm meetingId={meetingId} canEdit={canEdit} />
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {events.map((e) => (
                  <li key={e.id} className="flex gap-2">
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">{e.hora}</span>
                    <span>{e.descricao}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Deliberações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ApproveDeviceForm devices={provisions.map((p) => ({ id: p.id, label: provisionLabel(p as never) }))} canEdit={canEdit} />
          <DecisionForm meetingId={meetingId} provisions={provisions.map((p) => ({ id: p.id, label: provisionLabel(p as never) }))} canEdit={canEdit} />
          {decisions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma deliberação registrada.</p>
          ) : (
            <ul className="space-y-2">
              {decisions.map((d) => (
                <li key={d.id} className="rounded-lg border p-3 text-sm">
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-xs font-medium">{d.code}</span>
                    <div className="flex gap-1.5">
                      {d.provision_ref && <Badge variant="outline">{d.provision_ref}</Badge>}
                      <Badge variant="secondary">{DECISION_TYPE_LABELS[d.tipo] || d.tipo}</Badge>
                    </div>
                  </div>
                  <p>{d.texto}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {d.user_name || "—"} · {new Date(d.created_at + "Z").toLocaleString("pt-BR")}
                    {d.provision_id && <span className="ml-1">· <a className="text-primary hover:underline" href={`/dispositivo/${d.provision_id}`}>abrir dispositivo</a></span>}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <MinutesPanel meetingId={meetingId} minutes={minutes} canEdit={canEdit} reviews={reviews} retifications={retifications} />
          {minutes && minutes.status === "em_revisao" && <ReviewAtaForm minutesId={minutes.id} />}
        </CardContent>
      </Card>

      {meeting.status === "encerrada" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Deliberações" value={decisions.length} />
          <Stat label="Aprovações" value={aprovados} />
          <Stat label="Presentes" value={`${presentCount}/${members.length}`} />
          <Stat label="Eventos registrados" value={events.length} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
