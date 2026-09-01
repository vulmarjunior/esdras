"use server";

import { redirect } from "next/navigation";
import { get } from "@/lib/db";
import {
  createSession,
  setSessionCookie,
  verifyPassword,
  clearSessionCookie,
} from "@/lib/auth";

export type LoginState = { error?: string };

export async function loginAction(_state: LoginState | undefined, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  const user = get<{ id: number; name: string; password_hash: string }>(
    "SELECT id, name, password_hash FROM users WHERE email = ?",
    [email]
  );
  if (!user || !verifyPassword(password, user.password_hash)) {
    return { error: "E-mail ou senha inválidos." };
  }
  const token = await createSession(user.id);
  await setSessionCookie(token);
  redirect("/");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}
