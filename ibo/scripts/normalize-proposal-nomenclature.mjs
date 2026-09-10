import dotenv from "dotenv";
import { Client } from "pg";

dotenv.config({ path: ".env.local" });

const ORDINAL_WORDS = { primeiro: "1º", segundo: "2º", terceiro: "3º", quarto: "4º", quinto: "5º", sexto: "6º", sétimo: "7º", oitavo: "8º", nono: "9º", décimo: "10" };
const numeroLegal = (numero) => {
  const n = numero.trim().replace(/[º°.]+$/, "");
  if (!/^\d+$/.test(n)) return numero.trim();
  const value = Number(n);
  return value > 0 && value < 10 ? `${value}º` : String(value);
};
function normalizeProposalNomenclature(text) {
  let out = text;
  out = out.replace(/\bParágrafo\s+(primeiro|segundo|terceiro|quarto|quinto|sexto|sétimo|oitavo|nono|décimo)\b/gi, (_, word) => `§ ${ORDINAL_WORDS[word.toLowerCase()]}`);
  out = out.replace(/\b(parágrafo|Parágrafo)\s+(único)\b/gi, (match, label) => label === "Parágrafo" ? "Parágrafo único" : "parágrafo único");
  out = out.replace(/(parágrafo|Parágrafo)\s+(\d+)\s*(?:º|°)?(?=\s|[.,;:)\-—]|$)/g, (_, label, numero) => `§ ${numeroLegal(numero)}`);
  out = out.replace(/\b(artigo|Artigo)\s+(\d+)\s*(?:º|°)?(?=\s|[.,;:)\-—]|$)/g, (_, label, numero) => `${label === "Artigo" ? "Art." : "art."} ${numeroLegal(numero)}`);
  out = out.replace(/\b(deste|neste|do|no|ao|o)\s+Artigo\b/g, "$1 artigo");
  out = out.replace(/\bArt\.\s*(\d+)(\s*(?:<[^>]*>\s*)?)(?:º|°)?/g, (_, numero, tags) => `Art. ${numeroLegal(numero)}${tags}`);
  out = out.replace(/Art\.\s*(\d+[º]?)((?:<[^>]*>)?)[ \t]*[-—][ \t]*/g, (_, numero, tags) => `Art. ${numero}${tags} `);
  out = out.replace(/§\s*(\d+\s*(?:º|°)?)/g, (_, numero) => `§ ${numeroLegal(numero)}`);
  out = out.replace(/§\s*(\d+[º]?)\s*[-—]\s*/g, (_, numero) => `§ ${numero} `);
  return out;
}

const apply = process.argv.includes("--apply");
const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

function normalizeRow(row) {
  let text = row.proposta_inicial || "";
  // O dispositivo único deve permanecer “Parágrafo único”, mesmo quando a
  // fonte preliminar o chamou de “Parágrafo primeiro”.
  if (row.type === "paragrafo" && (row.numero || "").toLowerCase() === "único") {
    text = text.replace(/^([\s]*)Parágrafo\s+(?:primeiro|1º|1)\b/i, "$1Parágrafo único");
  }
  return normalizeProposalNomenclature(text);
}

try {
  await client.connect();
  const { rows } = await client.query(
    "SELECT id, type, numero, proposta_inicial FROM provisions WHERE proposta_inicial <> $1 ORDER BY ordem",
    [""]
  );
  const changes = rows.map((row) => ({ ...row, novo: normalizeRow(row) })).filter((row) => row.novo !== row.proposta_inicial);
  console.log(`${apply ? "Aplicando" : "Simulação"}: ${changes.length} proposta(s) serão normalizadas.`);
  for (const row of changes.slice(0, 12)) console.log(`- ${row.id}: ${row.proposta_inicial.slice(0, 70)} -> ${row.novo.slice(0, 70)}`);
  if (!apply || changes.length === 0) process.exit(0);

  const admin = await client.query("SELECT id, name FROM users WHERE role = $1 AND deleted_at IS NULL ORDER BY id LIMIT 1", ["admin"]);
  if (!admin.rows[0]) throw new Error("Nenhum administrador ativo encontrado para registrar a auditoria.");
  const actor = admin.rows[0];
  await client.query("BEGIN");
  try {
    for (const row of changes) {
      await client.query("UPDATE provisions SET proposta_inicial = $1, updated_at = to_char(now(), 'YYYY-MM-DD HH24:MI:SS') WHERE id = $2", [row.novo, row.id]);
      await client.query(
        "INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, detail) VALUES ($1, $2, $3, $4, $5, $6)",
        [actor.id, actor.name, "Proposta inicial normalizada", "provision", row.id, `Antes: ${row.proposta_inicial.slice(0, 300)}\nDepois: ${row.novo.slice(0, 300)}`]
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
  console.log(`Concluído. ${changes.length} proposta(s) atualizadas e auditadas.`);
} finally {
  await client.end();
}
