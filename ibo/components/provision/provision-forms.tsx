"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SUGGESTION_COLORS } from "@/components/status-badge";
import {
  createSuggestion,
  updateSuggestionStatus,
  createComment,
  createPendingIssue,
  resolvePending,
  createReference,
  vote,
  removeVote,
  setStatus,
  updateJustificativa,
  updateHistoricalText,
  createProvision,
  updateProvision,
  deleteProvision,
} from "@/app/actions/provision";
import { SUGGESTION_STATUS_LABELS, PENDING_CATEGORY_LABELS, REFERENCE_TYPE_LABELS, STATUS_LABELS, PROVISION_TYPE_LABELS } from "@/lib/labels";
import { ConfirmDialog, type ConfirmDialogState } from "@/components/confirm-dialog";
import type { Suggestion, Comment, PendingIssue } from "@/lib/types";

function SubmitBtn({ label, pending, onClick }: { label: string; pending: boolean; onClick: () => void }) {
  return (
    <Button type="button" size="sm" disabled={pending} onClick={onClick}>
      {pending ? "Salvando..." : label}
    </Button>
  );
}

export function StatusControl({
  provisionId,
  status,
  canEdit,
}: {
  provisionId: string;
  status: string;
  canEdit: boolean;
}) {
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const statuses = ["nao_iniciado", "em_analise", "em_discussao", "redacao_definida", "aprovado", "reaberto"];
  if (!canEdit) {
    return <Badge>{STATUS_LABELS[status]}</Badge>;
  }
  async function go(next: string) {
    setPending(true);
    const res = await setStatus(provisionId, next);
    setPending(false);
    if (res.error) return toast.error(res.error);
    toast.success(next === "aprovado" ? "Dispositivo aprovado e redação consolidada." : `Status: ${STATUS_LABELS[next]}`);
    router.refresh();
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-sm font-medium text-muted-foreground">Status:</span>
      {statuses.map((s) => {
        const active = s === status;
        return (
          <Button
            key={s}
            size="sm"
            variant={active ? "default" : "outline"}
            disabled={pending}
            onClick={() => go(s)}
            title={s === "aprovado" ? "Aprova o dispositivo e congela a redação consolidada" : undefined}
            className={cn(
              active &&
                (s === "aprovado"
                  ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
                  : s === "reaberto"
                    ? "border-red-600 bg-red-600 text-white hover:bg-red-700"
                    : s === "em_discussao"
                      ? "border-amber-500 bg-amber-500 text-white hover:bg-amber-600"
                      : undefined)
            )}
          >
            {STATUS_LABELS[s]}
          </Button>
        );
      })}
    </div>
  );
}

export function NewProvisionForm({
  parentId,
  parentType,
  canEdit,
}: {
  parentId: string | null;
  parentType: string;
  canEdit: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ tipo: "", texto: "", justificativa: "" });
  const [pending, setPending] = useState(false);
  const router = useRouter();

  const allowed: Record<string, string[]> = {
    capitulo: ["secao", "artigo"],
    secao: ["artigo"],
    artigo: ["paragrafo", "inciso"],
    paragrafo: ["inciso", "alinea"],
    inciso: ["alinea"],
    alinea: [],
  };
  const tipos = parentId ? allowed[parentType] || [] : ["capitulo", "secao", "artigo"];

  if (!canEdit) return null;

  async function submit() {
    setPending(true);
    const res = await createProvision(parentId, form.tipo, form.texto, form.justificativa);
    setPending(false);
    if (res.error) return toast.error(res.error);
    toast.success(res.message || "Dispositivo criado.");
    setForm({ tipo: "", texto: "", justificativa: "" });
    setOpen(false);
    router.refresh();
    if (res.id) {
      setTimeout(() => router.push(`/dispositivo/${res.id}`), 400);
    }
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="border-primary/30 text-primary hover:bg-primary/5">
        Incluir dispositivo
      </Button>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <p className="text-sm font-medium">Novo dispositivo</p>
      <select
        value={form.tipo}
        onChange={(e) => setForm({ ...form, tipo: e.target.value })}
        className="h-9 w-full rounded-md border bg-background px-2 text-sm"
      >
        <option value="">Escolha o tipo...</option>
        {tipos.map((t) => (
          <option key={t} value={t}>{PROVISION_TYPE_LABELS[t]}</option>
        ))}
      </select>
      <textarea
        rows={3}
        value={form.texto}
        onChange={(e) => setForm({ ...form, texto: e.target.value })}
        placeholder="Texto do novo dispositivo (redação inicial da comissão)..."
        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
      />
      <textarea
        rows={2}
        value={form.justificativa}
        onChange={(e) => setForm({ ...form, justificativa: e.target.value })}
        placeholder="Justificativa (opcional)"
        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
      />
      <div className="flex flex-wrap items-center gap-2">
        <SubmitBtn label="Criar dispositivo" pending={pending} onClick={submit} />
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
        <span className="text-xs text-muted-foreground">
          Sem número definitivo — a numeração será definida na consolidação.
        </span>
      </div>
    </div>
  );
}

export function ProvisionAdminActions({
  provisionId,
  origem,
  childCount,
  canEdit,
}: {
  provisionId: string;
  origem: string;
  childCount: number;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmDialogState | null>(null);
  const [form, setForm] = useState({ numero: "", titulo: "", posicaoSugerida: "" });
  const router = useRouter();

  if (!canEdit) return null;

  async function save() {
    setPending(true);
    const res = await updateProvision(provisionId, form);
    setPending(false);
    if (res.error) return toast.error(res.error);
    toast.success(res.message || "Dispositivo atualizado.");
    setEditing(false);
    router.refresh();
  }

  async function remove() {
    setPending(true);
    const res = await deleteProvision(provisionId);
    setPending(false);
    setConfirmState(null);
    if (res.error) return toast.error(res.error);
    toast.success(res.message || "Dispositivo excluído.");
    router.push("/");
    router.refresh();
  }

  function askRemove() {
    const base =
      "Todas as sugestões, comentários, pendências, referências, versões e vínculos associados a ele serão removidos permanentemente. Esta ação não pode ser desfeita.";
    setConfirmState({
      title: "Excluir dispositivo",
      description:
        childCount > 0
          ? `Este dispositivo possui ${childCount} dispositivo(s) filho(s), que também serão excluídos.\n\n${base}`
          : base,
      confirmLabel: "Excluir dispositivo",
    });
  }

  return (
    <div className="space-y-2">
      {editing && (
        <div className="grid gap-2 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:grid-cols-3">
          <label className="text-sm">
            Número (provisório)
            <input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} placeholder="Ex.: 2º, I, a — deixe vazio para 'NOVO'" className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm" />
          </label>
          <label className="text-sm">
            Título (capítulos/seções)
            <input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm" />
          </label>
          <label className="text-sm">
            Posição sugerida
            <input value={form.posicaoSugerida} onChange={(e) => setForm({ ...form, posicaoSugerida: e.target.value })} placeholder="Ex.: Após o atual Art. 12" className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm" />
          </label>
          <div className="flex gap-2 sm:col-span-3">
            <SubmitBtn label="Salvar" pending={pending} onClick={save} />
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => { setForm({ numero: "", titulo: "", posicaoSugerida: "" }); setEditing(!editing); }}>
          {editing ? "Fechar edição" : "Editar dispositivo"}
        </Button>
        {origem !== "original" && (
          <Button
            size="sm"
            variant="outline"
            className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
            onClick={askRemove}
          >
            Excluir dispositivo
          </Button>
        )}
        {origem === "original" && (
          <span className="text-xs text-muted-foreground">
            Dispositivo original: para removê-lo do texto final, altere o status para &quot;revogado&quot;.
          </span>
        )}
      </div>
      <ConfirmDialog state={confirmState} pending={pending} onConfirm={remove} onClose={() => setConfirmState(null)} />
    </div>
  );
}

export function SuggestionForm({ provisionId }: { provisionId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const [form, setForm] = useState({ texto: "", justificativa: "", ondeEsta: "" });

  async function submit() {
    setPending(true);
    const res = await createSuggestion(provisionId, form.texto, form.justificativa, form.ondeEsta);
    setPending(false);
    if (res.error) return toast.error(res.error);
    toast.success("Sugestão registrada.");
    setForm({ texto: "", justificativa: "", ondeEsta: "" });
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Nova sugestão
      </Button>
    );
  }
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Onde está (opcional)</label>
        <textarea rows={2} value={form.ondeEsta} onChange={(e) => setForm({ ...form, ondeEsta: e.target.value })} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Trecho atual que se pretende alterar..." />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Sugiro</label>
        <textarea rows={3} value={form.texto} onChange={(e) => setForm({ ...form, texto: e.target.value })} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Texto sugerido..." />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Justificativa</label>
        <textarea rows={2} value={form.justificativa} onChange={(e) => setForm({ ...form, justificativa: e.target.value })} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Por que sugerir esta alteração?" />
      </div>
      <div className="flex gap-2">
        <SubmitBtn label="Registrar sugestão" pending={pending} onClick={submit} />
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </div>
  );
}

export function SuggestionItem({ sug, canManage }: { sug: Suggestion; canManage: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const statuses = ["aberta", "em_discussao", "aceita", "aceita_parcialmente", "rejeitada", "retirada"];

  async function go(status: string) {
    setPending(true);
    await updateSuggestionStatus(sug.id, status);
    setPending(false);
    router.refresh();
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          <span className="font-mono text-muted-foreground/70">#{sug.id}</span> — {sug.author_name} ·{" "}
          {new Date(sug.created_at + "Z").toLocaleString("pt-BR")}
        </span>
        <span
          className={cn(
            "inline-flex h-5 w-fit items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
            SUGGESTION_COLORS[sug.status] || "border-border bg-muted text-muted-foreground"
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full bg-current opacity-70")} />
          {SUGGESTION_STATUS_LABELS[sug.status] || sug.status}
        </span>
      </div>
      {sug.onde_esta && (
        <div className="mb-2 rounded-lg border border-red-200/60 bg-red-50/40 p-2.5 text-sm dark:border-red-800/60 dark:bg-red-950/20">
          <span className="font-semibold text-red-700 dark:text-red-300">Onde está:</span>{" "}
          <span className="text-muted-foreground line-through decoration-red-300/60">{sug.onde_esta}</span>
        </div>
      )}
      <div className="rounded-lg border border-emerald-200/60 bg-emerald-50/40 p-2.5 text-sm dark:border-emerald-800/60 dark:bg-emerald-950/20">
        <span className="font-semibold text-emerald-700 dark:text-emerald-300">Sugiro:</span>{" "}
        <span className="text-foreground">{sug.texto}</span>
      </div>
      {sug.justificativa && (
        <p className="mt-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Justificativa:</span> {sug.justificativa}
        </p>
      )}
      {canManage && (
        <div className="mt-3 flex flex-wrap gap-1 border-t pt-2.5">
          {statuses.map((s) => (
            <Button key={s} size="sm" variant={s === sug.status ? "default" : "outline"} disabled={pending} onClick={() => go(s)}>
              {SUGGESTION_STATUS_LABELS[s]}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CommentForm({ provisionId, suggestionId }: { provisionId: string | null; suggestionId: number | null }) {
  const [content, setContent] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();
  async function submit() {
    setPending(true);
    const res = await createComment(provisionId, suggestionId, content);
    setPending(false);
    if (res.error) return toast.error(res.error);
    setContent("");
    router.refresh();
  }
  return (
    <div className="flex gap-2">
      <input
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Escreva um comentário..."
        className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none ring-ring transition-shadow focus:ring-2"
      />
      <SubmitBtn label="Comentar" pending={pending} onClick={submit} />
    </div>
  );
}

export function PendingForm({ provisionId }: { provisionId: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ categoria: "juridica", descricao: "" });
  const [pending, setPending] = useState(false);
  const router = useRouter();
  async function submit() {
    setPending(true);
    const res = await createPendingIssue(provisionId, form.categoria, form.descricao);
    setPending(false);
    if (res.error) return toast.error(res.error);
    setForm({ categoria: "juridica", descricao: "" });
    setOpen(false);
    router.refresh();
  }
  if (!open) {
    return <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Registrar pendência</Button>;
  }
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <select
        value={form.categoria}
        onChange={(e) => setForm({ ...form, categoria: e.target.value })}
        className="h-9 w-full rounded-md border bg-background px-2 text-sm"
      >
        {Object.entries(PENDING_CATEGORY_LABELS).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
      <textarea rows={2} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Questão pendente..." />
      <div className="flex gap-2">
        <SubmitBtn label="Registrar" pending={pending} onClick={submit} />
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </div>
  );
}

export function PendingItem({ p }: { p: PendingIssue }) {
  const router = useRouter();
  async function resolve() {
    if (!p.provision_id) return;
    await resolvePending(p.id, p.provision_id);
    toast.success("Pendência resolvida.");
    router.refresh();
  }
  return (
    <div
      className={cn(
        "rounded-xl border p-4 text-sm",
        p.status === "aberta"
          ? "border-amber-200 bg-amber-50/40 dark:border-amber-800/60 dark:bg-amber-950/20"
          : "border-border bg-muted/30"
      )}
    >
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className={p.status === "aberta" ? "border-amber-300 bg-amber-100/60 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200" : undefined}>
            {PENDING_CATEGORY_LABELS[p.categoria] || p.categoria}
          </Badge>
          {p.status === "aberta" ? (
            <span className="text-[11px] font-medium text-amber-700 dark:text-amber-300">● aberta</span>
          ) : (
            <span className="text-[11px] font-medium text-muted-foreground">✓ resolvida</span>
          )}
        </div>
        {p.status === "aberta" && (
          <Button size="sm" variant="outline" onClick={resolve}>Marcar resolvida</Button>
        )}
      </div>
      <p className="text-foreground">{p.descricao}</p>
      <p className="mt-1.5 text-xs text-muted-foreground">{p.author_name} · {new Date(p.created_at + "Z").toLocaleString("pt-BR")}</p>
    </div>
  );
}

export function ReferenceForm({ provisionId }: { provisionId: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ tipo: "biblica", texto: "" });
  const [pending, setPending] = useState(false);
  const router = useRouter();
  async function submit() {
    setPending(true);
    const res = await createReference(provisionId, form.tipo, form.texto);
    setPending(false);
    if (res.error) return toast.error(res.error);
    setForm({ tipo: "biblica", texto: "" });
    setOpen(false);
    router.refresh();
  }
  if (!open) return <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Adicionar fundamento</Button>;
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
        {Object.entries(REFERENCE_TYPE_LABELS).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
      <textarea rows={2} value={form.texto} onChange={(e) => setForm({ ...form, texto: e.target.value })} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Ex.: Mateus 18.15-17" />
      <div className="flex gap-2">
        <SubmitBtn label="Adicionar" pending={pending} onClick={submit} />
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </div>
  );
}

export function VoteButtons({ provisionId, currentOpinion }: { provisionId: string; currentOpinion: string | null }) {
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const options = [
    { k: "concordo", label: "Concordo" },
    { k: "discordo", label: "Discordo" },
    { k: "ressalva", label: "Tenho ressalva" },
  ];
  async function go(k: string) {
    setPending(true);
    await vote(provisionId, k);
    setPending(false);
    router.refresh();
  }
  async function clear() {
    setPending(true);
    await removeVote(provisionId);
    setPending(false);
    router.refresh();
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">Opinião consultiva:</span>
      {options.map((o) => {
        const active = currentOpinion === o.k;
        return (
          <Button
            key={o.k}
            size="sm"
            variant={active ? "default" : "outline"}
            disabled={pending}
            onClick={() => go(o.k)}
            className={cn(
              active &&
                (o.k === "concordo"
                  ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
                  : o.k === "discordo"
                    ? "border-red-600 bg-red-600 text-white hover:bg-red-700"
                    : "border-amber-500 bg-amber-500 text-white hover:bg-amber-600")
            )}
          >
            {o.label}
          </Button>
        );
      })}
      {currentOpinion && (
        <Button size="sm" variant="ghost" disabled={pending} onClick={clear}>Remover</Button>
      )}
    </div>
  );
}

export function HistoricalTextEditor({
  provisionId,
  campo,
  texto,
  canEdit,
  emptyLabel,
}: {
  provisionId: string;
  campo: "texto_vigente" | "proposta_inicial";
  texto: string;
  canEdit: boolean;
  emptyLabel: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(texto);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function save() {
    setPending(true);
    const res = await updateHistoricalText(provisionId, campo, value);
    setPending(false);
    if (res.error) return toast.error(res.error);
    toast.success(res.message || "Texto corrigido.");
    setEditing(false);
    router.refresh();
  }

  if (!canEdit) {
    return texto ? (
      <p className="whitespace-pre-wrap font-serif text-[15px] leading-relaxed text-muted-foreground">{texto}</p>
    ) : (
      <p className="text-sm text-muted-foreground italic">{emptyLabel}</p>
    );
  }

  if (!editing) {
    return (
      <div className="space-y-2">
        {texto ? (
          <p className="whitespace-pre-wrap font-serif text-[15px] leading-relaxed text-muted-foreground">{texto}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">{emptyLabel}</p>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setValue(texto);
            setEditing(true);
          }}
          title="Corrigir erro de extração do documento original. A correção fica registrada na auditoria."
        >
          Corrigir extração
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <textarea
        rows={6}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full rounded-lg border bg-background px-3 py-2 font-serif text-[15px] leading-relaxed"
      />
      <div className="flex flex-wrap items-center gap-2">
        <SubmitBtn label="Salvar correção" pending={pending} onClick={save} />
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
          Cancelar
        </Button>
        <span className="text-xs text-muted-foreground">
          A alteração será registrada na trilha de auditoria (antes → depois).
        </span>
      </div>
    </div>
  );
}

export function JustificativaEditor({ provisionId, initial, canEdit }: { provisionId: string; initial: string; canEdit: boolean }) {
  const [text, setText] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  async function save() {
    setPending(true);
    await updateJustificativa(provisionId, text);
    setPending(false);
    setEditing(false);
    router.refresh();
  }
  if (!canEdit) {
    return initial ? <p className="whitespace-pre-wrap text-sm text-muted-foreground">{initial}</p> : <p className="text-sm text-muted-foreground">—</p>;
  }
  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-2">
        {initial ? <p className="whitespace-pre-wrap text-sm text-muted-foreground">{initial}</p> : <p className="text-sm text-muted-foreground">—</p>}
        <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Editar</Button>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
      <div className="flex gap-2">
        <SubmitBtn label="Salvar" pending={pending} onClick={save} />
        <Button size="sm" variant="ghost" onClick={() => { setText(initial); setEditing(false); }}>Cancelar</Button>
      </div>
    </div>
  );
}

function initials(name: string): string {
  const parts = (name || "?").trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function CommentList({ comments }: { comments: Comment[] }) {
  if (!comments.length) return <p className="text-sm text-muted-foreground">Nenhum comentário ainda.</p>;
  return (
    <ul className="space-y-2.5">
      {comments.map((c) => (
        <li key={c.id} className="flex gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {initials(c.author_name || "")}
          </div>
          <div className="min-w-0 flex-1 rounded-xl rounded-tl-sm border bg-card p-3 text-sm">
            <p className="text-foreground">{c.content}</p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {c.author_name} · {new Date(c.created_at + "Z").toLocaleString("pt-BR")}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
