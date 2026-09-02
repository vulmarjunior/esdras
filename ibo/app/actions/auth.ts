"use server";

import { redirect } from "next/navigation";
import { get, run } from "@/lib/db";
import {
  createSession,
  setSessionCookie,
  verifyPassword,
  clearSessionCookie,
  getSessionUser,
  hashPassword,
} from "@/lib/auth";

export type LoginState = { error?: string };

export async function loginAction(_state: LoginState | undefined, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  const user = await get<{ id: number; name: string; password_hash: string; must_change_password: number }>(
    "SELECT id, name, password_hash, must_change_password FROM users WHERE email = ?",
    [email]
  );
  if (!user || !verifyPassword(password, user.password_hash)) {
    return { error: "E-mail ou senha inválidos." };
  }
  const token = await createSession(user.id, { mustChange: !!user.must_change_password });
  await setSessionCookie(token);
  redirect(user.must_change_password ? "/trocar-senha" : "/");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}

export type ChangePasswordState = { error?: string; ok?: boolean };

export async function changePasswordAction(
  _state: ChangePasswordState | undefined,
  formData: FormData
): Promise<ChangePasswordState> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const atual = String(formData.get("current") || "");
  const nova = String(formData.get("new") || "");
  const confirmacao = String(formData.get("confirm") || "");

  if (!atual || !nova || !confirmacao) return { error: "Preencha todos os campos." };
  if (nova.length < 8) return { error: "A nova senha deve ter pelo menos 8 caracteres." };
  if (nova !== confirmacao) return { error: "A confirmação não confere com a nova senha." };
  if (nova === atual) return { error: "A nova senha deve ser diferente da atual." };

  const dbUser = await get<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = ?", [user.id]);
  if (!dbUser || !verifyPassword(atual, dbUser.password_hash)) {
    return { error: "Senha atual incorreta." };
  }

  await run("UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?", [
    hashPassword(nova),
    user.id,
  ]);

  const token = await createSession(user.id, { mustChange: false });
  await setSessionCookie(token);

  redirect("/");
}
