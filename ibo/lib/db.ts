import { Pool, type PoolClient } from "pg";

const DB_URL = process.env.DATABASE_URL || "";

export const pool = new Pool({
  connectionString: DB_URL,
  ssl: { rejectUnauthorized: false },
});

let txClient: PoolClient | null = null;

/**
 * Converte SQL do dialeto SQLite para Postgres:
 * - `?` → `$1, $2, ...` (fora de strings)
 * - `datetime('now')` → `now()`
 * - `INSERT OR IGNORE` → `INSERT ... ON CONFLICT DO NOTHING`
 */
function convert(sql: string): { sql: string; orIgnore: boolean } {
  let i = 0;
  let out = "";
  let inStr = false;
  let quote = "";
  for (let k = 0; k < sql.length; k++) {
    const ch = sql[k];
    if (inStr) {
      out += ch;
      if (ch === quote) {
        if (sql[k + 1] === quote) {
          out += sql[k + 1];
          k++;
        } else {
          inStr = false;
        }
      }
      continue;
    }
    if (ch === "'" || ch === '"') {
      inStr = true;
      quote = ch;
      out += ch;
      continue;
    }
    if (ch === "?") {
      i++;
      out += `$${i}`;
      continue;
    }
    out += ch;
  }
  let s = out.replace(/datetime\('now'\)/gi, "to_char(now(), 'YYYY-MM-DD HH24:MI:SS')");
  const orIgnore = /^\s*insert\s+or\s+ignore/i.test(s);
  s = s.replace(/^\s*insert\s+or\s+ignore/i, "INSERT");
  if (orIgnore) s = s.trimEnd() + " ON CONFLICT DO NOTHING";
  return { sql: s, orIgnore };
}

async function exec(sql: string, params: unknown[] = []) {
  const { sql: converted } = convert(sql);
  const client = txClient || pool;
  return client.query(converted, params);
}

export function getDb() {
  return pool;
}

export function now(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

export type Row = Record<string, unknown>;

export async function all<T = Row>(sql: string, params: unknown[] = []): Promise<T[]> {
  const res = await exec(sql, params);
  return res.rows as T[];
}

export async function get<T = Row>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  const res = await exec(sql, params);
  return (res.rows[0] as T | undefined) ?? undefined;
}

export async function run(
  sql: string,
  params: unknown[] = []
): Promise<{ lastInsertRowid: number }> {
  const { sql: converted } = convert(sql);
  let finalSql = converted;
  if (/^\s*insert/i.test(converted)) {
    finalSql = converted.trimEnd() + " RETURNING id";
  }
  const client = txClient || pool;
  const res = await client.query(finalSql, params);
  const id = res.rows?.[0]?.id;
  return { lastInsertRowid: id === undefined ? 0 : Number(id) };
}

export async function transaction<T>(fn: () => T | Promise<T>): Promise<T> {
  if (txClient) return fn();
  const client = await pool.connect();
  txClient = client;
  try {
    await client.query("BEGIN");
    const result = await fn();
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    txClient = null;
    client.release();
  }
}