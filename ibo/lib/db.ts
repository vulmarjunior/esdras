import { Pool, type PoolClient } from "pg";
import { AsyncLocalStorage } from "node:async_hooks";

const DB_URL = process.env.DATABASE_URL || "";

/**
 * O Vercel cria instâncias efêmeras e concorrentes. No Supabase, a porta 5432
 * do shared pooler usa sessões dedicadas; a 6543 usa transaction pooling, que
 * permite compartilhar conexões entre essas instâncias.
 */
function databaseUrlForRuntime(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.endsWith(".pooler.supabase.com") && parsed.port === "5432") {
      parsed.port = "6543";
      return parsed.toString();
    }
  } catch {
    // A validação da URL continuará a cargo do pg, como antes.
  }
  return url;
}

function poolMax(): number {
  const configured = Number(process.env.DB_POOL_MAX || "1");
  return Number.isInteger(configured) && configured > 0 ? configured : 1;
}

/** SSL apenas fora de localhost (o Postgres de teste local não tem TLS). */
function sslFor(url: string): false | { rejectUnauthorized: boolean } {
  try {
    const host = new URL(url).hostname;
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") return false;
  } catch {
    // URL ausente/inválida: mantém o comportamento anterior (Supabase).
  }
  return { rejectUnauthorized: false };
}

export const pool = new Pool({
  connectionString: databaseUrlForRuntime(DB_URL),
  ssl: sslFor(DB_URL),
  // Cada instância serverless mantém no máximo uma conexão cliente.
  max: poolMax(),
  idleTimeoutMillis: 5_000,
  connectionTimeoutMillis: 10_000,
  allowExitOnIdle: true,
});

// Mantém o cliente transacional apenas no contexto assíncrono da requisição.
const transactionClient = new AsyncLocalStorage<PoolClient>();

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
  const client = transactionClient.getStore() || pool;
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
  const client = transactionClient.getStore() || pool;
  const res = await client.query(finalSql, params);
  const id = res.rows?.[0]?.id;
  return { lastInsertRowid: id === undefined ? 0 : Number(id) };
}

export async function transaction<T>(fn: () => T | Promise<T>): Promise<T> {
  if (transactionClient.getStore()) return fn();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await transactionClient.run(client, fn);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
