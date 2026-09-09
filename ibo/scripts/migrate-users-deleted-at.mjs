import nextEnv from "@next/env";
import pg from "pg";

nextEnv.loadEnvConfig(process.cwd());
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não configurada.");
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});
try {
  await client.connect();
  await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TEXT");
  console.log("Coluna users.deleted_at disponível; nenhum usuário removido.");
} finally {
  await client.end();
}
