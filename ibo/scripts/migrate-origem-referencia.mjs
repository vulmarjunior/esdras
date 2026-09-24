import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

const client = new pg.Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

try {
  await client.query(
    "ALTER TABLE provisions ADD COLUMN IF NOT EXISTS origem_ref_id TEXT REFERENCES provisions(id) ON DELETE SET NULL"
  );
  await client.query(
    "ALTER TABLE provisions ADD COLUMN IF NOT EXISTS sem_origem INTEGER NOT NULL DEFAULT 0 CHECK (sem_origem IN (0,1))"
  );
  console.log("Colunas origem_ref_id e sem_origem garantidas em provisions.");
} finally {
  await client.end();
}
