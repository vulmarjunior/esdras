"use server";

import { revalidatePath } from "next/cache";
import { all, get, run, transaction, now } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { rolesCom } from "@/lib/permissions";
import { publishRealtime } from "@/lib/realtime";
import {
  compararEstados,
  type DiferencaMarco,
  type MarcoCorrespondencia,
  type MarcoPlacement,
  type MarcoProvision,
} from "@/lib/marcos-core";
import type { ActionState } from "./state";

export interface MarcoPayload {
  schema: 1;
  criado_em: string;
  provisions: MarcoProvision[];
  placements: MarcoPlacement[];
  correspondencias: MarcoCorrespondencia[];
}

export interface MarcoResumo {
  id: number;
  rotulo: string | null;
  descricao: string | null;
  created_at: string;
  created_by_name: string | null;
  dispositivos: number;
  correspondencias: number;
}

async function montarPayload(): Promise<MarcoPayload> {
  const provisions = await all<MarcoProvision>(`
    SELECT id, parent_id, type, numero, titulo, ordem, ordem_pai, origem, origem_ref_id, sem_origem,
           alteracao_tipo, status, texto_vigente, proposta_inicial, redacao_trabalho, justificativa,
           redacao_consolidada, posicao_sugerida, deleted_at, deleted_by,
           acordo_version, acordo_em, acordo_por
      FROM provisions
     ORDER BY ordem, id`);
  const placements = await all<MarcoPlacement>(`
    SELECT provision_id, parent_id, numero, titulo, ordem_pai
      FROM provision_placements
     WHERE version_key = 'proposta'
     ORDER BY ordem_pai, provision_id`);
  const correspondencias = await all<MarcoCorrespondencia>(`
    SELECT provision_id, vigente_id, tipo, observacao
      FROM provision_correspondences
     ORDER BY id`);
  return { schema: 1, criado_em: now(), provisions, placements, correspondencias };
}

/** Registra um marco integral recuperável da minuta (RF-09). */
export async function criarMarco(rotulo: string, descricao: string): Promise<ActionState> {
  const user = await requireRole(...rolesCom("gerenciar_dispositivos"));
  const payload = await montarPayload();
  const ts = now();
  await run(
    "INSERT INTO document_snapshots (rotulo, descricao, conteudo, created_at, created_by) VALUES (?, ?, ?::jsonb, ?, ?)",
    [rotulo.trim() || "Marco da minuta", descricao.trim() || null, JSON.stringify(payload), ts, user.id],
  );
  await run(
    "INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, detail) VALUES (?, ?, 'Registrou marco integral da minuta', 'document_snapshot', ?, ?)",
    [user.id, user.name, String(ts), `${payload.provisions.length} dispositivos, ${payload.correspondencias.length} correspondências`],
  );
  revalidatePath("/marcos");
  revalidatePath("/mesa-trabalho");
  await publishRealtime({ entity: "document_snapshot", id: String(ts), action: "criado" });
  return { ok: true, message: "Marco registrado." };
}

export async function listarMarcos(): Promise<MarcoResumo[]> {
  await requireRole(...rolesCom("gerenciar_dispositivos"));
  return all<MarcoResumo>(`
    SELECT s.id, s.rotulo, s.descricao, s.created_at, u.name AS created_by_name,
           jsonb_array_length(s.conteudo->'provisions')::int AS dispositivos,
           jsonb_array_length(s.conteudo->'correspondencias')::int AS correspondencias
      FROM document_snapshots s
      LEFT JOIN users u ON u.id = s.created_by
     ORDER BY s.id DESC`);
}

export async function contarMarcos(): Promise<number> {
  return (await get<{ c: number }>("SELECT COUNT(*)::int AS c FROM document_snapshots"))?.c ?? 0;
}

/** Compara um marco com o estado atual da minuta (RF-09), sem alterar nada. */
export async function compararMarco(id: number): Promise<ActionState & { diferencas?: DiferencaMarco[] }> {
  await requireRole(...rolesCom("gerenciar_dispositivos"));
  const snapshot = await get<{ rotulo: string | null; conteudo: MarcoPayload }>(
    "SELECT rotulo, conteudo FROM document_snapshots WHERE id = ?",
    [id],
  );
  if (!snapshot) return { error: "Marco não encontrado." };
  const payload = snapshot.conteudo;
  if (!payload || payload.schema !== 1 || !Array.isArray(payload.provisions)) {
    return { error: "Marco em formato incompatível." };
  }
  const atual = await montarPayload();
  const diferencas = compararEstados(payload, atual);
  return { ok: true, diferencas, message: `${diferencas.length} diferença(s) em relação ao estado atual.` };
}

/**
 * Restaura um marco como novo estado recuperável (RF-09). O estado anterior é
 * preservado por um marco de segurança criado antes da aplicação; nenhuma
 * revisão individual é apagada.
 */
export async function restaurarMarco(id: number): Promise<ActionState> {
  const user = await requireRole(...rolesCom("gerenciar_dispositivos"));
  const snapshot = await get<{ rotulo: string | null; conteudo: MarcoPayload }>(
    "SELECT rotulo, conteudo FROM document_snapshots WHERE id = ?",
    [id],
  );
  if (!snapshot) return { error: "Marco não encontrado." };
  const payload = snapshot.conteudo;
  if (!payload || payload.schema !== 1 || !Array.isArray(payload.provisions)) {
    return { error: "Marco em formato incompatível." };
  }

  const ts = now();
  const seguranca = await montarPayload();
  await run(
    "INSERT INTO document_snapshots (rotulo, descricao, conteudo, created_at, created_by) VALUES (?, ?, ?::jsonb, ?, ?)",
    [`Antes de restaurar "${snapshot.rotulo ?? id}"`, "Marco de segurança criado automaticamente na restauração.", JSON.stringify(seguranca), ts, user.id],
  );

  const ativosAtuais = await all<{ id: string }>("SELECT id FROM provisions WHERE deleted_at IS NULL");
  const idsNoMarco = new Set(payload.provisions.map((p) => p.id));
  const extras = ativosAtuais.map((row) => row.id).filter((provisionId) => !idsNoMarco.has(provisionId));

  await transaction(async () => {
    for (const p of payload.provisions) {
      await run(
        `INSERT INTO provisions
           (id, parent_id, type, numero, titulo, ordem, ordem_pai, origem, origem_ref_id, sem_origem,
            alteracao_tipo, status, texto_vigente, proposta_inicial, redacao_trabalho, justificativa,
            redacao_consolidada, posicao_sugerida, deleted_at, deleted_by, acordo_version, acordo_em, acordo_por,
            version, updated_at, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
         ON CONFLICT (id) DO UPDATE SET
           parent_id = EXCLUDED.parent_id,
           type = EXCLUDED.type,
           numero = EXCLUDED.numero,
           titulo = EXCLUDED.titulo,
           ordem = EXCLUDED.ordem,
           ordem_pai = EXCLUDED.ordem_pai,
           origem = EXCLUDED.origem,
           origem_ref_id = EXCLUDED.origem_ref_id,
           sem_origem = EXCLUDED.sem_origem,
           alteracao_tipo = EXCLUDED.alteracao_tipo,
           status = EXCLUDED.status,
           texto_vigente = EXCLUDED.texto_vigente,
           proposta_inicial = EXCLUDED.proposta_inicial,
           redacao_trabalho = EXCLUDED.redacao_trabalho,
           justificativa = EXCLUDED.justificativa,
           redacao_consolidada = EXCLUDED.redacao_consolidada,
           posicao_sugerida = EXCLUDED.posicao_sugerida,
           deleted_at = EXCLUDED.deleted_at,
           deleted_by = EXCLUDED.deleted_by,
           acordo_version = EXCLUDED.acordo_version,
           acordo_em = EXCLUDED.acordo_em,
           acordo_por = EXCLUDED.acordo_por,
           version = provisions.version + 1,
           updated_at = EXCLUDED.updated_at,
           updated_by = EXCLUDED.updated_by`,
        [
          p.id, p.parent_id, p.type, p.numero, p.titulo, p.ordem, p.ordem_pai, p.origem, p.origem_ref_id, p.sem_origem,
          p.alteracao_tipo, p.status, p.texto_vigente, p.proposta_inicial, p.redacao_trabalho, p.justificativa,
          p.redacao_consolidada, p.posicao_sugerida, p.deleted_at, p.deleted_by, p.acordo_version, p.acordo_em, p.acordo_por,
          ts, user.id,
        ],
      );
    }
    for (const provisionId of extras) {
      await run(
        "UPDATE provisions SET deleted_at = ?, deleted_by = ?, updated_at = ?, updated_by = ? WHERE id = ? AND deleted_at IS NULL",
        [ts, user.id, ts, user.id, provisionId],
      );
    }
    for (const placement of payload.placements) {
      await run(
        `INSERT INTO provision_placements
           (provision_id, version_key, parent_id, numero, titulo, ordem_pai, updated_at, updated_by)
         VALUES (?, 'proposta', ?, ?, ?, ?, ?, ?)
         ON CONFLICT (version_key, provision_id) DO UPDATE SET
           parent_id = EXCLUDED.parent_id,
           numero = EXCLUDED.numero,
           titulo = EXCLUDED.titulo,
           ordem_pai = EXCLUDED.ordem_pai,
           updated_at = EXCLUDED.updated_at,
           updated_by = EXCLUDED.updated_by`,
        [placement.provision_id, placement.parent_id, placement.numero, placement.titulo, placement.ordem_pai, ts, user.id],
      );
    }
    await run("DELETE FROM provision_correspondences");
    for (const correspondencia of payload.correspondencias) {
      await run(
        "INSERT INTO provision_correspondences (provision_id, vigente_id, tipo, observacao, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?)",
        [correspondencia.provision_id, correspondencia.vigente_id, correspondencia.tipo, correspondencia.observacao, ts, user.id],
      );
    }
    await run(
      "INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, detail) VALUES (?, ?, 'Restaurou marco integral da minuta', 'document_snapshot', ?, ?)",
      [user.id, user.name, String(id), `Marco "${snapshot.rotulo ?? id}" aplicado; ${extras.length} dispositivo(s) criado(s) depois foram retirados (reversível).`],
    );
  });

  revalidatePath("/");
  revalidatePath("/marcos");
  revalidatePath("/mesa-trabalho");
  revalidatePath("/consolidado");
  revalidatePath("/comparativo");
  revalidatePath("/renumeracao");
  await publishRealtime({ entity: "document_snapshot", id: String(id), action: "restaurado" });
  return { ok: true, message: "Marco restaurado como novo estado. O estado anterior ficou preservado." };
}
