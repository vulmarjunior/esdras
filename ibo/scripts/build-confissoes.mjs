// Gera lib/confissoes/data/*.json a partir dos textos-fonte em "../Documentos fonte".
// Cada JSON contém apenas { itens: [{ titulo, conteudo }] }; metadados (nome, ano,
// origem, resumo) ficam nos módulos TS de lib/confissoes.
// Uso: node scripts/build-confissoes.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const FONTE = join(ROOT, "..", "Documentos fonte");
const OUT = join(ROOT, "lib", "confissoes", "data");
mkdirSync(OUT, { recursive: true });

const ler = (p) => readFileSync(join(FONTE, p), "utf8");
const gravar = (nome, itens) => {
  const alvo = join(OUT, nome);
  writeFileSync(alvo, JSON.stringify({ itens }, null, 2) + "\n", "utf8");
  const tamanho = Buffer.byteLength(readFileSync(alvo, "utf8"), "utf8");
  console.log(`${nome} — ${itens.length} itens — ${(tamanho / 1024).toFixed(0)} KB`);
};

function limparLinha(linha) {
  let s = linha.replace(/^>\s?/, "");
  s = s.replace(/\*\*/g, "");
  s = s.replace(/^\*(.*)\*$/, "$1");
  s = s.trim();
  if (/^-{3,}$/.test(s)) return "";
  return s;
}

function anexar(atual, linha) {
  const s = limparLinha(linha);
  if (!s) return;
  atual.conteudo += (atual.conteudo ? "\n\n" : "") + s;
}

// ---------- Londres 1689 ----------
function parseLondres() {
  const linhas = ler("Confissao-de-Fe-Batista-Londres-1689.md").split(/\r?\n/);
  const titulos = {};
  for (const l of linhas) {
    const m = l.match(/^-\s*Cap[íi]tulo\s+(\d+)\s*-\s*(.+)$/);
    if (m) titulos[Number(m[1])] = m[2].trim();
  }
  const itens = [];
  let atual = null;
  for (const l of linhas) {
    const m = l.match(/^##\s*CAP[ÍI]TULO\s+(\d+)$/);
    if (m) {
      if (atual) {
        atual.conteudo = atual.conteudo.trim();
        if (atual.conteudo) itens.push(atual);
      }
      const n = Number(m[1]);
      atual = { titulo: `Capítulo ${n} — ${titulos[n] || ""}`.replace(/\s+$/, ""), conteudo: "" };
      continue;
    }
    if (!atual) continue;
    if (/^###\s+/.test(l) && atual.conteudo.trim() === "") continue;
    anexar(atual, l);
  }
  if (atual) {
    atual.conteudo = atual.conteudo.trim();
    if (atual.conteudo) itens.push(atual);
  }
  return itens;
}

// ---------- New Hampshire 1833 ----------
function parseNewHampshire() {
  const linhas = ler("Confissao-de-Fe-Batista-New-Hampshire-1833.md").split(/\r?\n/);
  const itens = [];
  let iniciado = false;
  let atual = null;
  for (const l of linhas) {
    if (!iniciado) {
      if (/^##\s*DECLARAÇÃO DE FÉ/.test(l)) iniciado = true;
      continue;
    }
    if (/^-{3,}\s*$/.test(l.trim())) break;
    const m = l.match(/^###\s+(.+)$/);
    if (m) {
      if (atual) itens.push(atual);
      atual = { titulo: m[1].trim(), conteudo: "" };
      continue;
    }
    if (atual) anexar(atual, l);
  }
  if (atual) itens.push(atual);
  return itens;
}

// ---------- Fé e Mensagem Batista 2000 ----------
function parseFeMensagem() {
  const linhas = ler("Fe-e-Mensagem-Batista.md").split(/\r?\n/);
  const itens = [];
  let pai = null;
  let atual = null;
  const romanos = /^([IVXLC]+)\.\s+(.+)$/;
  for (const l of linhas) {
    if (/^-{3,}\s*$/.test(l.trim()) && atual) break;
    const h2 = l.match(/^##\s+(.+)$/);
    if (h2) {
      const rm = h2[1].match(romanos);
      if (!rm) continue;
      pai = h2[1].trim();
      if (atual) itens.push(atual);
      atual = { titulo: pai, conteudo: "" };
      continue;
    }
    const h3 = l.match(/^###\s+(.+)$/);
    if (h3) {
      if (atual) itens.push(atual);
      atual = { titulo: `${pai || ""} — ${h3[1].trim()}`.replace(/^ — /, ""), conteudo: "" };
      continue;
    }
    if (atual) anexar(atual, l);
  }
  if (atual) itens.push(atual);
  return itens;
}

// ---------- Seções de documentos-de-fe.md (Declaração, Princípios, Pacto) ----------
function parseSecaoDocumentosDeFe(indice, tituloIntro = "Introdução") {
  const full = ler("documentos-de-fe.md");
  const linhas = full.split(/\r?\n/);
  const blocos = [];
  let atual = null;
  for (const l of linhas) {
    const m = l.match(/^##\s+(\d+)\.\s+(.+)$/);
    if (m) {
      atual = { indice: Number(m[1]), linhas: [] };
      blocos.push(atual);
      continue;
    }
    if (atual) atual.linhas.push(l);
  }
  const bloco = blocos.find((b) => b.indice === indice);
  if (!bloco) throw new Error(`Seção ${indice} não encontrada em documentos-de-fe.md`);

  const itens = [];
  let pai = null;
  let item = null;
  let preambulo = "";
  for (const l of bloco.linhas) {
    const h3 = l.match(/^###\s+(.+)$/);
    const h4 = l.match(/^####\s+(.+)$/);
    if (h3 || h4) {
      if (item) itens.push(item);
      const titulo = h3 ? h3[1].trim() : `${pai ? `${pai} — ` : ""}${h4[1].trim()}`;
      const mergeIntro = preambulo && /^introdução$/i.test(titulo);
      if (preambulo && !mergeIntro) {
        itens.push({ titulo: tituloIntro, conteudo: preambulo });
      }
      preambulo = "";
      pai = h3 ? titulo : pai;
      item = { titulo, conteudo: mergeIntro ? preambulo : "" };
      continue;
    }
    const s = limparLinha(l);
    if (!s) continue;
    if (!item) {
      preambulo += (preambulo ? "\n\n" : "") + s;
    } else {
      anexar(item, l);
    }
  }
  if (item) itens.push(item);
  if (preambulo) itens.push({ titulo: tituloIntro, conteudo: preambulo });
  return itens.filter((i) => i.conteudo.trim());
}

gravar("londres-1689.json", parseLondres());
gravar("new-hampshire-1833.json", parseNewHampshire());
gravar("fe-mensagem-2000.json", parseFeMensagem());
gravar("cbb-declaracao.json", parseSecaoDocumentosDeFe(1));
gravar("principios-batistas.json", parseSecaoDocumentosDeFe(2));
gravar("pacto-igrejas.json", parseSecaoDocumentosDeFe(3, "Pacto das Igrejas Batistas"));