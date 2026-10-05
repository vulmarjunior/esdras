// Carga inicial do Compromisso de Membresia editável (Mesa/motor da nova minuta).
// Lê o TXT definitivo, converte em árvore e cria o rascunho isolado no banco.
// Idempotente: se o documento já existir, nada é alterado.
//
// Uso: node scripts/import-compromisso.mjs          (banco do .env.local)
//      node scripts/import-compromisso.mjs --local  (banco do .env.development.local)
//      node scripts/import-compromisso.mjs --dry-run (só converte e mostra as contagens)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { converterCompromisso } from "./parse-compromisso.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const ARQUIVO_ENV = process.argv.includes("--local") ? ".env.development.local" : ".env.local";
const FONTE = path.join(root, "..", "Documentos fonte", "Compromisso_de_Membresia_IBO_versao_definitiva.txt");

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

if (!fs.existsSync(FONTE)) {
  console.error("Arquivo-fonte não encontrado: " + FONTE);
  process.exit(1);
}

const draft = converterCompromisso(fs.readFileSync(FONTE, "utf-8"));
const content = JSON.stringify(draft);
const contar = (nos) => nos.reduce((total, node) => total + 1 + contar(node.children), 0);

if (process.argv.includes("--dry-run")) {
  const porTipo = {};
  const visitar = (nos) => { for (const node of nos) { porTipo[node.type] = (porTipo[node.type] ?? 0) + 1; visitar(node.children); } };
  visitar(draft.nodes);
  console.log(`Conversão verificada: "${draft.id}" com ${contar(draft.nodes)} dispositivos (${JSON.stringify(porTipo)}). Nenhum banco foi acessado.`);
  process.exit(0);
}

const DATABASE_URL = lerEnv(ARQUIVO_ENV).DATABASE_URL || process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error(`DATABASE_URL não encontrada no ${ARQUIVO_ENV}`);
  process.exit(1);
}

const client = new pg.Client({ connectionString: DATABASE_URL, ssl: sslFor(DATABASE_URL) });
await client.connect();
try {
  const existente = await client.query("SELECT version FROM nova_mesa_drafts WHERE id=$1", [draft.id]);
  if (existente.rowCount) {
    console.log(`O documento "${draft.id}" já existe (versão ${existente.rows[0].version}); nada foi alterado.`);
  } else {
    await client.query("BEGIN");
    await client.query("INSERT INTO nova_mesa_drafts (id, content, version, updated_by) VALUES ($1,$2::jsonb,1,NULL)", [draft.id, content]);
    await client.query("INSERT INTO nova_mesa_draft_versions (draft_id, version, content, author_id) VALUES ($1,1,$2::jsonb,NULL) ON CONFLICT (draft_id,version) DO NOTHING", [draft.id, content]);
    await client.query("COMMIT");
    const capitulos = draft.nodes.filter((node) => node.type === "chapter").length;
    console.log(`Compromisso criado como "${draft.id}" (v1): ${contar(draft.nodes)} dispositivos, ${capitulos} capítulos.`);
  }
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  await client.end();
}
