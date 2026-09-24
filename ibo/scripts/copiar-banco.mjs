// Copia o banco de produção (Supabase, .env.local) para o banco de teste local
// (.env.development.local), recriando schema e dados. Serve também de snapshot.
//
// Uso: node scripts/dev-db.mjs            (sobe o Postgres local)
//      node scripts/copiar-banco.mjs      (copia os dados)
//      node scripts/copiar-banco.mjs --reset  (dropa e recria as tabelas antes)
//
// Segurança: recusa copiar se o destino não for local (localhost/127.0.0.1)
// ou se origem e destino forem o mesmo banco.
import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

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

const origemUrl = lerEnv(".env.local").DATABASE_URL;
const destinoUrl = lerEnv(".env.development.local").DATABASE_URL || process.env.DATABASE_URL_TESTE;

if (!origemUrl) {
  console.error("DATABASE_URL de origem não encontrada no .env.local");
  process.exit(1);
}
if (!destinoUrl) {
  console.error("DATABASE_URL de destino não encontrada no .env.development.local (rode antes: node scripts/dev-db.mjs)");
  process.exit(1);
}
try {
  const host = new URL(destinoUrl).hostname;
  if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
    console.error(`Destino não é local (${host}). Abortando para não sobrescrever outro banco.`);
    process.exit(1);
  }
} catch {
  console.error("DATABASE_URL de destino inválida.");
  process.exit(1);
}
if (origemUrl === destinoUrl) {
  console.error("Origem e destino são o mesmo banco. Abortando.");
  process.exit(1);
}

const TABLES = [
  "users",
  "provisions",
  "provision_placements",
  "provision_versions",
  "suggestions",
  "comments",
  "pending_issues",
  "references_tb",
  "provision_relations",
  "provision_correspondences",
  "votes",
  "meetings",
  "meeting_members",
  "meeting_events",
  "meeting_decisions",
  "minutes",
  "minutes_reviews",
  "minutes_retifications",
  "personal_notes",
  "document_snapshots",
  "library_books",
  "library_sections",
  "audit_logs",
];

const RESET = process.argv.includes("--reset");
const origem = new pg.Client({ connectionString: origemUrl, ssl: sslFor(origemUrl) });
const destino = new pg.Client({ connectionString: destinoUrl, ssl: sslFor(destinoUrl) });

await origem.connect();
await destino.connect();

try {
  if (RESET) {
    for (const t of [...TABLES].reverse()) {
      await destino.query(`DROP TABLE IF EXISTS ${t} CASCADE`);
    }
  }

  const ddl = fs.readFileSync(path.join(__dirname, "schema-postgres.sql"), "utf8");
  await destino.query(ddl);

  await destino.query(`TRUNCATE ${TABLES.join(", ")} RESTART IDENTITY CASCADE`);

  let total = 0;
  for (const tabela of TABLES) {
    const existeNaOrigem = await origem.query("SELECT to_regclass($1) AS tabela", [`public.${tabela}`]);
    if (!existeNaOrigem.rows[0].tabela) {
      console.log(`${tabela}: ausente na origem (ignorada)`);
      continue;
    }
    const { rows } = await origem.query(`SELECT * FROM ${tabela}`);
    if (rows.length === 0) {
      console.log(`${tabela}: 0 registros`);
      continue;
    }
    const { rows: colunasDestino } = await destino.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = $1",
      [tabela]
    );
    const existentes = new Set(colunasDestino.map((c) => c.column_name));
    const cols = Object.keys(rows[0]).filter((c) => existentes.has(c));
    const ignoradas = Object.keys(rows[0]).filter((c) => !existentes.has(c));
    if (ignoradas.length) console.warn(`  (colunas ignoradas em ${tabela}: ${ignoradas.join(", ")})`);

    const CHUNK = 200;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const bloco = rows.slice(i, i + CHUNK);
      const placeholders = bloco
        .map((_, j) => `(${cols.map((__, k) => `$${j * cols.length + k + 1}`).join(", ")})`)
        .join(", ");
      const valores = [];
      for (const r of bloco) for (const c of cols) valores.push(r[c]);
      await destino.query(`INSERT INTO ${tabela} (${cols.join(", ")}) VALUES ${placeholders}`, valores);
    }
    console.log(`${tabela}: ${rows.length} registros`);
    total += rows.length;
  }

  for (const t of TABLES) {
    if (t === "provisions") continue; // PK TEXT (slug), sem sequence
    await destino.query(
      `SELECT setval(pg_get_serial_sequence('${t}','id'),
         COALESCE((SELECT MAX(id)::bigint FROM ${t}), 1),
         (SELECT COUNT(*) FROM ${t}) > 0)`
    );
  }

  const resumo = await destino.query(
    "SELECT (SELECT COUNT(*) FROM users) usuarios, (SELECT COUNT(*) FROM provisions) dispositivos, (SELECT COUNT(*) FROM library_books) livros"
  );
  console.log(`\nCópia concluída: ${total} registros.`);
  console.log(
    `usuários: ${resumo.rows[0].usuarios} | dispositivos: ${resumo.rows[0].dispositivos} | livros: ${resumo.rows[0].livros}`
  );
  console.log("Rode `npm run dev` — o .env.development.local aponta para este banco.");
} catch (e) {
  console.error("ERRO na cópia:", e.message);
  process.exitCode = 1;
} finally {
  await origem.end();
  await destino.end();
}
