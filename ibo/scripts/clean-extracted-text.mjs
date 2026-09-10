import dotenv from "dotenv";
import { Client } from "pg";
import { cleanExtractedText } from "../lib/extraction-cleanup.mjs";

dotenv.config({ path: ".env.local" });
const apply = process.argv.includes("--apply");
const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

await client.connect();
try {
  const { rows } = await client.query("SELECT id, redacao_trabalho, proposta_inicial, version FROM provisions ORDER BY ordem");
  const changes = rows.map((row) => ({
    ...row,
    proposta: cleanExtractedText(row.proposta_inicial),
    trabalho: cleanExtractedText(row.redacao_trabalho),
  })).filter((row) => row.proposta !== row.proposta_inicial || row.trabalho !== row.redacao_trabalho);
  console.log(`${apply ? "Aplicação" : "Simulação"}: ${changes.length} dispositivo(s) com correções de espaços.`);
  for (const row of changes.slice(0, 20)) {
    const fields = [];
    if (row.proposta !== row.proposta_inicial) fields.push("proposta");
    if (row.trabalho !== row.redacao_trabalho) fields.push("trabalho");
    console.log(`- ${row.id}: ${fields.join(", ")}`);
  }
  if (!apply || changes.length === 0) process.exit(0);

  const adminResult = await client.query("SELECT id, name FROM users WHERE role = $1 AND deleted_at IS NULL ORDER BY id LIMIT 1", ["admin"]);
  if (!adminResult.rows[0]) throw new Error("Nenhum administrador ativo encontrado.");
  const actor = adminResult.rows[0];
  await client.query("BEGIN");
  try {
    for (const row of changes) {
      if (row.proposta !== row.proposta_inicial) {
        await client.query("UPDATE provisions SET proposta_inicial = $1, updated_at = to_char(now(), 'YYYY-MM-DD HH24:MI:SS'), updated_by = $2 WHERE id = $3", [row.proposta, actor.id, row.id]);
        await client.query("INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, detail) VALUES ($1,$2,$3,$4,$5,$6)", [actor.id, actor.name, "Correção de espaços na redação proposta", "provision", row.id, "Correção de artefatos de extração; conteúdo preservado."]);
      }
      if (row.trabalho !== row.redacao_trabalho) {
        const nextVersion = (row.version || 0) + 1;
        await client.query("INSERT INTO provision_versions (provision_id, version, content, reason, author_id) VALUES ($1,$2,$3,$4,$5)", [row.id, nextVersion, row.trabalho, "Correção de artefatos de extração (espaços)", actor.id]);
        await client.query("UPDATE provisions SET redacao_trabalho = $1, version = $2, updated_at = to_char(now(), 'YYYY-MM-DD HH24:MI:SS'), updated_by = $3 WHERE id = $4", [row.trabalho, nextVersion, actor.id, row.id]);
        await client.query("INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, detail) VALUES ($1,$2,$3,$4,$5,$6)", [actor.id, actor.name, "Correção de espaços na redação de trabalho", "provision", row.id, `Versão ${nextVersion}; conteúdo preservado.`]);
      }
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
  console.log(`Concluído: ${changes.length} dispositivo(s) corrigido(s), com auditoria.`);
} finally {
  await client.end();
}
