import nextEnv from "@next/env";
import pg from "pg";

nextEnv.loadEnvConfig(process.cwd());
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não configurada.");

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

await client.connect();
try {
  await client.query("BEGIN");
  await client.query(`
    CREATE TABLE IF NOT EXISTS provision_placements (
      id BIGSERIAL PRIMARY KEY,
      provision_id TEXT NOT NULL REFERENCES provisions(id) ON DELETE CASCADE,
      version_key TEXT NOT NULL CHECK (version_key IN ('vigente','proposta','consolidada')),
      parent_id TEXT REFERENCES provisions(id) ON DELETE SET NULL,
      numero TEXT,
      titulo TEXT,
      ordem_pai INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS')),
      updated_by INTEGER REFERENCES users(id),
      UNIQUE (version_key, provision_id)
    )
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_provision_placements_version_parent
      ON provision_placements(version_key, parent_id, ordem_pai)
  `);

  // A proposta começa como um espelho da árvore existente. A localização
  // vigente é preservada apenas para dispositivos que já pertencem ao Estatuto.
  await client.query(`
    INSERT INTO provision_placements
      (provision_id, version_key, parent_id, numero, titulo, ordem_pai, updated_at)
    SELECT id, 'proposta', parent_id, numero, titulo, ordem_pai,
           to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
      FROM provisions
    ON CONFLICT (version_key, provision_id) DO NOTHING
  `);
  await client.query(`
    INSERT INTO provision_placements
      (provision_id, version_key, parent_id, numero, titulo, ordem_pai, updated_at)
    SELECT id, 'vigente', parent_id, numero, titulo, ordem_pai,
           to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
      FROM provisions
     WHERE origem = 'original'
    ON CONFLICT (version_key, provision_id) DO NOTHING
  `);
  await client.query("COMMIT");

  const result = await client.query(`
    SELECT version_key, COUNT(*)::int AS count
      FROM provision_placements
     GROUP BY version_key
     ORDER BY version_key
  `);
  console.table(result.rows);
  console.log("Tabela provision_placements criada e preenchida.");
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("Falha na migração:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.end();
}
