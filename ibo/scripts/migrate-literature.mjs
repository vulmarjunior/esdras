// Cria as tabelas da biblioteca de literatura de consulta no Postgres existente.
// Uso: node scripts/migrate-literature.mjs
import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const envRaw = fs.readFileSync(path.join(root, ".env.local"), "utf-8");
const env = {};
for (const line of envRaw.split(/\r?\n/)) {
  const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
}
const DATABASE_URL = env.DATABASE_URL || process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL não encontrada no .env.local");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS library_books (
      id BIGSERIAL PRIMARY KEY,
      titulo TEXT NOT NULL,
      autor TEXT,
      ano INTEGER,
      fonte TEXT,
      resumo TEXT NOT NULL DEFAULT '',
      ordem INTEGER NOT NULL DEFAULT 0,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS')),
      updated_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS'))
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS library_sections (
      id BIGSERIAL PRIMARY KEY,
      book_id BIGINT NOT NULL REFERENCES library_books(id) ON DELETE CASCADE,
      ordem_pai INTEGER NOT NULL DEFAULT 0,
      titulo TEXT NOT NULL,
      conteudo TEXT NOT NULL,
      busca TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS'))
    )
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_library_sections_book
      ON library_sections(book_id, ordem_pai)
  `);
  console.log("Tabelas library_books e library_sections garantidas no Postgres.");
} finally {
  await client.end();
}
