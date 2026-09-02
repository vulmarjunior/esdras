"use server";

import { revalidatePath } from "next/cache";
import { get, run, all } from "@/lib/db";
import { hashPassword, requireRole, requireUser } from "@/lib/auth";
import { rolesCom } from "@/lib/permissions";
import type { ActionState } from "./provision";

async function audit(userId: number, user_name: string, action: string, entity: string, entity_id: string, detail?: string) {
  await run(
    "INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, detail) VALUES (?, ?, ?, ?, ?, ?)",
    [userId, user_name, action, entity, entity_id, detail || ""]
  );
}

export async function createUser(data: { name: string; email: string; password: string; role: string }): Promise<ActionState> {
  const user = await requireRole(...rolesCom("gerenciar_usuarios"));
  if (!data.name.trim() || !data.email.trim() || !data.password.trim()) {
    return { error: "Preencha nome, e-mail e senha." };
  }
  if (await get("SELECT id FROM users WHERE email = ?", [data.email.trim().toLowerCase()])) {
    return { error: "Já existe usuário com este e-mail." };
  }
  const res = await run("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)", [
    data.name.trim(),
    data.email.trim().toLowerCase(),
    hashPassword(data.password),
    data.role,
  ]);
  await audit(user.id, user.name, "Cadastrou usuário", "user", String(res.lastInsertRowid), data.name);
  revalidatePath("/admin");
  return { ok: true, message: "Usuário cadastrado." };
}

export async function updateUser(data: { id: number; name: string; email: string; role: string; password?: string }): Promise<ActionState> {
  const user = await requireRole(...rolesCom("gerenciar_usuarios"));
  const target = await get<{ email: string; name: string }>("SELECT email, name FROM users WHERE id = ?", [data.id]);
  if (!target) return { error: "Usuário não encontrado." };
  const email = data.email.trim().toLowerCase();
  if (!email) return { error: "Informe o e-mail." };
  const dup = await get<{ id: number }>("SELECT id FROM users WHERE email = ? AND id != ?", [email, data.id]);
  if (dup) return { error: "Já existe outro usuário com este e-mail." };
  if (data.password && data.password.trim()) {
    await run("UPDATE users SET name = ?, email = ?, role = ?, password_hash = ? WHERE id = ?", [
      data.name.trim(),
      email,
      data.role,
      hashPassword(data.password),
      data.id,
    ]);
  } else {
    await run("UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?", [data.name.trim(), email, data.role, data.id]);
  }
  await audit(
    user.id,
    user.name,
    "Atualizou usuário",
    "user",
    String(data.id),
    `Nome: ${target.name} → ${data.name.trim()} | E-mail: ${target.email} → ${email}`
  );
  revalidatePath("/admin");
  return { ok: true, message: "Usuário atualizado." };
}

export async function deleteUser(id: number): Promise<ActionState> {
  const user = await requireRole(...rolesCom("gerenciar_usuarios"));
  const target = await get<{ role: string }>("SELECT role FROM users WHERE id = ?", [id]);
  if (!target) return { error: "Usuário não encontrado." };
  if (target.role === "admin" && (await all("SELECT id FROM users WHERE role='admin'")).length <= 1) {
    return { error: "Não é possível remover o único administrador." };
  }
  await run("DELETE FROM users WHERE id = ?", [id]);
  await audit(user.id, user.name, "Removeu usuário", "user", String(id));
  revalidatePath("/admin");
  return { ok: true };
}

export async function setMyName(name: string): Promise<ActionState> {
  const user = await requireUser();
  await run("UPDATE users SET name = ? WHERE id = ?", [name.trim(), user.id]);
  revalidatePath("/");
  return { ok: true };
}