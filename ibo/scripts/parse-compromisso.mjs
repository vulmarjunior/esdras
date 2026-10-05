// Converte o TXT do Compromisso de Membresia em árvore do motor da Mesa.
// Módulo puro (sem banco), usado pelo script de carga e pelos testes.
//
// Mapeamento:
//   PREÂMBULO / linhas de caixa alta  → bloco livre (sem número)
//   CAPÍTULO N — Título               → nó "chapter"
//   N. TÍTULO                         → nó "article" (a seção numerada)
//   parágrafos                        → filhos livres da seção/capítulo
//   Fundamentos bíblicos: ...         → filho livre em itálico

export const COMPROMISSO_DRAFT_ID = "compromisso-membresia-2026";

const semAcento = (linha) => linha.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function caixaAlta(linha) {
  const letras = semAcento(linha).replace(/[^A-Za-z]/g, "");
  return letras.length > 0 && semAcento(linha) === semAcento(linha).toUpperCase();
}

/** Converte o texto integral do Compromisso em um Draft { id, nodes }. */
export function converterCompromisso(texto) {
  const nodes = [];
  let alvo = nodes;
  let prefixo = "preambulo";
  let capitulo = null;
  let cap = 0;
  let sec = 0;
  const contadores = new Map();
  const proximoId = (base) => {
    const n = (contadores.get(base) ?? 0) + 1;
    contadores.set(base, n);
    return `${base}-${n}`;
  };
  const criar = (id, type, text, extra = {}) => {
    const node = { id, type, text, children: [] };
    if (extra.runs) node.runs = extra.runs;
    if (extra.alignment) node.alignment = extra.alignment;
    return node;
  };
  const linhas = String(texto ?? "").replace(/\r\n?/g, "\n").split("\n");
  for (const bruta of linhas) {
    const linha = bruta.trim();
    if (!linha) continue;
    if (/^IGREJA BATISTA OLARIA$/i.test(linha) || /^COMPROMISSO DE MEMBRESIA$/i.test(linha)) continue;
    if (/^PREÂMBULO$/i.test(linha)) {
      nodes.push(criar("preambulo", "free", "PREÂMBULO", { runs: [{ text: "PREÂMBULO", marks: ["bold"] }], alignment: "center" }));
      alvo = nodes;
      prefixo = "preambulo";
      capitulo = null;
      continue;
    }
    const capituloEncontrado = linha.match(/^CAP[ÍI]TULO\s+([IVXLC]+)\s*[—–-]\s*(.+)$/i);
    if (capituloEncontrado) {
      cap += 1;
      const titulo = capituloEncontrado[2].trim();
      const node = criar(`cap-${cap}`, "chapter", titulo, { runs: [{ text: titulo, marks: ["bold"] }] });
      nodes.push(node);
      capitulo = node;
      alvo = node.children;
      prefixo = `cap-${cap}`;
      continue;
    }
    const secaoEncontrada = linha.match(/^(\d+)\.\s+(.+)$/);
    if (secaoEncontrada && capitulo) {
      sec += 1;
      const titulo = secaoEncontrada[2].trim();
      const node = criar(`sec-${sec}`, "article", titulo, { runs: [{ text: titulo, marks: ["bold"] }] });
      capitulo.children.push(node);
      alvo = node.children;
      prefixo = `sec-${sec}`;
      continue;
    }
    if (/^Fundamentos bíblicos:/i.test(linha)) {
      alvo.push(criar(proximoId(prefixo + "-fundamentos"), "free", linha, { runs: [{ text: linha, marks: ["italic"] }] }));
      continue;
    }
    if (capitulo && caixaAlta(linha)) {
      alvo.push(criar(proximoId(prefixo + "-titulo"), "free", linha, { runs: [{ text: linha, marks: ["bold"] }], alignment: "center" }));
      continue;
    }
    if (nodes.length === 0 && /^Uma aliança de fé/i.test(linha)) {
      nodes.push(criar("subtitulo", "free", linha, { runs: [{ text: linha, marks: ["italic"] }], alignment: "center" }));
      continue;
    }
    alvo.push(criar(proximoId(prefixo), "free", linha));
  }
  return { id: COMPROMISSO_DRAFT_ID, nodes };
}
