const ALLOWED_TAGS = new Set([
  "b",
  "strong",
  "i",
  "em",
  "u",
  "s",
  "mark",
  "font",
  "span",
  "p",
  "div",
  "br",
]);

function sanitizeStyleAttr(raw: string): string {
  const m = /background-color\s*:\s*([^;"']+)/i.exec(raw);
  if (!m) return "";
  const color = m[1].trim();
  if (!/^[a-zA-Z0-9#(),.\s%-]+$/.test(color)) return "";
  return `background-color:${color}`;
}

/**
 * Sanitização conservadora de HTML (server-safe, sem DOM).
 * Mantém apenas tags textuais e o atributo style restrito a background-color.
 */
export function sanitizeHtml(raw: string): string {
  if (!raw) return "";
  const s = raw
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\s*script[\s\S]*?<\s*\/\s*script\s*>/gi, "")
    .replace(/<\s*style[\s\S]*?<\s*\/\s*style\s*>/gi, "")
    .replace(/<\s*iframe[\s\S]*?<\s*\/\s*iframe\s*>/gi, "");
  return s
    .replace(/<(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^<>]*?)?)(\/?)>/g, (_m, close, tag, attrs, self) => {
      const t = tag.toLowerCase();
      if (!ALLOWED_TAGS.has(t)) return "";
      if (close || self) return `<${close}${t}${self}>`;
      let extra = "";
      const sm = /style\s*=\s*(["'])([\s\S]*?)\1/i.exec(attrs);
      if (sm) {
        const sc = sanitizeStyleAttr(sm[2]);
        if (sc) extra = ` style="${sc}"`;
      }
      return `<${t}${extra}>`;
    })
    .replace(/^(<br\s*\/?>\s*)+/, "")
    .replace(/(<br\s*\/?>\s*)+$/, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

const RICH_TAG_RE = /<(?:b|strong|i|em|u|s|mark|font|span|p|div|br)\b[\s>/]/i;

export function isHtml(text: string): boolean {
  return RICH_TAG_RE.test(text);
}

/** Converte texto puro (com quebras de linha) em HTML escapado. */
export function plainToHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "<br>");
}

/** Converte HTML em texto puro (para IA, exportações e buscas). */
export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/** Normaliza um valor (texto puro ou HTML) em HTML seguro para exibição. */
export function renderRichText(text: string): string {
  if (!text) return "";
  return isHtml(text) ? sanitizeHtml(text) : plainToHtml(text);
}