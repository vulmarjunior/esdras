"use server";

import { revalidatePath } from "next/cache";
import { run, now } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import type { ActionState } from "@/app/actions/provision";

/**
 * Anotação pessoal do membro da comissão sobre um dispositivo.
 * Privada: é lida e escrita somente pelo próprio usuário. O conteúdo nunca é
 * gravado em audit_logs nem publicado em realtime.
 */
export async function savePersonalNote(provisionId: string, content: string): Promise<ActionState> {
  const user = await requireUser();
  const texto = content.trim();
  const ts = now();
  await run(
    `INSERT INTO personal_notes (provision_id, user_id, content, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(provision_id, user_id)
     DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at`,
    [provisionId, user.id, texto, ts]
  );
  revalidatePath(`/dispositivo/${provisionId}`);
  return { ok: true, message: texto ? "Anotação salva." : "Anotação removida." };
}