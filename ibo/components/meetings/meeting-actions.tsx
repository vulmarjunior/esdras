"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createMeeting, updateMeeting, deleteMeeting, startMeeting, endMeeting, setPresence, addManualEvent, addDecision, generateMinutes, setMinutesStatus, saveMinutes, reviewMinutes, addMinuteRetification } from "@/app/actions/meetings";
import { ROLE_LABELS, STATUS_LABELS } from "@/lib/labels";
import { ConfirmDialog, type ConfirmDialogState } from "@/components/confirm-dialog";
import { Markdown } from "@/components/markdown";
import type { User } from "@/lib/types";
import { whatsappLink } from "@/lib/phone";
import { MessageCircle } from "lucide-react";

export function CreateMeetingForm({ users, canEdit }: { users: User[]; canEdit: boolean }) {
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const [form, setForm] = useState({
    numero: 1,
    data: new Date().toISOString().slice(0, 10),
    horario: "19:30",
    local: "",
    pauta: "",
    coordenador_id: "",
    secretario_id: "",
  });

  if (!canEdit) return null;

  async function submit() {
    setPending(true);
    const res = await createMeeting({
      numero: form.numero,
      data: form.data,
      horario: form.horario,
      local: form.local,
      pauta: form.pauta,
      coordenador_id: form.coordenador_id ? Number(form.coordenador_id) : null,
      secretario_id: form.secretario_id ? Number(form.secretario_id) : null,
    });
    setPending(false);
    if (res.error) return toast.error(res.error);
    toast.success(res.message || "Reunião criada.");
    setForm({ ...form, numero: form.numero + 1, local: "", pauta: "", coordenador_id: "", secretario_id: "" });
    router.refresh();
  }

  return (
    <details className="rounded-xl border bg-card">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Nova reunião</summary>
      <div className="grid gap-3 border-t p-4 sm:grid-cols-2">
        <label className="text-sm">
          Número
          <input type="number" min={1} value={form.numero} onChange={(e) => setForm({ ...form, numero: Number(e.target.value) })} className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm" />
        </label>
        <label className="text-sm">
          Data
          <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm" />
        </label>
        <label className="text-sm">
          Horário
          <input type="time" value={form.horario} onChange={(e) => setForm({ ...form, horario: e.target.value })} className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm" />
        </label>
        <label className="text-sm">
          Local
          <input value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm" />
        </label>
        <label className="text-sm sm:col-span-2">
          Pauta
          <textarea rows={2} value={form.pauta} onChange={(e) => setForm({ ...form, pauta: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
        </label>
        <label className="text-sm">
          Coordenador
          <select value={form.coordenador_id} onChange={(e) => setForm({ ...form, coordenador_id: e.target.value })} className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm">
            <option value="">—</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </label>
        <label className="text-sm">
          Secretário
          <select value={form.secretario_id} onChange={(e) => setForm({ ...form, secretario_id: e.target.value })} className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm">
            <option value="">—</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </label>
        <div className="sm:col-span-2">
          <Button type="button" onClick={submit} disabled={pending}>{pending ? "Criando..." : "Criar reunião"}</Button>
        </div>
      </div>
    </details>
  );
}

export function MeetingControls({
  meetingId,
  status,
  canEdit,
}: {
  meetingId: number;
  status: string;
  canEdit: boolean;
}) {
  const [pending, setPending] = useState(false);
  const router = useRouter();
  if (!canEdit) return null;
  async function go(fn: () => Promise<{ ok?: boolean; error?: string }>) {
    setPending(true);
    const res = await fn();
    setPending(false);
    if (res.error) return toast.error(res.error);
    toast.success("OK");
    router.refresh();
  }
  if (status === "planejada") {
    return <Button size="sm" disabled={pending} onClick={() => go(() => startMeeting(meetingId))}>Iniciar reunião</Button>;
  }
  if (status === "em_andamento") {
    return <Button size="sm" variant="destructive" disabled={pending} onClick={() => go(() => endMeeting(meetingId))}>Encerrar reunião</Button>;
  }
  return null;
}

export function EditMeetingForm({
  meetingId,
  initial,
  users,
  canEdit,
}: {
  meetingId: number;
  initial: { numero: number; data: string; horario: string | null; local: string | null; pauta: string | null; coordenador_id: number | null; secretario_id: number | null };
  users: User[];
  canEdit: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmDialogState | null>(null);
  const router = useRouter();
  const [form, setForm] = useState({
    numero: initial.numero,
    data: initial.data,
    horario: initial.horario || "19:30",
    local: initial.local || "",
    pauta: initial.pauta || "",
    coordenador_id: initial.coordenador_id ? String(initial.coordenador_id) : "",
    secretario_id: initial.secretario_id ? String(initial.secretario_id) : "",
  });

  if (!canEdit) return null;

  async function save() {
    setPending(true);
    const res = await updateMeeting(meetingId, {
      numero: form.numero,
      data: form.data,
      horario: form.horario,
      local: form.local,
      pauta: form.pauta,
      coordenador_id: form.coordenador_id ? Number(form.coordenador_id) : null,
      secretario_id: form.secretario_id ? Number(form.secretario_id) : null,
    });
    setPending(false);
    if (res.error) return toast.error(res.error);
    toast.success(res.message || "Reunião atualizada.");
    setOpen(false);
    router.refresh();
  }

  async function remove() {
    setPending(true);
    const res = await deleteMeeting(meetingId);
    setPending(false);
    setConfirmState(null);
    if (res.error) return toast.error(res.error);
    toast.success("Reunião excluída.");
    router.push("/reunioes");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" onClick={() => setOpen(!open)}>
        {open ? "Fechar edição" : "Editar reunião"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
        onClick={() =>
          setConfirmState({
            title: `Excluir Reunião nº ${initial.numero}`,
            description:
              "Todos os eventos, presenças, deliberações e minutas vinculados a esta reunião serão removidos permanentemente. Esta ação não pode ser desfeita.",
            confirmLabel: "Excluir reunião",
          })
        }
      >
        Excluir reunião
      </Button>
      {open && (
        <div className="grid w-full gap-3 rounded-xl border bg-muted/30 p-4 sm:grid-cols-2">
          <label className="text-sm">
            Número
            <input type="number" min={1} value={form.numero} onChange={(e) => setForm({ ...form, numero: Number(e.target.value) })} className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm" />
          </label>
          <label className="text-sm">
            Data
            <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm" />
          </label>
          <label className="text-sm">
            Horário
            <input type="time" value={form.horario} onChange={(e) => setForm({ ...form, horario: e.target.value })} className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm" />
          </label>
          <label className="text-sm">
            Local
            <input value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm" />
          </label>
          <label className="text-sm sm:col-span-2">
            Pauta
            <textarea rows={2} value={form.pauta} onChange={(e) => setForm({ ...form, pauta: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
          </label>
          <label className="text-sm">
            Coordenador
            <select value={form.coordenador_id} onChange={(e) => setForm({ ...form, coordenador_id: e.target.value })} className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm">
              <option value="">—</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </label>
          <label className="text-sm">
            Secretário
            <select value={form.secretario_id} onChange={(e) => setForm({ ...form, secretario_id: e.target.value })} className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm">
              <option value="">—</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="button" size="sm" onClick={save} disabled={pending}>{pending ? "Salvando..." : "Salvar alterações"}</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          </div>
        </div>
      )}
      <ConfirmDialog state={confirmState} pending={pending} onConfirm={remove} onClose={() => setConfirmState(null)} />
    </div>
  );
}

export function PresenceList({
  meetingId,
  members,
  canEdit,
}: {
  meetingId: number;
  members: { user_id: number; name: string; role: string; presente: number; phone: string | null }[];
  canEdit: boolean;
}) {
  const [pending, setPending] = useState<number | null>(null);
  const router = useRouter();
  const present = members.filter((m) => m.presente).length;
  async function toggle(userId: number, presente: boolean) {
    setPending(userId);
    await setPresence(meetingId, userId, !presente);
    setPending(null);
    router.refresh();
  }
  return (
    <div>
      <p className="mb-2 text-sm text-muted-foreground">Presentes: {present}/{members.length}</p>
      <ul className="space-y-1">
        {members.map((m) => {
          const wa = whatsappLink(m.phone);
          return (
            <li key={m.user_id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-sm">
              <span className="min-w-0">
                {m.name} <span className="text-xs text-muted-foreground">({ROLE_LABELS[m.role]})</span>
                {wa && (
                  <a
                    href={wa}
                    target="_blank"
                    rel="noreferrer"
                    title="Chamar no WhatsApp"
                    className="ml-2 inline-flex items-center gap-1 align-middle text-xs text-emerald-700 hover:underline dark:text-emerald-300"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </a>
                )}
              </span>
              {canEdit ? (
                <Button size="sm" variant={m.presente ? "default" : "outline"} disabled={pending === m.user_id} onClick={() => toggle(m.user_id, !!m.presente)}>
                  {m.presente ? "Presente" : "Ausente"}
                </Button>
              ) : (
                <span className="text-xs font-medium text-muted-foreground">{m.presente ? "Presente" : "Ausente"}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ManualEventForm({ meetingId, canEdit }: { meetingId: number; canEdit: boolean }) {
  const [desc, setDesc] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();
  if (!canEdit) return null;
  async function submit() {
    setPending(true);
    const res = await addManualEvent(meetingId, desc);
    setPending(false);
    if (res.error) return toast.error(res.error);
    setDesc("");
    router.refresh();
  }
  return (
    <div className="flex gap-2">
      <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Registrar evento da sessão..." className="h-9 w-full rounded-md border bg-background px-3 text-sm" />
      <Button size="sm" type="button" onClick={submit} disabled={pending || !desc.trim()}>Registrar</Button>
    </div>
  );
}

export function DecisionForm({ meetingId, provisions, canEdit }: { meetingId: number; provisions: { id: string; label: string }[]; canEdit: boolean }) {
  const [form, setForm] = useState({ provision_id: "", tipo: "aprovacao", texto: "" });
  const [pending, setPending] = useState(false);
  const router = useRouter();
  if (!canEdit) return null;
  async function submit() {
    setPending(true);
    const res = await addDecision(meetingId, form.provision_id || null, form.tipo, form.texto);
    setPending(false);
    if (res.error) return toast.error(res.error);
    toast.success("Deliberação " + (res.message || "registrada"));
    setForm({ provision_id: "", tipo: "aprovacao", texto: "" });
    router.refresh();
  }
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <select value={form.provision_id} onChange={(e) => setForm({ ...form, provision_id: e.target.value })} className="h-9 rounded-md border bg-background px-2 text-sm">
          <option value="">Sem dispositivo vinculado</option>
          {provisions.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="h-9 rounded-md border bg-background px-2 text-sm">
          <option value="aprovacao">Aprovação</option>
          <option value="manutencao">Manter redação atual</option>
          <option value="incorporacao">Incorporar sugestão de redação</option>
          <option value="rejeicao">Rejeitar sugestão de redação</option>
          <option value="alteracao">Alterar redação</option>
          <option value="adiamento">Adiar análise</option>
          <option value="outra">Outra</option>
        </select>
      </div>
      <textarea rows={2} value={form.texto} onChange={(e) => setForm({ ...form, texto: e.target.value })} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Texto da deliberação..." />
      <Button size="sm" type="button" onClick={submit} disabled={pending || !form.texto.trim()}>Registrar deliberação</Button>
    </div>
  );
}

export function MinutesPanel({
  meetingId,
  minutes,
  canEdit,
  reviews,
  retifications,
}: {
  meetingId: number;
  minutes: { id: number; status: string; conteudo: string | null } | null;
  canEdit: boolean;
  reviews: { opinion: string; content: string | null; name: string; created_at: string }[];
  retifications?: { content: string; name: string; created_at: string }[];
}) {
  const [aiLoading, setAiLoading] = useState(false);
  const [retOpen, setRetOpen] = useState(false);
  const [retText, setRetText] = useState("");
  const [retPending, setRetPending] = useState(false);
  const router = useRouter();

  async function gen() {
    const res = await generateMinutes(meetingId);
    if (res.error) return toast.error(res.error);
    toast.success(res.message || "Minuta gerada.");
    router.refresh();
  }

  async function enhance() {
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "minuta", meetingId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro na IA");
      await saveMinutes(meetingId, data.result);
      toast.success("Minuta reescrita pela IA. Revise antes de aprovar.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar minuta com IA.");
    } finally {
      setAiLoading(false);
    }
  }

  async function setStatus(status: string) {
    if (!minutes) return;
    await setMinutesStatus(minutes.id, status);
    router.refresh();
  }

  async function retificar() {
    if (!minutes || !retText.trim()) return;
    setRetPending(true);
    const res = await addMinuteRetification(minutes.id, retText);
    setRetPending(false);
    if (res.error) return toast.error(res.error);
    toast.success(res.message || "Retificação registrada.");
    setRetText("");
    setRetOpen(false);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {canEdit && (
          <>
            <Button size="sm" variant="outline" onClick={gen}>Gerar minuta da ata</Button>
            <Button size="sm" variant="outline" onClick={enhance} disabled={aiLoading}>
              {aiLoading ? "Gerando..." : "Redigir minuta com IA"}
            </Button>
          </>
        )}
        {minutes && canEdit && (
          <>
            {minutes.status === "rascunho" && <Button size="sm" onClick={() => setStatus("em_revisao")}>Enviar para revisão</Button>}
            {minutes.status === "em_revisao" && <Button size="sm" onClick={() => setStatus("aprovada")}>Aprovar ata</Button>}
          </>
        )}
        {minutes && <span className="text-xs text-muted-foreground">Status: {STATUS_LABELS[minutes.status] || minutes.status}</span>}
      {minutes?.status === "aprovada" && (
        <>
          <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/40" onClick={() => setRetOpen((v) => !v)}>
            {retOpen ? "Cancelar retificação" : "Retificar ata"}
          </Button>
          {retOpen && (
            <div className="space-y-2 rounded-lg border border-amber-300/60 bg-amber-50/40 p-3 dark:border-amber-800/60 dark:bg-amber-950/20">
              <p className="text-xs text-muted-foreground">
                Ata aprovada fica bloqueada. Correções são registradas como retificação, preservando o texto aprovado.
              </p>
              <textarea rows={3} value={retText} onChange={(e) => setRetText(e.target.value)} placeholder="Descreva a correção..." className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
              <Button size="sm" type="button" onClick={retificar} disabled={retPending || !retText.trim()}>
                Registrar retificação
              </Button>
            </div>
          )}
        </>
      )}
      {(retifications ?? []).length > 0 && (
        <div className="space-y-2">
          <h5 className="text-sm font-medium text-amber-700 dark:text-amber-300">Retificações</h5>
          {retifications!.map((r, i) => (
            <div key={i} className="rounded-lg border border-amber-200/70 bg-amber-50/30 p-2 text-sm dark:border-amber-800/50 dark:bg-amber-950/10">
              <p className="text-xs text-muted-foreground">{r.name || "—"} · {new Date(r.created_at + "Z").toLocaleString("pt-BR")}</p>
              <p className="mt-1">{r.content}</p>
            </div>
          ))}
        </div>
      )}
      </div>

      {minutes?.conteudo && (
        <div className="rounded-lg border bg-muted/40 p-4">
          <Markdown>{minutes.conteudo}</Markdown>
        </div>
      )}

      {reviews.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-sm font-medium">Revisões</h5>
          {reviews.map((r, i) => (
            <div key={i} className="rounded-lg border p-2 text-sm">
              <p className="text-xs text-muted-foreground">{r.name} · {r.opinion} · {new Date(r.created_at + "Z").toLocaleString("pt-BR")}</p>
              {r.content && <p className="mt-1">{r.content}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ReviewAtaForm({ minutesId }: { minutesId: number }) {
  const [opinion, setOpinion] = useState("concordo");
  const [content, setContent] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();
  async function submit() {
    setPending(true);
    await reviewMinutes(minutesId, opinion, content);
    setPending(false);
    setContent("");
    router.refresh();
  }
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <select value={opinion} onChange={(e) => setOpinion(e.target.value)} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
        <option value="concordo">Concordo</option>
        <option value="correcao">Solicitar correção</option>
        <option value="ressalva">Ressalva</option>
      </select>
      <textarea rows={2} value={content} onChange={(e) => setContent(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Observações (opcional)" />
      <Button size="sm" type="button" onClick={submit} disabled={pending}>Registrar parecer</Button>
    </div>
  );
}
