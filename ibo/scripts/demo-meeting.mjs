import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, "..", "data", "esdras.db");

const db = new Database(DB_PATH);
db.pragma("foreign_keys = ON");

const now = new Date().toISOString().replace("T", " ").slice(0, 19);

db.prepare("DELETE FROM meeting_decisions WHERE meeting_id = 1").run();
db.prepare("DELETE FROM meeting_events WHERE meeting_id = 1").run();
db.prepare("DELETE FROM meeting_members WHERE meeting_id = 1").run();
db.prepare("DELETE FROM minutes WHERE meeting_id = 1").run();
db.prepare("DELETE FROM meetings WHERE id = 1").run();

db.prepare(
  "INSERT INTO meetings (id, numero, data, horario, local, pauta, coordenador_id, secretario_id, status, created_at) VALUES (1, 1, date('now'), '19:30', 'Sala da comissão — Templo IBO', 'Análise do Capítulo II; deliberação sobre o Art. 7º', 2, 3, 'em_andamento', ?)"
).run(now);

const members = db.prepare("SELECT id FROM users WHERE role IN ('coordenador','membro')").all();
const setPres = db.prepare("UPDATE meeting_members SET presente=1 WHERE meeting_id=1 AND user_id=?");
for (const [i, m] of members.entries()) {
  db.prepare("INSERT INTO meeting_members (meeting_id, user_id) VALUES (1, ?)").run(m.id);
  if (i < 7) setPres.run(m.id);
}

const ev = db.prepare("INSERT INTO meeting_events (meeting_id, user_id, hora, tipo, descricao) VALUES (1,?,?,?,?)");
ev.run(2, "19:42", "inicio", "Reunião iniciada");
ev.run(2, "19:50", "status", "art-8 colocado em discussão");
ev.run(3, "20:03", "deliberacao", "DEC-2026-09-01-001-001 — Art. 7º colocado em análise");

db.prepare(
  "INSERT INTO meeting_decisions (code, meeting_id, provision_id, tipo, texto, user_id, created_at) VALUES (?,1,?,?,?,?,?)"
).run("DEC-2026-09-01-001-001", "art-7", "analise", "Art. 7º colocado em análise para revisão dos incisos III e IV.", 2, now);

console.log("Reunião demo recriada com encoding correto.");
console.log(db.prepare("SELECT descricao FROM meeting_events ORDER BY id").all());