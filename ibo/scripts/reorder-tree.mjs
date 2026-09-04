// Reordena a árvore do Postgres (Supabase) por hierarquia normativa, SEM drop.
// Idempotente: roda quantas vezes precisar. Para cada pai, reatribui `ordem_pai`
// dos filhos agrupando por tipo (incisos → parágrafos → alíneas) preservando a
// ordem atual dentro de cada grupo. Não altera textos nem exclui dispositivos.
//
// Correção específica (art-8): os parágrafos originais estavam extraídos como
// §4º/§5º mas o documento registrado diz §1º/§2º. Ajusta a numeração deles para
// a original; as propostas novas (§1º–§3º, incisos VII/VIII) são preservadas.
//
// Uso: node scripts/reorder-tree.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

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

const RANK_TIPO = {
  capitulo: 0,
  secao: 1,
  artigo: 2,
  inciso: 3,
  paragrafo: 4,
  alinea: 5,
};

/** Correções pontuais de numeração: art-8 p4/p5 eram §4º/§5º, são §1º/§2º. */
const CORRECOES_NUMERO = new Map([
  ["art-8-p4", "1º"],
  ["art-8-p5", "2º"],
]);

const client = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();
  const res = await client.query(
    `SELECT id, parent_id, type, numero, ordem_pai FROM provisions ORDER BY parent_id NULLS FIRST, ordem_pai`
  );
  const rows = res.rows;

  const filhosPorPai = new Map();
  for (const r of rows) {
    const key = r.parent_id ?? "__raiz__";
    if (!filhosPorPai.has(key)) filhosPorPai.set(key, []);
    filhosPorPai.get(key).push(r);
  }

  let movidos = 0;
  let numerosCorrigidos = 0;

  for (const [, filhos] of filhosPorPai) {
    // Ordena por hierarquia normativa; dentro do mesmo tipo, mantém ordem_pai atual.
    const ordenados = [...filhos].sort((a, b) => {
      const ra = RANK_TIPO[a.type] ?? 99;
      const rb = RANK_TIPO[b.type] ?? 99;
      if (ra !== rb) return ra - rb;
      return a.ordem_pai - b.ordem_pai;
    });

    for (let i = 0; i < ordenados.length; i++) {
      const f = ordenados[i];
      const novo = CORRECOES_NUMERO.get(f.id);
      if (f.ordem_pai !== i) {
        await client.query("UPDATE provisions SET ordem_pai = $1, updated_at = to_char(now(), 'YYYY-MM-DD HH24:MI:SS') WHERE id = $2", [i, f.id]);
        movidos++;
      }
      if (novo && f.numero !== novo) {
        await client.query("UPDATE provisions SET numero = $1 WHERE id = $2", [novo, f.id]);
        numerosCorrigidos++;
      }
    }
  }

  console.log(`Reordenação concluída: ${movidos} dispositivo(s) com ordem_pai ajustada, ${numerosCorrigidos} número(s) corrigido(s).`);
  await client.end();
}

main().catch((e) => {
  console.error("ERRO:", e.message);
  process.exit(1);
});