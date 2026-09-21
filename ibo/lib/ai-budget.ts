/**
 * Orçamento de tokens para as chamadas à Groq (módulo puro).
 *
 * O plano gratuito da Groq limita tokens por minuto (TPM) — ex.: 8000 para o
 * `openai/gpt-oss-120b`. Aqui estimamos e limitamos o tamanho do contexto para
 * caber no orçamento, preservando o início e o fim do texto (a pergunta do
 * usuário costuma estar no fim).
 */

/** Estimativa conservadora para português (1 token ≈ 3,5 caracteres). */
export const CHARS_POR_TOKEN = 3.5;

export function estimarTokens(texto: string): number {
  return Math.ceil(texto.length / CHARS_POR_TOKEN);
}

export function orcamentoChars(maxTokens: number): number {
  return Math.floor(maxTokens * CHARS_POR_TOKEN);
}

const MARCADOR = "\n\n[…conteúdo reduzido para caber no limite da IA…]\n\n";

/**
 * Limita o texto ao orçamento de caracteres, preservando o começo (contexto) e
 * o fim (pergunta/comando). Devolve o texto original quando já cabe.
 */
export function limitarTexto(texto: string, maxChars: number, marcador = MARCADOR): string {
  if (maxChars <= 0) return "";
  if (texto.length <= maxChars) return texto;
  const disponivel = Math.max(0, maxChars - marcador.length);
  const inicio = Math.ceil(disponivel * 0.6);
  const fim = disponivel - inicio;
  return texto.slice(0, inicio) + marcador + (fim > 0 ? texto.slice(texto.length - fim) : "");
}
