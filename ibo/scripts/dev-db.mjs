// Sobe (ou cria) o Postgres de teste local em Docker para o ambiente de
// desenvolvimento isolado da produção.
//
// Uso: node scripts/dev-db.mjs
// Requer o Docker Desktop aberto.
import { execFileSync } from "node:child_process";

const NOME = "esdras-pg";
const PORTA = "5433";
const USUARIO = "esdras";
const SENHA = "esdras";
const BANCO = "esdras";
const IMAGEM = "postgres:17";

function docker(args, { inherit = false } = {}) {
  return execFileSync("docker", args, { encoding: "utf8", stdio: inherit ? "inherit" : "pipe" });
}

try {
  docker(["version", "--format", "{{.Server.Version}}"]);
} catch {
  console.error("Docker não está respondendo. Abra o Docker Desktop e rode de novo: node scripts/dev-db.mjs");
  process.exit(1);
}

const existe = docker(["ps", "-a", "--filter", `name=^/${NOME}$`, "--format", "{{.Names}}"]).trim();
if (!existe) {
  console.log(`Criando container ${NOME} (${IMAGEM}) na porta ${PORTA}...`);
  docker(
    [
      "run", "-d", "--name", NOME,
      "-e", `POSTGRES_USER=${USUARIO}`,
      "-e", `POSTGRES_PASSWORD=${SENHA}`,
      "-e", `POSTGRES_DB=${BANCO}`,
      "-p", `${PORTA}:5432`,
      "-v", `${NOME}-data:/var/lib/postgresql/data`,
      IMAGEM,
    ],
    { inherit: true }
  );
} else {
  const rodando = docker(["ps", "--filter", `name=^/${NOME}$`, "--format", "{{.Names}}"]).trim();
  if (rodando) {
    console.log(`Container ${NOME} já está rodando.`);
  } else {
    console.log(`Iniciando container ${NOME}...`);
    docker(["start", NOME], { inherit: true });
  }
}

let pronto = false;
for (let i = 0; i < 60; i++) {
  try {
    docker(["exec", NOME, "pg_isready", "-U", USUARIO, "-d", BANCO]);
    pronto = true;
    break;
  } catch {
    await new Promise((r) => setTimeout(r, 1000));
  }
}

if (!pronto) {
  console.error(`O banco não ficou pronto a tempo. Veja os logs: docker logs ${NOME}`);
  process.exit(1);
}

console.log(`\nBanco de teste pronto: postgresql://${USUARIO}:${SENHA}@localhost:${PORTA}/${BANCO}`);
console.log("Próximo passo: node scripts/copiar-banco.mjs");
