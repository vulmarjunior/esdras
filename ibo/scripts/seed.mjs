import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const DB_PATH = process.env.DATABASE_PATH || path.join(root, "data", "esdras.db");

if (fs.existsSync(DB_PATH)) {
  fs.rmSync(DB_PATH);
  for (const ext of ["-wal", "-shm"]) {
    const p = DB_PATH + ext;
    if (fs.existsSync(p)) fs.rmSync(p);
  }
}
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(fs.readFileSync(path.join(root, "lib", "schema.sql"), "utf-8"));

const hash = (pw) => bcrypt.hashSync(pw, 10);

function insertUsers() {
  const users = [
    { name: "Administrador do Sistema", email: "admin@ibo.local", role: "admin", pw: "admin123" },
    { name: "Coordenadora da Comissão", email: "coordenador@ibo.local", role: "coordenador", pw: "coord123" },
    { name: "Membro 1", email: "membro1@ibo.local", role: "membro", pw: "membro123" },
    { name: "Membro 2", email: "membro2@ibo.local", role: "membro", pw: "membro123" },
    { name: "Membro 3", email: "membro3@ibo.local", role: "membro", pw: "membro123" },
    { name: "Membro 4", email: "membro4@ibo.local", role: "membro", pw: "membro123" },
    { name: "Membro 5", email: "membro5@ibo.local", role: "membro", pw: "membro123" },
    { name: "Membro 6", email: "membro6@ibo.local", role: "membro", pw: "membro123" },
    { name: "Membro 7", email: "membro7@ibo.local", role: "membro", pw: "membro123" },
  ];
  const ins = db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)");
  for (const u of users) ins.run(u.name, u.email, hash(u.pw), u.role);
  return users;
}

let ordemCounter = 0;
const insertProvision = db.prepare(`
  INSERT INTO provisions
  (id, parent_id, type, numero, titulo, ordem, ordem_pai, origem, alteracao_tipo, status,
   texto_vigente, proposta_inicial, redacao_trabalho, justificativa, posicao_sugerida, version)
  VALUES (@id, @parent_id, @type, @numero, @titulo, @ordem, @ordem_pai, @origem, @alteracao_tipo, @status,
   @texto_vigente, @proposta_inicial, @redacao_trabalho, @justificativa, @posicao_sugerida, 0)
`);

function insertProv(node, parentId, irmaoIndex) {
  ordemCounter++;
  const redacaoTrabalho = node.propostaInicial || node.textoVigente || "";
  insertProvision.run({
    id: node.id,
    parent_id: parentId,
    type: node.type,
    numero: node.numero || null,
    titulo: node.titulo || null,
    ordem: ordemCounter,
    ordem_pai: irmaoIndex,
    origem: node.origem || "original",
    alteracao_tipo: node.alteracaoTipo || "nao_avaliado",
    status: "nao_iniciado",
    texto_vigente: node.textoVigente || "",
    proposta_inicial: node.propostaInicial || "",
    redacao_trabalho: redacaoTrabalho,
    justificativa: node.justificativa || "",
    posicao_sugerida: node.posicaoSugerida || null,
  });
  if (node.filhos && node.filhos.length) {
    node.filhos.forEach((child, i) => insertProv(child, node.id, i));
  }
}

function loadChapters() {
  const files = [
    "cap1.json", "cap2.json", "cap3.json", "cap4.json", "cap5.json",
    "cap6.json", "cap-dissolucao.json", "cap7.json",
  ];
  for (const f of files) {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "lib", "seed-data", f), "utf-8"));
    insertProv(data, null, 0);
  }
}

function seedExamples() {
  const now = new Date().toISOString().replace("T", " ").slice(0, 19);
  // Referências bíblicas de exemplo (Art. 8º - disciplina)
  const refs = [
    ["art-8", "biblica", "Mateus 18.15-17"],
    ["art-8", "biblica", "1 Coríntios 5.1-13"],
    ["art-8", "biblica", "Gálatas 6.1"],
  ];
  const insRef = db.prepare("INSERT INTO references_tb (provision_id, tipo, texto, author_id) VALUES (?, ?, ?, ?)");
  for (const [pid, tipo, texto] of refs) insRef.run(pid, tipo, texto, 3);

  // Sugestões de exemplo
  const insSug = db.prepare("INSERT INTO suggestions (provision_id, author_id, texto, justificativa, status) VALUES (?, ?, ?, ?, ?)");
  insSug.run("art-11", 3, "Sugiro manter a assembleia mensal, mas prever que a Tesouraria preste contas trimestralmente de forma consolidada.", "Permite manter a proximidade com a membresia e reduz a carga administrativa mensal.", "aberta");
  insSug.run("art-12", 4, "Proponho que o Segundo Vice-Presidente não figure entre os que assumem a presidência em sucessão, para dar mais clareza à linha sucessória.", "Clareza na ordem de substituição.", "aberta");

  // Pendências de exemplo
  const insPend = db.prepare("INSERT INTO pending_issues (provision_id, author_id, categoria, descricao) VALUES (?, ?, ?, ?)");
  insPend.run("art-5", 5, "referencia_cruzada", "Verificar se a remissão corrigida ao 'art. 32' no Art. 5º conflita com a redação final aprovada para o Art. 32 (Regimento Interno).");
  insPend.run("art-31", 6, "juridica", "Confirmar a redação final quanto aos artigos cuja alteração é vedada, considerando a renumeração e a criação do novo capítulo de dissolução.");

  // Auditoria inicial
  const insAudit = db.prepare("INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)");
  insAudit.run(1, "Administrador do Sistema", "Importação de documentos", "project", "projeto-ibo", "Importados o Estatuto registrado e a Proposta de Reforma com estrutura hierárquica.", now);
}

insertUsers();
loadChapters();
seedExamples();

const counts = {
  usuarios: db.prepare("SELECT COUNT(*) c FROM users").get().c,
  dispositivos: db.prepare("SELECT COUNT(*) c FROM provisions").get().c,
  artigos: db.prepare("SELECT COUNT(*) c FROM provisions WHERE type='artigo'").get().c,
  paragrafos: db.prepare("SELECT COUNT(*) c FROM provisions WHERE type='paragrafo'").get().c,
  incisos: db.prepare("SELECT COUNT(*) c FROM provisions WHERE type='inciso'").get().c,
  capitulos: db.prepare("SELECT COUNT(*) c FROM provisions WHERE type='capitulo'").get().c,
};
console.log("Seed concluído em", DB_PATH);
console.table(counts);
