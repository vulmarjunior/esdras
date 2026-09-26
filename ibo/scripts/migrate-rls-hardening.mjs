// RLS hardening — fecha o acesso público (papéis anon/authenticated) às tabelas
// que nasceram sem RLS: library_books, library_sections, provision_correspondences,
// document_snapshots, nova_mesa_drafts e nova_mesa_draft_versions.
//
// O backend continua funcionando normalmente: a aplicação conecta como dono
// (postgres) via lib/db.ts, e dono ignora RLS sem FORCE ROW LEVEL SECURITY.
// Não cria policies: sem policy, anon/authenticated ficam sem acesso algum.
//
// Uso: node scripts/migrate-rls-hardening.mjs          (banco do .env.local)
//      node scripts/migrate-rls-hardening.mjs --local  (banco do .env.development.local)
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

const TABELAS = [
  "library_books",
  "library_sections",
  "provision_correspondences",
  "document_snapshots",
  "nova_mesa_drafts",
  "nova_mesa_draft_versions",
];
const PAPEIS = ["anon", "authenticated"];

const client = new pg.Client({ connectionString: DATABASE_URL, ssl: sslFor(DATABASE_URL) });
await client.connect();

try {
  await client.query("BEGIN");

  for (const papel of PAPEIS) {
    const { rowCount } = await client.query("SELECT 1 FROM pg_roles WHERE rolname = $1", [papel]);
    if (!rowCount) await client.query(`CREATE ROLE ${papel} NOLOGIN`);
  }

  const ausentes = [];
  for (const tabela of TABELAS) {
    const { rows } = await client.query("SELECT to_regclass($1) AS oid", [`public.${tabela}`]);
    if (!rows[0]?.oid) {
      ausentes.push(tabela);
      continue;
    }
    await client.query(`ALTER TABLE ${tabela} ENABLE ROW LEVEL SECURITY`);
    await client.query(`REVOKE ALL PRIVILEGES ON TABLE ${tabela} FROM anon, authenticated`);
  }

  await client.query("REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated");
  await client.query("REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated");
  await client.query("ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL PRIVILEGES ON TABLES FROM anon, authenticated");
  await client.query("ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL PRIVILEGES ON SEQUENCES FROM anon, authenticated");
  await client.query("ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL PRIVILEGES ON FUNCTIONS FROM anon, authenticated");

  await client.query("COMMIT");

  const { rows: rls } = await client.query(
    "SELECT c.relname AS tabela, c.relrowsecurity AS rls FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname = ANY($1) ORDER BY 1",
    [TABELAS]
  );
  const { rows: grants } = await client.query(
    "SELECT grantee, count(*)::int AS n FROM information_schema.role_table_grants WHERE table_schema = 'public' AND grantee = ANY($1) GROUP BY grantee ORDER BY 1",
    [PAPEIS]
  );

  console.log("RLS hardening aplicado:");
  for (const linha of rls) console.log(`  ${linha.tabela}: RLS ${linha.rls ? "ligado" : "DESLIGADO"}`);
  if (ausentes.length) console.log(`  tabelas ausentes neste banco (ignoradas): ${ausentes.join(", ")}`);
  if (grants.length) {
    for (const g of grants) console.error(`  ATENÇÃO: ${g.grantee} ainda tem privilégios em ${g.n} tabela(s) de public`);
    process.exitCode = 1;
  } else {
    console.log("  anon/authenticated: nenhum privilégio em public");
  }
} catch (e) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("ERRO na migração de RLS:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
