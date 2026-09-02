export function toRoman(n: number): string {
  const map: [number, string][] = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let out = "";
  for (const [v, s] of map) {
    while (n >= v) {
      out += s;
      n -= v;
    }
  }
  return out;
}

/** Número ordinal de artigo em português: 1 -> "1º", 2 -> "2º"... */
export function ordinalArtigo(n: number): string {
  return `${n}º`;
}

/** Extrai o inteiro de um número de artigo ("5º" -> 5, "1º" -> 1). */
export function parseNumeroArtigo(numero: string | null): number | null {
  if (!numero) return null;
  const m = /^(\d+)/.exec(numero.trim());
  return m ? parseInt(m[1], 10) : null;
}

/** Atribui numeração final aos artigos na ordem dada. Retorna id -> número. */
export function renumerar(ids: string[]): Map<string, string> {
  const out = new Map<string, string>();
  ids.forEach((id, i) => out.set(id, ordinalArtigo(i + 1)));
  return out;
}

export interface ArtigoRenumeravel {
  id: string;
  numeroAtual: string | null;
  label: string;
  chapter: string;
}

export interface ReferenciaDetectada {
  provisionId: string;
  provisionLabel: string;
  campo: string;
  excerpt: string;
  numero: number;
}