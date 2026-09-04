"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PROVISION_TYPE_LABELS } from "@/lib/labels";
import {
  createProvision,
  updateProvision,
  deleteProvision,
  setAlteracaoTipo,
  setStatus,
} from "@/app/actions/provision";
import { ConfirmDialog, type ConfirmDialogState } from "@/components/confirm-dialog";
import { SubmitBtn } from "@/components/provision/submit-btn";

export function NewProvisionForm({
  parentId,
  parentType,
  canEdit,
  types,
  label = "Incluir dispositivo",
}: {
  parentId: string | null;
  parentType: string;
  canEdit: boolean;
  types?: string[];
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ tipo: "", numero: "", titulo: "", texto: "", justificativa: "" });
  const [pending, setPending] = useState(false);
  const router = useRouter();

  const allowed: Record<string, string[]> = {
    capitulo: ["secao", "artigo"],
    secao: ["artigo"],
    artigo: ["paragrafo", "inciso", "alinea"],
    paragrafo: ["inciso", "alinea"],
    inciso: ["alinea"],
    alinea: [],
  };
  const tipos = types || (parentId ? allowed[parentType] || [] : ["capitulo", "secao", "artigo"]);

  if (!canEdit) return null;

  async function submit() {
    setPending(true);
    const res = await createProvision(parentId, form.tipo, form.texto, form.justificativa, form.titulo, form.numero);
    setPending(false);
    if (res.error) return toast.error(res.error);
    toast.success(res.message || "Dispositivo criado.");
    setForm({ tipo: "", numero: "", titulo: "", texto: "", justificativa: "" });
    setOpen(false);
    router.refresh();
    if (res.id) {
      setTimeout(() => router.push(`/dispositivo/${res.id}`), 400);
    }
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="border-primary/30 text-primary hover:bg-primary/5">
        {label}
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
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          value={form.numero}
          onChange={(e) => setForm({ ...form, numero: e.target.value })}
          placeholder="Número (provisório) — ex.: 2º, I, a)"
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
        />
        <input
          value={form.titulo}
          onChange={(e) => setForm({ ...form, titulo: e.target.value })}
          placeholder="Título (capítulos/seções)"
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
        />
      </div>
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
  alteracaoTipo,
}: {
  provisionId: string;
  origem: string;
  childCount: number;
  canEdit: boolean;
  alteracaoTipo: string;
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
      "Todas as sugestões de redação, comentários, pendências, referências, versões e vínculos associados a ele serão removidos permanentemente. Esta ação não pode ser desfeita.";
    setConfirmState({
      title: "Excluir dispositivo",
      description:
        childCount > 0
          ? `Este dispositivo possui ${childCount} dispositivo(s) filho(s), que também serão excluídos.\n\n${base}`
          : base,
      confirmLabel: "Excluir dispositivo",
    });
  }

  async function toggleRevogado() {
    setPending(true);
    const target = alteracaoTipo === "revogado" ? "nao_avaliado" : "revogado";
    const res = await setAlteracaoTipo(provisionId, target);
    setPending(false);
    if (res.error) return toast.error(res.error);
    toast.success(res.message || "Alteração salva.");
    router.refresh();
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
          <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Dispositivo original: para removê-lo do texto final, marque-o como revogado.</span>
            <Button
              size="sm"
              variant={alteracaoTipo === "revogado" ? "default" : "outline"}
              disabled={pending}
              onClick={toggleRevogado}
              className={
                alteracaoTipo === "revogado"
                  ? "border-red-600 bg-red-600 text-white hover:bg-red-700"
                  : "border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
              }
            >
              {alteracaoTipo === "revogado" ? "Desfazer revogação" : "Revogar dispositivo"}
            </Button>
          </span>
        )}
      </div>
      <ConfirmDialog state={confirmState} pending={pending} onConfirm={remove} onClose={() => setConfirmState(null)} />
    </div>
  );
}

/** Atalho para aprovar um dispositivo diretamente na tela da reunião (§23). */
export function ApproveDeviceForm({ devices, canEdit }: { devices: { id: string; label: string }[]; canEdit: boolean }) {
  const [deviceId, setDeviceId] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();
  if (!canEdit) return null;
  async function approve() {
    if (!deviceId) return;
    setPending(true);
    const res = await setStatus(deviceId, "aprovado");
    setPending(false);
    if (res.error) return toast.error(res.error);
    toast.success(res.message || "Dispositivo aprovado.");
    setDeviceId("");
    router.refresh();
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={deviceId}
        onChange={(e) => setDeviceId(e.target.value)}
        className="h-9 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm"
      >
        <option value="">Aprovar dispositivo...</option>
        {devices.map((d) => (
          <option key={d.id} value={d.id}>
            {d.label}
          </option>
        ))}
      </select>
      <Button
        size="sm"
        className="bg-emerald-600 text-white hover:bg-emerald-700"
        disabled={pending || !deviceId}
        onClick={approve}
      >
        Aprovar
      </Button>
    </div>
  );
}