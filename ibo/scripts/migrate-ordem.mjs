import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, "..", "data", "esdras.db");

const db = new Database(DB_PATH);
db.pragma("foreign_keys = ON");

const cols = db.prepare("PRAGMA table_info(provisions)").all();
if (!cols.some((c) => c.name === "ordem_pai")) {
  db.exec("ALTER TABLE provisions ADD COLUMN ordem_pai INTEGER NOT NULL DEFAULT 0");
  console.log("Coluna ordem_pai adicionada.");
} else {
  console.log("Coluna ordem_pai já existe.");
}

db.exec(`
  UPDATE provisions SET ordem_pai = (
    SELECT COUNT(*) FROM provisions p2
    WHERE p2.parent_id IS provisions.parent_id AND p2.ordem <= provisions.ordem
  ) - 1
`);

console.log("Reindexação entre irmãos concluída.");

const check = db.prepare(`
  SELECT p.id, p.parent_id, p.ordem_pai FROM provisions p
  WHERE p.parent_id IS NOT NULL
  ORDER BY p.parent_id, p.ordem_pai LIMIT 8
`).all();
console.table(check);