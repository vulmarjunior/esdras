import { get } from "./db";

/** Retira o acesso sem apagar autoria, presença ou anotações. Auditoria atômica. */
export async function removeUserPreservingHistory(id: number, actorId: number, actorName: string) {
  await get(
    `WITH removed AS (
      UPDATE users SET deleted_at = datetime('now')
      WHERE id = ? AND deleted_at IS NULL RETURNING id, name
    )
    INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, detail)
    SELECT ?, ?, 'Removeu usuário', 'user', CAST(id AS TEXT), name FROM removed
    RETURNING id`,
    [id, actorId, actorName]
  );
}
