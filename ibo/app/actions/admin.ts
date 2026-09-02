"use server";

import { revalidatePath } from "next/cache";
import { get, run, all } from "@/lib/db";
import { hashPassword, requireRole, requireUser } from "@/lib/auth";
import { rolesCom } from "@/lib/permissions";
import { normalizarTelefone } from "@/lib/phone";
import type { ActionState } from "./provision";

async function audit(userId: number, user_name: string, action: string, entity: string, entity_id: string, detail?: string) {
  await run(
    "INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, detail) VALUES (?, ?, ?, ?, ?, ?)",
    [userId, user_name, action, entity, entity_id, detail || ""]
  );
}

export async function createUser(data: { name: string; email: string; password: string; role: string; phone?: string }): Promise<ActionState> {
  const user = await requireRole(...rolesCom("gerenciar_usuarios"));
  if (!data.name.trim() || !data.email.trim() || !data.password.trim()) {
    return { error: "Preencha nome, e-mail e senha." };
  }
  if (await get("SELECT id FROM users WHERE email = ?", [data.email.trim().toLowerCase()])) {
    return { error: "Já existe usuário com este e-mail." };
  }
  const phone = (data.phone || "").trim();
  const phoneNorm = phone ? normalizarTelefone(phone) : null;
  if (phone && !phoneNorm) return { error: "Telefone inválido. Use o formato (69) 99999-9999." };
  const res = await run(
    "INSERT INTO users (name, email, password_hash, role, phone, must_change_password) VALUES (?, ?, ?, ?, ?, 1)",
    [data.name.trim(), data.email.trim().toLowerCase(), hashPassword(data.password), data.role, phoneNorm]
  );
  await audit(user.id, user.name, "Cadastrou usuário", "user", String(res.lastInsertRowid), data.name);
  revalidatePath("/admin");
  return { ok: true, message: "Usuário cadastrado. Ele trocará a senha no primeiro acesso." };
}

export async function updateUser(data: { id: number; name: string; email: string; role: string; password?: string; phone?: string }): Promise<ActionState> {
  const user = await requireRole(...rolesCom("gerenciar_usuarios"));
  const target = await get<{ email: string; name: string }>("SELECT email, name FROM users WHERE id = ?", [data.id]);
  if (!target) return { error: "Usuário não encontrado." };
  const email = data.email.trim().toLowerCase();
  if (!email) return { error: "Informe o e-mail." };
  const dup = await get<{ id: number }>("SELECT id FROM users WHERE email = ? AND id != ?", [email, data.id]);
  if (dup) return { error: "Já existe outro usuário com este e-mail." };
  const phone = (data.phone || "").trim();
  const phoneNorm = phone ? normalizarTelefone(phone) : null;
  if (phone && !phoneNorm) return { error: "Telefone inválido. Use o formato (69) 99999-9999." };
  if (data.password && data.password.trim()) {
    await run(
      "UPDATE users SET name = ?, email = ?, role = ?, phone = ?, password_hash = ?, must_change_password = 1 WHERE id = ?",
      [data.name.trim(), email, data.role, phoneNorm, hashPassword(data.password), data.id]
    );
  } else {
    await run("UPDATE users SET name = ?, email = ?, role = ?, phone = ? WHERE id = ?", [
      data.name.trim(),
      email,
      data.role,
      phoneNorm,
      data.id,
    ]);
  }
  await audit(
    user.id,
    user.name,
    "Atualizou usuário",
    "user",
    String(data.id),
    `Nome: ${target.name} → ${data.name.trim()} | E-mail: ${target.email} → ${email}${data.password?.trim() ? " | senha redefinida (troca obrigatória no próximo acesso)" : ""}`
  );
  revalidatePath("/admin");
  return {
    ok: true,
    message: data.password?.trim() ? "Usuário atualizado. Ele trocará a senha no próximo acesso." : "Usuário atualizado.",
  };
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

export async function updateMyPhone(phone: string): Promise<ActionState> {
  const user = await requireUser();
  const raw = (phone || "").trim();
  const phoneNorm = raw ? normalizarTelefone(raw) : null;
  if (raw && !phoneNorm) return { error: "Telefone inválido. Use o formato (69) 99999-9999." };
  await run("UPDATE users SET phone = ? WHERE id = ?", [phoneNorm, user.id]);
  revalidatePath("/");
  return { ok: true, message: phoneNorm ? "Telefone atualizado." : "Telefone removido." };
}