"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { VERSAO_COOKIE } from "@/lib/versao";
import type { VersaoTrabalho } from "@/lib/types";

/** Define a versão de trabalho exibida no painel/navegação (cookie, por usuário). */
export async function definirVersaoTrabalho(versao: VersaoTrabalho): Promise<{ ok?: boolean; error?: string }> {
  await requireUser();
  if (versao !== "vigente" && versao !== "proposta") return { error: "Versão inválida." };
  const c = await cookies();
  c.set(VERSAO_COOKIE, versao, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/");
  revalidatePath("/revisao");
  return { ok: true };
}
