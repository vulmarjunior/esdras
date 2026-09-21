/**
 * Divisão de textos (MD/TXT) em seções para a biblioteca de literatura.
 *
 * Módulo puro, sem banco. Aceita tanto Markdown limpo (títulos com `#`) quanto
 * textos sujos de OCR/conversão: remove artefatos repetidos, funde títulos
 * quebrados em várias linhas, funde seções minúsculas na anterior, divide
 * seções gigantes em parágrafos e, sem títulos, cai em blocos por tamanho.
 */
import type { SecaoImportada } from "./types";

const MAX_TITULO = 90;
const MIN_CONTEUDO = 150;
const MAX_CONTEUDO = 4000;
const CHUNK_FALLBACK = 3000;
const MAX_TITULO_FUNDIDO = 60;

const RUIDO_LINHA = /^(issuu\.com\/|www\.|https?:\/\/|via:)/i;
const NOTA_RODAPE = /^(ibid\b|cf\.|ver\b|veja\b)/i;
const PAGINA_SO = /^\d{1,4}$/;
const NOTA_NUMERADA = /^\d+\.\s+(ibid\b|cf\.|ver\b|veja\b)/i;

function normalizarLinhas(texto: string): string[] {
  return texto
    .replace(/\uFEFF/g, "")
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+$/, ""))
    .filter((l) => !RUIDO_LINHA.test(l.trim()));
}

/** Devolve o título quando a linha é um cabeçalho válido; senão, null. */
function tituloDaLinha(linha: string): string | null {
  const m = /^(#{1,6})\s+(.+)$/.exec(linha);
  if (!m) return null;
  const t = m[2].replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
  if (!t) return null;
  if (PAGINA_SO.test(t)) return null;
  if (NOTA_RODAPE.test(t)) return null;
  if (t.length > MAX_TITULO) return null;
  if (/[.,;:]$/.test(t)) return null;
  if (/[a-zá-ú][,.][a-zá-ú]/i.test(t)) return null;
  if (/\.\s*\d+\s*$/.test(t)) return null;
  if (/^["“”'‘’]/.test(t)) return null;
  return t;
}

function juntarLinhas(linhas: string[]): string {
  let texto = "";
  for (const linha of linhas) {
    if (!texto) {
      texto = linha;
      continue;
    }
    if (/[-–]$/.test(texto) && /^[a-zá-ú]/.test(linha)) {
      texto = texto.slice(0, -1) + linha;
    } else {
      texto += " " + linha;
    }
  }
  return texto.replace(/\s+/g, " ").trim();
}

function dividirPorParagrafos(conteudo: string, max: number): string[] {
  const paragrafos = conteudo.split(/\n{2,}/);
  const partes: string[] = [];
  let atual = "";
  for (const p of paragrafos) {
    if (atual && atual.length + p.length + 2 > max) {
      partes.push(atual);
      atual = p;
    } else {
      atual = atual ? `${atual}\n\n${p}` : p;
    }
  }
  if (atual) partes.push(atual);
  return partes;
}

function posProcessar(secoes: SecaoImportada[]): SecaoImportada[] {
  // Descarta pré-texto sem título (ficha catalográfica, créditos) antes do
  // primeiro título real — comum em EPUB e em conversões.
  let inicio = 0;
  if (secoes.some((s) => s.titulo)) {
    while (inicio < secoes.length && !secoes[inicio].titulo) inicio++;
  }
  const comConteudo = secoes.slice(inicio).filter((s) => s.conteudo.trim());
  const resultado: SecaoImportada[] = [];

  for (const secao of comConteudo) {
    const conteudo = secao.conteudo.trim();
    const anterior = resultado[resultado.length - 1];
    if (conteudo.length < MIN_CONTEUDO && anterior && secao.titulo) {
      anterior.conteudo += `\n\n${secao.titulo}\n\n${conteudo}`;
      continue;
    }
    resultado.push({ titulo: secao.titulo, conteudo });
  }

  const finais: SecaoImportada[] = [];
  for (const secao of resultado) {
    if (secao.conteudo.length <= MAX_CONTEUDO) {
      finais.push(secao);
      continue;
    }
    const partes = dividirPorParagrafos(secao.conteudo, MAX_CONTEUDO);
    partes.forEach((parte, i) => {
      finais.push({
        titulo: `${secao.titulo} (parte ${i + 1})`,
        conteudo: parte,
      });
    });
  }
  return finais;
}

function fallbackPorBlocos(texto: string): SecaoImportada[] {
  const paragrafos = texto
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const secoes: SecaoImportada[] = [];
  let atual = "";
  const fechar = () => {
    if (!atual) return;
    const primeiros = atual.split(/[.!?]\s/)[0] || atual;
    const titulo = primeiros.length <= MAX_TITULO ? primeiros : primeiros.slice(0, MAX_TITULO).trimEnd() + "…";
    secoes.push({ titulo, conteudo: atual });
    atual = "";
  };
  for (const p of paragrafos) {
    if (atual && atual.length + p.length + 2 > CHUNK_FALLBACK) fechar();
    atual = atual ? `${atual}\n\n${p}` : p;
  }
  fechar();
  return secoes;
}

/** Divide um texto (Markdown ou texto puro) em seções importáveis. */
export function parseMarkdown(texto: string): SecaoImportada[] {
  const linhas = normalizarLinhas(texto);
  const secoes: SecaoImportada[] = [];
  let tituloPendente: string[] = [];
  let conteudo: string[] = [];
  let paragrafo: string[] = [];
  let titulosDetectados = 0;

  const flushParagrafo = () => {
    if (!paragrafo.length) return;
    const p = juntarLinhas(paragrafo);
    paragrafo = [];
    if (p) conteudo.push(p);
  };
  const flushSecao = () => {
    flushParagrafo();
    if (tituloPendente.length || conteudo.length) {
      secoes.push({
        titulo: tituloPendente.join(" ").trim(),
        conteudo: conteudo.join("\n\n"),
      });
    }
    tituloPendente = [];
    conteudo = [];
  };

  for (const linha of linhas) {
    const titulo = tituloDaLinha(linha);
    if (titulo !== null) {
      titulosDetectados++;
      const semConteudo = conteudo.length === 0 && paragrafo.length === 0;
      if (tituloPendente.length && semConteudo) {
        const ultimo = tituloPendente[tituloPendente.length - 1];
        const juntos = [...tituloPendente, titulo].join(" ");
        if (!/[.!?]$/.test(ultimo) && juntos.length <= MAX_TITULO_FUNDIDO) {
          tituloPendente.push(titulo);
          continue;
        }
      }
      if (!semConteudo) flushSecao();
      tituloPendente = [titulo];
      continue;
    }
    const texto = linha.trim();
    if (!texto) {
      flushParagrafo();
      continue;
    }
    if (texto.startsWith("#")) {
      const semMarcador = texto.replace(/^#{1,6}\s*/, "").trim();
      if (!semMarcador || PAGINA_SO.test(semMarcador) || NOTA_RODAPE.test(semMarcador) || NOTA_NUMERADA.test(semMarcador)) {
        continue;
      }
      paragrafo.push(semMarcador);
      continue;
    }
    if (PAGINA_SO.test(texto) || NOTA_NUMERADA.test(texto)) continue;
    paragrafo.push(texto);
  }
  flushSecao();

  const resultado = posProcessar(secoes);
  if (resultado.length >= 3 || titulosDetectados > 0) return resultado;
  return fallbackPorBlocos(texto);
}

/** Sugere um resumo (para o contexto da IA) a partir das seções. */
export function sugerirResumo(secoes: SecaoImportada[]): string {
  const base = secoes
    .map((s) => s.conteudo)
    .filter((c) => c.trim().length > 200)
    .slice(0, 2)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  return base.length <= 300 ? base : base.slice(0, 300).trimEnd() + "…";
}
