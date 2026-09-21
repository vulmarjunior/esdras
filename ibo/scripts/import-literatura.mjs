// Importa os livros convertidos em "../Literatura de consulta/md-limpos" para o
// Postgres (tabelas library_books/library_sections). Idempotente por título:
// reexecutar substitui o livro e as seções.
//
// Uso: node scripts/import-literatura.mjs
import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseMarkdown, sugerirResumo } from "../lib/literatura/parse.ts";
import { normalizarTexto } from "../lib/busca.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const MD_DIR = path.join(root, "..", "Literatura de consulta", "md-limpos");

const LIVROS = [
  {
    arquivo: "16-r-c-sproul-o-que-e-a-igreja.md",
    titulo: "O Que é a Igreja?",
    autor: "R. C. Sproul",
    ano: 2014,
    fonte: "Editora Fiel",
  },
  {
    arquivo: "batismo-a-porta-de-entrada-na-bobby-jamieson.md",
    titulo: "Batismo: a porta de entrada na membresia da igreja",
    autor: "Bobby Jamieson",
    ano: null,
    fonte: "Editora Fiel (9Marks)",
  },
  {
    arquivo: "disciplina-na-igreja.md",
    titulo: "Disciplina na Igreja",
    autor: "Jim Elliff e Daryl Wingerd",
    ano: 2007,
    fonte: "Editora Fiel",
  },
  {
    arquivo: "o-que-e-uma-igreja-saudavel.md",
    titulo: "O que é uma Igreja Saudável?",
    autor: "Mark Dever",
    ano: 2009,
    fonte: "Editora Fiel",
  },
  {
    arquivo: "os-distintivos-da-teologia-pact-pascal-denault.md",
    titulo: "Os Distintivos da Teologia Pactual Batista",
    autor: "Pascal Denault",
    ano: null,
    fonte: null,
  },
  {
    arquivo: "teologia-bibilica-batista-reformada-pactual.md",
    titulo: "Teologia Bíblica Batista Reformada Pactual",
    autor: "Micah Renihan e Samuel Renihan",
    ano: 2016,
    fonte: "O Estandarte de Cristo",
  },
];

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

const client = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();

try {
  for (let ordem = 0; ordem < LIVROS.length; ordem++) {
    const livro = LIVROS[ordem];
    const caminho = path.join(MD_DIR, livro.arquivo);
    if (!fs.existsSync(caminho)) {
      console.error(`Arquivo ausente: ${caminho} — rode antes: python scripts/pdf-epub-para-md.py`);
      process.exit(1);
    }
    const secoes = parseMarkdown(fs.readFileSync(caminho, "utf8"));
    const resumo = sugerirResumo(secoes);

    await client.query("BEGIN");
    try {
      await client.query("DELETE FROM library_books WHERE titulo = $1", [livro.titulo]);
      const { rows } = await client.query(
        "INSERT INTO library_books (titulo, autor, ano, fonte, resumo, ordem) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
        [livro.titulo, livro.autor, livro.ano, livro.fonte, resumo, ordem]
      );
      const bookId = rows[0].id;
      for (let i = 0; i < secoes.length; i++) {
        const secao = secoes[i];
        await client.query(
          "INSERT INTO library_sections (book_id, ordem_pai, titulo, conteudo, busca) VALUES ($1, $2, $3, $4, $5)",
          [bookId, i, secao.titulo, secao.conteudo, normalizarTexto(`${secao.titulo} ${secao.conteudo}`)]
        );
      }
      await client.query("COMMIT");
      const chars = secoes.reduce((acc, s) => acc + s.conteudo.length, 0);
      console.log(`✓ ${livro.titulo} — ${secoes.length} seções, ${(chars / 1000).toFixed(0)} mil caracteres`);
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    }
  }
} finally {
  await client.end();
}
