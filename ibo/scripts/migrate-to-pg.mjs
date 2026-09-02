import Database from "better-sqlite3";
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
  console.error("DATABASE_URL nÃ£o encontrada no .env.local");
  process.exit(1);
}

const DB_PATH = process.env.DATABASE_PATH || path.join(root, "data", "esdras.db");
const sqlite = new Database(DB_PATH, { readonly: true });

const DDL = `
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','coordenador','membro')),
  phone TEXT,
  must_change_password INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS'))
);
CREATE TABLE IF NOT EXISTS provisions (
  id TEXT PRIMARY KEY,
  parent_id TEXT REFERENCES provisions(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL DEFAULT 'projeto-ibo',
  type TEXT NOT NULL CHECK (type IN ('capitulo','secao','artigo','paragrafo','inciso','alinea')),
  numero TEXT,
  titulo TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  ordem_pai INTEGER NOT NULL DEFAULT 0,
  origem TEXT NOT NULL DEFAULT 'original' CHECK (origem IN ('original','novo')),
  alteracao_tipo TEXT NOT NULL DEFAULT 'nao_avaliado' CHECK (alteracao_tipo IN ('nao_avaliado','mantido','alteracao_redacional','alteracao_material','novo','revogado','desmembrado','incorporado','reorganizado')),
  status TEXT NOT NULL DEFAULT 'nao_iniciado' CHECK (status IN ('nao_iniciado','em_analise','em_discussao','redacao_definida','aprovado','reaberto')),
  texto_vigente TEXT NOT NULL DEFAULT '',
  proposta_inicial TEXT NOT NULL DEFAULT '',
  redacao_trabalho TEXT NOT NULL DEFAULT '',
  justificativa TEXT NOT NULL DEFAULT '',
  redacao_consolidada TEXT NOT NULL DEFAULT '',
  posicao_sugerida TEXT,
  version INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS')),
  updated_by INTEGER REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_provisions_parent ON provisions(parent_id);
CREATE INDEX IF NOT EXISTS idx_provisions_ordem ON provisions(ordem);
CREATE TABLE IF NOT EXISTS provision_versions (
  id BIGSERIAL PRIMARY KEY,
  provision_id TEXT NOT NULL REFERENCES provisions(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  reason TEXT,
  meeting_id INTEGER,
  author_id INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS')),
  UNIQUE (provision_id, version)
);
CREATE TABLE IF NOT EXISTS suggestions (
  id BIGSERIAL PRIMARY KEY,
  provision_id TEXT NOT NULL REFERENCES provisions(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES users(id),
  texto TEXT NOT NULL,
  justificativa TEXT,
  onde_esta TEXT,
  status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','em_discussao','aceita','aceita_parcialmente','rejeitada','retirada')),
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS'))
);
CREATE TABLE IF NOT EXISTS comments (
  id BIGSERIAL PRIMARY KEY,
  author_id INTEGER NOT NULL REFERENCES users(id),
  provision_id TEXT REFERENCES provisions(id) ON DELETE CASCADE,
  suggestion_id INTEGER REFERENCES suggestions(id) ON DELETE CASCADE,
  pending_id INTEGER,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS'))
);
CREATE TABLE IF NOT EXISTS pending_issues (
  id BIGSERIAL PRIMARY KEY,
  provision_id TEXT REFERENCES provisions(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES users(id),
  categoria TEXT NOT NULL CHECK (categoria IN ('juridica','biblica','doutrinaria','eclesiologica','administrativa','redacao','referencia_cruzada','outra')),
  descricao TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','resolvida')),
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS'))
);
CREATE TABLE IF NOT EXISTS references_tb (
  id BIGSERIAL PRIMARY KEY,
  provision_id TEXT NOT NULL REFERENCES provisions(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('biblica','doutrinaria','juridica','pastoral')),
  texto TEXT NOT NULL,
  author_id INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS'))
);
CREATE TABLE IF NOT EXISTS provision_relations (
  id BIGSERIAL PRIMARY KEY,
  provision_id TEXT NOT NULL REFERENCES provisions(id) ON DELETE CASCADE,
  related_id TEXT NOT NULL REFERENCES provisions(id) ON DELETE CASCADE,
  UNIQUE (provision_id, related_id)
);
CREATE TABLE IF NOT EXISTS votes (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  provision_id TEXT REFERENCES provisions(id) ON DELETE CASCADE,
  suggestion_id INTEGER REFERENCES suggestions(id) ON DELETE CASCADE,
  opinion TEXT NOT NULL CHECK (opinion IN ('concordo','discordo','ressalva')),
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS'))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_votes_provision ON votes(user_id, provision_id) WHERE suggestion_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_votes_suggestion ON votes(user_id, suggestion_id) WHERE suggestion_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS meetings (
  id BIGSERIAL PRIMARY KEY,
  numero INTEGER NOT NULL,
  data TEXT NOT NULL,
  horario TEXT,
  local TEXT,
  pauta TEXT,
  coordenador_id INTEGER REFERENCES users(id),
  secretario_id INTEGER REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'planejada' CHECK (status IN ('planejada','em_andamento','encerrada')),
  started_at TEXT,
  ended_at TEXT,
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS'))
);
CREATE TABLE IF NOT EXISTS meeting_members (
  id BIGSERIAL PRIMARY KEY,
  meeting_id INTEGER NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  presente INTEGER NOT NULL DEFAULT 0,
  UNIQUE (meeting_id, user_id)
);
CREATE TABLE IF NOT EXISTS meeting_events (
  id BIGSERIAL PRIMARY KEY,
  meeting_id INTEGER NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  hora TEXT NOT NULL,
  tipo TEXT NOT NULL,
  descricao TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS meeting_decisions (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  meeting_id INTEGER NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  provision_id TEXT REFERENCES provisions(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL,
  texto TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS'))
);
CREATE TABLE IF NOT EXISTS minutes (
  id BIGSERIAL PRIMARY KEY,
  meeting_id INTEGER NOT NULL UNIQUE REFERENCES meetings(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','em_revisao','aprovada')),
  conteudo TEXT,
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS')),
  updated_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS'))
);
CREATE TABLE IF NOT EXISTS minutes_reviews (
  id BIGSERIAL PRIMARY KEY,
  minutes_id INTEGER NOT NULL REFERENCES minutes(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  opinion TEXT NOT NULL CHECK (opinion IN ('concordo','correcao','ressalva')),
  content TEXT,
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS'))
);
CREATE TABLE IF NOT EXISTS minutes_retifications (
  id BIGSERIAL PRIMARY KEY,
  minutes_id INTEGER NOT NULL REFERENCES minutes(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_id INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS'))
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  user_name TEXT,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id TEXT,
  detail TEXT,
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS'))
);
`;

const TABLES = [
  "users", "provisions", "provision_versions", "suggestions", "comments",
  "pending_issues", "references_tb", "provision_relations", "votes",
  "meetings", "meeting_members", "meeting_events", "meeting_decisions",
  "minutes", "minutes_reviews", "minutes_retifications", "audit_logs",
];

const client = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function resetSeq(table) {
  if (table === "provisions") return; // PK Ã© TEXT (slug), sem sequence
  await client.query(
    `SELECT setval(pg_get_serial_sequence('${table}','id'),
       COALESCE((SELECT MAX(id)::bigint FROM ${table}), 1),
       (SELECT COUNT(*) FROM ${table}) > 0)`
  );
}

(async () => {
  await client.connect();
  try {
    for (const t of [...TABLES].reverse()) {
      await client.query(`DROP TABLE IF EXISTS ${t} CASCADE`);
    }
    await client.query(DDL);
    // Desliga checagens de FK durante a carga (superuser) â€” evita dependÃªncia de ordem
    await client.query("SET session_replication_role = replica");
    let total = 0;
    for (const t of TABLES) {
      const cols = sqlite.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name);
      const rows = sqlite.prepare(`SELECT * FROM ${t} ORDER BY id`).all();
      const colList = cols.join(", ");
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
      const insert = `INSERT INTO ${t} (${colList}) VALUES (${placeholders})`;
      for (const r of rows) {
        await client.query(insert, cols.map((c) => r[c]));
      }
      await resetSeq(t);
      total += rows.length;
      console.log(`${t}: ${rows.length} registros`);
    }
    await client.query("SET session_replication_role = DEFAULT");
    const checks = await client.query(
      "SELECT (SELECT COUNT(*) FROM users) users, (SELECT COUNT(*) FROM provisions) provisions"
    );
    console.log("MigraÃ§Ã£o concluÃ­da. Total registros:", total);
    console.log("usuarios:", checks.rows[0].users, "| dispositivos:", checks.rows[0].provisions);
  } catch (e) {
    console.error("ERRO na migraÃ§Ã£o:", e.message);
    process.exitCode = 1;
  } finally {
    sqlite.close();
    await client.end();
  }
})();