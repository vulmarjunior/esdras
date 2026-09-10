/** Normalização de marcadores de dispositivos na redação proposta. */

const ORDINAL_WORDS: Record<string, string> = {
  primeiro: "1º",
  segundo: "2º",
  terceiro: "3º",
  quarto: "4º",
  quinto: "5º",
  sexto: "6º",
  sétimo: "7º",
  oitavo: "8º",
  nono: "9º",
  décimo: "10",
};

function numeroLegal(numero: string): string {
  const n = numero.trim().replace(/[º°.]$/, "");
  if (!/^\d+$/.test(n)) return numero.trim();
  const valor = Number(n);
  return valor > 0 && valor < 10 ? `${valor}º` : String(valor);
}

/**
 * Converte apenas marcadores explícitos, preservando o conteúdo substantivo.
 * Referências inline permanecem em minúsculas; marcadores no início mantêm
 * a capitalização normativa.
 */
export function normalizeProposalNomenclature(text: string): string {
  let out = text;
  out = out.replace(/\bParágrafo\s+(primeiro|segundo|terceiro|quarto|quinto|sexto|sétimo|oitavo|nono|décimo)\b/gi, (_, word: string) => {
    const numero = ORDINAL_WORDS[word.toLowerCase()];
    return numero ? `§ ${numero}` : _;
  });
  out = out.replace(/\b(parágrafo|Parágrafo)\s+(único)\b/gi, (match: string, label: string) =>
    label === "Parágrafo" ? "Parágrafo único" : "parágrafo único"
  );
  out = out.replace(/(parágrafo|Parágrafo)\s+(\d+)\s*(?:º|°)?(?=\s|[.,;:)\-—]|$)/g, (match: string, label: string, numero: string) =>
    `§ ${numeroLegal(numero)}`
  );
  out = out.replace(/\b(artigo|Artigo)\s+(\d+)\s*(?:º|°)?(?=\s|[.,;:)\-—]|$)/g, (match: string, label: string, numero: string) =>
    `${label === "Artigo" ? "Art." : "art."} ${numeroLegal(numero)}`
  );
  out = out.replace(/\b(deste|neste|do|no|ao|o)\s+Artigo\b/g, "$1 artigo");
  out = out.replace(/\bArt\.\s*(\d+)(\s*(?:<[^>]*>\s*)?)(?:º|°)?/g, (match: string, numero: string, tags: string) => `Art. ${numeroLegal(numero)}${tags}`);
  out = out.replace(/Art\.\s*(\d+[º]?)((?:<[^>]*>)?)[ \t]*[-—][ \t]*/g, (match: string, numero: string, tags: string) => `Art. ${numero}${tags} `);
  out = out.replace(/§\s*(\d+\s*(?:º|°)?)/g, (match: string, numero: string) => `§ ${numeroLegal(numero)}`);
  out = out.replace(/§\s*(\d+[º]?)\s*[-—]\s*/g, (match: string, numero: string) => `§ ${numero} `);
  return out;
}
