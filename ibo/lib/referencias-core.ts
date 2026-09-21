/**
 * Detecção e substituição de referências "Art. N" nos textos (módulo puro).
 *
 * A reescrita nunca é automática (PRD §17): as funções aqui apenas identificam
 * as menções e produzem o texto com o número trocado, para confirmação humana.
 */

export type CampoReferencia =
  | "texto_vigente"
  | "proposta_inicial"
  | "redacao_trabalho"
  | "redacao_consolidada"
  | "justificativa";

export const CAMPO_LABELS: Record<CampoReferencia, string> = {
  texto_vigente: "Texto vigente",
  proposta_inicial: "Proposta inicial",
  redacao_trabalho: "Redação de trabalho",
  redacao_consolidada: "Redação consolidada",
  justificativa: "Justificativa",
};

const REF_RE = /\b(arts?\.?|artigos?)(\s+)(\d+)(\s*[º°]?)/gi;

export interface Mencao {
  numero: number;
  trecho: string;
  indice: number;
}

/** Lista as menções a números de artigo em um texto (HTML ou texto puro). */
export function detectarMencoes(texto: string): Mencao[] {
  const out: Mencao[] = [];
  REF_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = REF_RE.exec(texto))) {
    const numero = parseInt(m[3], 10);
    const inicio = Math.max(0, m.index - 40);
    const fim = Math.min(texto.length, m.index + m[0].length + 40);
    out.push({
      numero,
      trecho: texto.slice(inicio, fim).replace(/\s+/g, " ").trim(),
      indice: m.index,
    });
  }
  return out;
}

/**
 * Substitui as menções a um número específico ("Art. 5º" → "Art. 26º"),
 * preservando o prefixo ("art.", "artigo") e o restante do texto.
 */
export function substituirMencoes(texto: string, de: number, para: string): { texto: string; trocas: number } {
  let trocas = 0;
  const novo = texto.replace(REF_RE, (todo, prefixo: string, espaco: string, digitos: string) => {
    if (parseInt(digitos, 10) !== de) return todo;
    trocas++;
    return `${prefixo}${espaco}${para}`;
  });
  return { texto: novo, trocas };
}

/** Remove o sufixo ordinal ("26º" → 26) para comparações. */
export function numeroDoRotulo(rotulo: string | null | undefined): number | null {
  if (!rotulo) return null;
  const m = /^(\d+)/.exec(rotulo.trim());
  return m ? parseInt(m[1], 10) : null;
}
