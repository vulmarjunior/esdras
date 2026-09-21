/**
 * Leitura de EPUB para a biblioteca de literatura (módulo puro, sem banco).
 *
 * EPUB é um ZIP com XHTML estruturado: usa o `container.xml` → OPF (metadados,
 * manifesto e spine) e converte os capítulos em seções (`h1`–`h6`) e
 * parágrafos (`p`, `blockquote`, `li`). Não depende de DOM.
 */
import { strFromU8, unzipSync } from "fflate";
import type { SecaoImportada } from "./types";

export interface MetaEpub {
  titulo: string;
  autor: string;
  ano: number | null;
}

export interface ResultadoEpub {
  meta: MetaEpub;
  secoes: SecaoImportada[];
}

const ENTIDADES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  ndash: "–", mdash: "—", hellip: "…", lsquo: "‘", rsquo: "’",
  ldquo: "“", rdquo: "”", bull: "•", middot: "·", deg: "°",
  aacute: "á", agrave: "à", acirc: "â", atilde: "ã", auml: "ä",
  eacute: "é", ecirc: "ê", euml: "ë", iacute: "í", icirc: "î",
  oacute: "ó", ocirc: "ô", otilde: "õ", ouml: "ö", uacute: "ú",
  uuml: "ü", ccedil: "ç", ntilde: "ñ", Aacute: "Á", Agrave: "À",
  Acirc: "Â", Atilde: "Ã", Eacute: "É", Ecirc: "Ê", Iacute: "Í",
  Oacute: "Ó", Ocirc: "Ô", Otilde: "Õ", Uacute: "Ú", Ccedil: "Ç",
};

export function decodificarEntidades(s: string): string {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (todo, corpo: string) => {
    if (corpo.startsWith("#x") || corpo.startsWith("#X")) {
      const codigo = parseInt(corpo.slice(2), 16);
      return Number.isFinite(codigo) ? String.fromCodePoint(codigo) : todo;
    }
    if (corpo.startsWith("#")) {
      const codigo = parseInt(corpo.slice(1), 10);
      return Number.isFinite(codigo) ? String.fromCodePoint(codigo) : todo;
    }
    return ENTIDADES[corpo] ?? todo;
  });
}

export function textoDeHtml(html: string): string {
  return decodificarEntidades(html.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
}

function resolverCaminho(base: string, href: string): string {
  const partes = (base ? `${base}/${href}` : href).split("/");
  const pilha: string[] = [];
  for (const parte of partes) {
    if (!parte || parte === ".") continue;
    if (parte === "..") pilha.pop();
    else pilha.push(parte);
  }
  return pilha.join("/");
}

function primeiroGrupo(texto: string, regex: RegExp): string {
  const m = regex.exec(texto);
  return m ? m[1].trim() : "";
}

/** Extrai seções de um capítulo XHTML (h1–h6 = títulos; p/blockquote/li = texto). */
export function secoesDeXhtml(xhtml: string): SecaoImportada[] {
  const corpo = xhtml
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");

  const secoes: SecaoImportada[] = [];
  let titulo = "";
  let conteudo: string[] = [];
  let abertura: { tag: string; inicio: number } | null = null;

  const fechar = () => {
    if (titulo || conteudo.length) {
      secoes.push({ titulo, conteudo: conteudo.join("\n\n") });
    }
    titulo = "";
    conteudo = [];
  };

  const regex = /<(\/?)(h[1-6]|p|blockquote|li)\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(corpo))) {
    const fechando = m[1] === "/";
    const tag = m[2].toLowerCase();
    if (!fechando) {
      abertura = { tag, inicio: regex.lastIndex };
      continue;
    }
    if (!abertura || abertura.tag !== tag) continue;
    const texto = textoDeHtml(corpo.slice(abertura.inicio, m.index));
    abertura = null;
    if (!texto) continue;
    if (tag.startsWith("h")) {
      fechar();
      titulo = texto;
    } else {
      conteudo.push(texto);
    }
  }
  fechar();
  return secoes.filter((s) => s.titulo || s.conteudo);
}

const IGNORAR = /^(capa|folha de rosto|rosto|copyright|ficha|cr[eé]ditos|sum[aá]rio|título|titulo)$/i;

/** Lê um EPUB (bytes) e devolve metadados + seções importáveis. */
export function parseEpub(bytes: Uint8Array): ResultadoEpub {
  const arquivos = unzipSync(bytes);
  const containerBytes = arquivos["META-INF/container.xml"];
  if (!containerBytes) throw new Error("EPUB inválido: META-INF/container.xml ausente.");
  const container = strFromU8(containerBytes);
  const opfPath = primeiroGrupo(container, /full-path="([^"]+)"/);
  if (!opfPath) throw new Error("EPUB inválido: OPF não encontrado.");
  const opfBytes = arquivos[opfPath];
  if (!opfBytes) throw new Error("EPUB inválido: arquivo OPF ausente.");
  const opf = strFromU8(opfBytes);
  const base = opfPath.includes("/") ? opfPath.slice(0, opfPath.lastIndexOf("/")) : "";

  const meta: MetaEpub = {
    titulo: textoDeHtml(primeiroGrupo(opf, /<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i)),
    autor: textoDeHtml(primeiroGrupo(opf, /<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i)),
    ano: Number(primeiroGrupo(opf, /<dc:date[^>]*>(\d{4})/i)) || null,
  };

  const manifesto = new Map<string, string>();
  const itens = /<item\b[^>]*>/gi;
  let item: RegExpExecArray | null;
  while ((item = itens.exec(opf))) {
    const tag = item[0];
    const id = primeiroGrupo(tag, /\bid="([^"]+)"/);
    const href = primeiroGrupo(tag, /\bhref="([^"]+)"/);
    if (id && href) manifesto.set(id, href);
  }

  const spine: string[] = [];
  const refs = /<itemref\b[^>]*>/gi;
  let ref: RegExpExecArray | null;
  while ((ref = refs.exec(opf))) {
    const idref = primeiroGrupo(ref[0], /\bidref="([^"]+)"/);
    if (idref) spine.push(idref);
  }

  const secoes: SecaoImportada[] = [];
  for (const idref of spine) {
    const href = manifesto.get(idref);
    if (!href || !/\.x?html?$/i.test(href)) continue;
    const caminho = resolverCaminho(base, href);
    const conteudoBytes = arquivos[caminho];
    if (!conteudoBytes) continue;
    const xhtml = strFromU8(conteudoBytes);
    for (const secao of secoesDeXhtml(xhtml)) {
      if (secao.titulo && IGNORAR.test(secao.titulo)) continue;
      secoes.push(secao);
    }
  }

  const comConteudo = secoes.filter((s) => s.conteudo.trim());
  if (comConteudo.length === 0) throw new Error("EPUB sem texto legível.");
  return { meta, secoes: comConteudo };
}
