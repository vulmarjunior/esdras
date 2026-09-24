// Mesa de Trabalho 2.0 — evolução aditiva do schema (idempotente, sem apagar dados).
//
//   1. Exclusão reversível (RF-07): tombstone em provisions (deleted_at/deleted_by).
//   2. Tipo "item" (RF-03, LC 95/1998) no CHECK de provisions.type.
//   3. Correspondências múltiplas (RF-01/RF-05): provision_correspondences.
//   4. Marcos integrais da minuta (RF-09): document_snapshots.
//   5. Concordância editorial não bloqueante (RF-06): acordo_version/acordo_em/acordo_por.
//
// Uso: node scripts/migrate-mesa-2-0.mjs          (banco do .env.local)
//      node scripts/migrate-mesa-2-0.mjs --local  (banco do .env.development.local)
import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const ARQUIVO_ENV = process.argv.includes("--local") ? ".env.development.local" : ".env.local";

function lerEnv(arquivo) {
  const caminho = path.join(root, arquivo);
  if (!fs.existsSync(caminho)) return {};
  const env = {};
  for (const line of fs.readFileSync(caminho, "utf-8").split(/\r?\n/)) {
    const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
  return env;
}

function sslFor(url) {
  try {
    const host = new URL(url).hostname;
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") return false;
  } catch {}
  return { rejectUnauthorized: false };
}

const DATABASE_URL = lerEnv(ARQUIVO_ENV).DATABASE_URL || process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error(`DATABASE_URL não encontrada no ${ARQUIVO_ENV}`);
  process.exit(1);
}

const client = new pg.Client({ connectionString: DATABASE_URL, ssl: sslFor(DATABASE_URL) });
await client.connect();

try {
  // 1. Exclusão reversível: o dispositivo sai da árvore ativa sem perder conteúdo,
  //    relações, posição ou histórico (nada é apagado).
  await client.query("ALTER TABLE provisions ADD COLUMN IF NOT EXISTS deleted_at TEXT");
  await client.query("ALTER TABLE provisions ADD COLUMN IF NOT EXISTS deleted_by INTEGER REFERENCES users(id)");

  // 2. Tipo "item" (subdivisão de alínea, LC 95/1998).
  await client.query("ALTER TABLE provisions DROP CONSTRAINT IF EXISTS provisions_type_check");
  await client.query(`
    ALTER TABLE provisions ADD CONSTRAINT provisions_type_check
      CHECK (type IN ('capitulo','secao','artigo','paragrafo','inciso','alinea','item'))
  `);

  // 3. Correspondências múltiplas minuta ↔ Estatuto registrado (1:1, 1:N, N:1, N:M).
  //    Linha com vigente_id preenchido = vínculo; sem vigente_id = declaração
  //    de acréscimo ou de não aplicabilidade do dispositivo da minuta.
  await client.query(`
    CREATE TABLE IF NOT EXISTS provision_correspondences (
      id BIGSERIAL PRIMARY KEY,
      provision_id TEXT NOT NULL REFERENCES provisions(id) ON DELETE CASCADE,
      vigente_id TEXT REFERENCES provisions(id) ON DELETE CASCADE,
      tipo TEXT NOT NULL DEFAULT 'relacionado'
        CHECK (tipo IN ('nao_examinado','relacionado','acrescimo','nao_aplicavel','substituido','desmembrado','incorporado')),
      observacao TEXT,
      created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS')),
      created_by INTEGER REFERENCES users(id)
    )
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_provision_correspondences_vigente
      ON provision_correspondences(vigente_id)
  `);
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_correspondencia_vinculo
      ON provision_correspondences(provision_id, vigente_id) WHERE vigente_id IS NOT NULL
  `);
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_correspondencia_declarada
      ON provision_correspondences(provision_id, tipo) WHERE vigente_id IS NULL
  `);

  // 4. Marcos integrais recuperáveis da minuta (árvore, conteúdo, referências,
  //    justificativas, marcadores e proveniência em um único JSONB).
  await client.query(`
    CREATE TABLE IF NOT EXISTS document_snapshots (
      id BIGSERIAL PRIMARY KEY,
      rotulo TEXT,
      descricao TEXT,
      conteudo JSONB NOT NULL,
      created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS')),
      created_by INTEGER REFERENCES users(id)
    )
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_document_snapshots_created_at
      ON document_snapshots(created_at)
  `);

  // 5. Concordância editorial não bloqueante: registra qual revisão foi acordada,
  //    quando e por quem, sem impedir edições posteriores.
  await client.query("ALTER TABLE provisions ADD COLUMN IF NOT EXISTS acordo_version INTEGER");
  await client.query("ALTER TABLE provisions ADD COLUMN IF NOT EXISTS acordo_em TEXT");
  await client.query("ALTER TABLE provisions ADD COLUMN IF NOT EXISTS acordo_por INTEGER REFERENCES users(id)");

  console.log("Mesa 2.0: exclusão reversível, correspondências múltiplas, marcos, concordância e tipo item garantidos.");
} catch (e) {
  console.error("ERRO na migração da Mesa 2.0:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
