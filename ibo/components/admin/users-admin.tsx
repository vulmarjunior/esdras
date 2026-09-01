"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createUser, updateUser, deleteUser } from "@/app/actions/admin";
import { ROLE_LABELS } from "@/lib/labels";
import { ConfirmDialog, type ConfirmDialogState } from "@/components/confirm-dialog";
import type { User } from "@/lib/types";

const ROLES = [
  { value: "admin", label: ROLE_LABELS.admin },
  { value: "coordenador", label: ROLE_LABELS.coordenador },
  { value: "membro", label: ROLE_LABELS.membro },
];

export function CreateUserForm() {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "membro" });
  const [pending, setPending] = useState(false);
  const router = useRouter();
  async function submit() {
    setPending(true);
    const res = await createUser(form);
    setPending(false);
    if (res.error) return toast.error(res.error);
    toast.success("Usuário cadastrado.");
    setForm({ name: "", email: "", password: "", role: "membro" });
    router.refresh();
  }
  return (
    <div className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5">
      <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" className="h-9 rounded-md border bg-background px-3 text-sm lg:col-span-1" />
      <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="e-mail" type="email" className="h-9 rounded-md border bg-background px-3 text-sm" />
      <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Senha inicial" type="password" className="h-9 rounded-md border bg-background px-3 text-sm" />
      <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="h-9 rounded-md border bg-background px-2 text-sm">
        {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
      </select>
      <Button type="button" onClick={submit} disabled={pending}>Cadastrar</Button>
    </div>
  );
}

export function UserRow({ u, canDelete }: { u: User; canDelete: boolean }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<{ name: string; email: string; role: string; password: string }>({
    name: u.name,
    email: u.email,
    role: u.role,
    password: "",
  });
  const [pending, setPending] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmDialogState | null>(null);
  const router = useRouter();

  async function save() {
    setPending(true);
    const res = await updateUser({
      id: u.id,
      name: form.name,
      email: form.email,
      role: form.role,
      password: form.password || undefined,
    });
    setPending(false);
    if (res.error) return toast.error(res.error);
    setEditing(false);
    toast.success(res.message || "Usuário atualizado.");
    router.refresh();
  }
  async function remove() {
    setPending(true);
    const res = await deleteUser(u.id);
    setPending(false);
    setConfirmState(null);
    if (res.error) return toast.error(res.error);
    toast.success("Usuário removido.");
    router.refresh();
  }

  if (editing) {
    return (
      <li className="rounded-lg border p-3">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1.2fr_1.2fr_auto_auto_auto]">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome" className="h-9 rounded-md border bg-background px-3 text-sm" />
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="E-mail" type="email" className="h-9 rounded-md border bg-background px-3 text-sm" />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="h-9 rounded-md border bg-background px-2 text-sm">
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Nova senha (opcional)" type="password" className="h-9 rounded-md border bg-background px-3 text-sm" />
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={pending}>Salvar</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium">{u.name}</p>
        <p className="text-xs text-muted-foreground">{u.email}</p>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline">{ROLE_LABELS[u.role]}</Badge>
        <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Editar</Button>
        {canDelete && u.role !== "admin" && (
          <Button
            size="sm"
            variant="outline"
            className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
            onClick={() =>
              setConfirmState({
                title: `Remover ${u.name}`,
                description: `O usuário ${u.name} (${u.email}) perderá o acesso ao sistema. As sugestões, comentários e registros já feitos por ele serão preservados. Esta ação não pode ser desfeita.`,
                confirmLabel: "Remover usuário",
              })
            }
          >
            Remover
          </Button>
        )}
      </div>
      <ConfirmDialog state={confirmState} pending={pending} onConfirm={remove} onClose={() => setConfirmState(null)} />
    </li>
  );
}
