import nextEnv from "@next/env";
import pg from "pg";

nextEnv.loadEnvConfig(process.cwd());
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não configurada.");

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

function plain(text) {
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function marker(type, text) {
  const value = plain(text);
  if (type === "capitulo") {
    return value.match(/^CAPÍTULO\s+([IVXLCDM]+)/i)?.[1]?.toUpperCase() ?? null;
  }
  if (type === "artigo") {
    const explicit = value.match(/^Art\.?\s*(\d+)/i)?.[1];
    const moved = value.match(/^(?:Movido|Removido)\s+para(?:\s+o)?\s+art\.?\s*(\d+)/i)?.[1];
    const number = explicit ?? moved;
    return number ? `${Number(number)}º` : null;
  }
  if (type === "paragrafo") {
    const number = value.match(/^§\s*(\d+)/)?.[1];
    return number ? `${Number(number)}º` : null;
  }
  if (type === "inciso") {
    return value.match(/^([IVXLCDM]+)\s*(?:-|—|\.)/)?.[1]?.toUpperCase() ?? null;
  }
  if (type === "alinea") {
    const letter = value.match(/^([a-z])\s*[\)\-—\.]/i)?.[1];
    return letter ? `${letter.toLowerCase()})` : null;
  }
  return null;
}

await client.connect();
try {
  await client.query("BEGIN");
  const { rows } = await client.query(`
    SELECT p.id, p.type, p.proposta_inicial, pp.numero
      FROM provisions p
      JOIN provision_placements pp
        ON pp.provision_id = p.id AND pp.version_key = 'proposta'
     WHERE p.proposta_inicial <> ''
     ORDER BY p.ordem
  `);
  let changed = 0;
  for (const row of rows) {
    const next = marker(row.type, row.proposta_inicial);
    if (!next || next === row.numero) continue;
    await client.query(`
      UPDATE provision_placements
         SET numero = ?, updated_at = to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
       WHERE provision_id = ? AND version_key = 'proposta'
    `.replace("numero = ?", "numero = $1").replace("provision_id = ?", "provision_id = $2"), [next, row.id]);
    await client.query(
      `INSERT INTO audit_logs (action, entity, entity_id, detail)
       VALUES ($1, $2, $3, $4)`,
      ["Sincronização de marcadores da proposta", "provision_placement", row.id, `${row.type}: ${row.numero ?? "—"} → ${next}`]
    );
    changed++;
  }
  await client.query("COMMIT");
  console.log(`Marcadores explícitos sincronizados: ${changed}.`);
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("Falha na sincronização:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.end();
}
