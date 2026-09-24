"use server";

import { revalidatePath } from "next/cache";
import { all, get, run, now } from "@/lib/db";
import { requireRole, requireUser } from "@/lib/auth";
import { rolesCom } from "@/lib/permissions";
import { publishRealtime } from "@/lib/realtime";
import { provisionLabel } from "@/lib/data";
import {
  rotuloCorrespondencia,
  validarCorrespondencia,
  type CorrespondenciaRegistro,
} from "@/lib/correspondencias";
import type { Provision, ProvisionType } from "@/lib/types";
import type { ActionState } from "./state";

export type { CorrespondenciaRegistro };

async function audit(userId: number, user_name: string, action: string, entity_id: string, detail: string) {
  await run(
    "INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, detail) VALUES (?, ?, ?, 'provision', ?, ?)",
    [userId, user_name, action, entity_id, detail],
  );
}

async function listar(where: string, params: unknown[]): Promise<CorrespondenciaRegistro[]> {
  const rows = await all<{
    id: number;
    provision_id: string;
    vigente_id: string | null;
    tipo: string;
    observacao: string | null;
    created_at: string;
    vigente_type: ProvisionType | null;
    vigente_numero: string | null;
    vigente_titulo: string | null;
  }>(`
    SELECT c.id, c.provision_id, c.vigente_id, c.tipo, c.observacao, c.created_at,
           v.type AS vigente_type, v.numero AS vigente_numero, v.titulo AS vigente_titulo
      FROM provision_correspondences c
      LEFT JOIN provisions v ON v.id = c.vigente_id
     WHERE ${where}
     ORDER BY c.vigente_id NULLS LAST, c.id`, params);
  return rows.map((row) => ({
    id: row.id,
    provision_id: row.provision_id,
    vigente_id: row.vigente_id,
    tipo: row.tipo,
    observacao: row.observacao,
    created_at: row.created_at,
    vigente_label: row.vigente_type
      ? provisionLabel({
          id: row.vigente_id ?? "",
          type: row.vigente_type,
          numero: row.vigente_numero,
          titulo: row.vigente_titulo,
        } as never)
      : null,
  }));
}

export async function getTodasCorrespondencias(): Promise<CorrespondenciaRegistro[]> {
  await requireUser();
  return listar("1 = 1", []);
}

export async function getCorrespondencias(provisionId: string): Promise<CorrespondenciaRegistro[]> {
  await requireUser();
  return listar("c.provision_id = ?", [provisionId]);
}

export async function addCorrespondence(
  provisionId: string,
  vigenteId: string | null,
  tipo: string,
  observacao?: string,
): Promise<ActionState> {
  const user = await requireRole(...rolesCom("classificar_alteracao"));
  const erro = validarCorrespondencia(tipo, vigenteId);
  if (erro) return { error: erro };
  const prov = await get<Provision>("SELECT * FROM provisions WHERE id = ?", [provisionId]);
  if (!prov) return { error: "Dispositivo não encontrado." };
  if (prov.deleted_at) return { error: "Dispositivo retirado da minuta; restaure-o antes de vincular." };
  if (vigenteId === provisionId) return { error: "O dispositivo não pode ser vinculado a si mesmo." };
  let label = "declaração";
  if (vigenteId) {
    const vigente = await get<Provision>("SELECT * FROM provisions WHERE id = ?", [vigenteId]);
    if (!vigente) return { error: "Dispositivo do Estatuto registrado não encontrado." };
    label = provisionLabel(vigente);
  }
  const ts = now();
  try {
    await run(
      "INSERT INTO provision_correspondences (provision_id, vigente_id, tipo, observacao, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?)",
      [provisionId, vigenteId, tipo, observacao?.trim() || null, ts, user.id],
    );
  } catch {
    return { error: "Este vínculo já está registrado para o dispositivo." };
  }
  await audit(user.id, user.name, "Registrou correspondência", provisionId, `${rotuloCorrespondencia(tipo)}: ${label}`);
  revalidatePath("/mesa-trabalho");
  revalidatePath(`/dispositivo/${provisionId}`);
  await publishRealtime({ entity: "provision", id: provisionId, action: "correspondencia" });
  return { ok: true, message: "Correspondência registrada." };
}

export async function updateCorrespondence(
  correspondenciaId: number,
  tipo: string,
  observacao?: string,
): Promise<ActionState> {
  const user = await requireRole(...rolesCom("classificar_alteracao"));
  const atual = await get<{ provision_id: string; vigente_id: string | null; tipo: string }>(
    "SELECT provision_id, vigente_id, tipo FROM provision_correspondences WHERE id = ?",
    [correspondenciaId],
  );
  if (!atual) return { error: "Correspondência não encontrada." };
  const erro = validarCorrespondencia(tipo, atual.vigente_id);
  if (erro) return { error: erro };
  await run("UPDATE provision_correspondences SET tipo = ?, observacao = ? WHERE id = ?", [
    tipo,
    observacao?.trim() || null,
    correspondenciaId,
  ]);
  await audit(
    user.id,
    user.name,
    "Alterou correspondência",
    atual.provision_id,
    `${rotuloCorrespondencia(atual.tipo)} → ${rotuloCorrespondencia(tipo)}`,
  );
  revalidatePath("/mesa-trabalho");
  revalidatePath(`/dispositivo/${atual.provision_id}`);
  await publishRealtime({ entity: "provision", id: atual.provision_id, action: "correspondencia" });
  return { ok: true, message: "Correspondência atualizada." };
}

export async function removeCorrespondence(correspondenciaId: number): Promise<ActionState> {
  const user = await requireRole(...rolesCom("classificar_alteracao"));
  const atual = await get<{ provision_id: string; vigente_id: string | null; tipo: string }>(
    "SELECT provision_id, vigente_id, tipo FROM provision_correspondences WHERE id = ?",
    [correspondenciaId],
  );
  if (!atual) return { error: "Correspondência não encontrada." };
  await run("DELETE FROM provision_correspondences WHERE id = ?", [correspondenciaId]);
  await audit(user.id, user.name, "Removeu correspondência", atual.provision_id, rotuloCorrespondencia(atual.tipo));
  revalidatePath("/mesa-trabalho");
  revalidatePath(`/dispositivo/${atual.provision_id}`);
  await publishRealtime({ entity: "provision", id: atual.provision_id, action: "correspondencia" });
  return { ok: true, message: "Correspondência removida." };
}
