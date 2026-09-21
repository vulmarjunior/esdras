/**
 * Busca textual compartilhada (módulo puro, sem banco).
 *
 * Normalização, tokenização e pontuação de seções por correspondência de
 * termos — usada tanto pela biblioteca doutrinária estática (`lib/confissoes`)
 * quanto pela biblioteca de literatura (`lib/literatura`).
 */

const STOPWORDS = new Set([
  "a", "ao", "aos", "as", "com", "como", "da", "das", "de", "do", "dos", "e",
  "em", "entre", "era", "esse", "esta", "este", "isto", "mais", "mas", "na",
  "nas", "nao", "nem", "no", "nos", "num", "numa", "o", "os", "ou", "para",
  "pela", "pelas", "pelo", "pelos", "por", "que", "qual", "quais", "quando",
  "quanto", "se", "sem", "ser", "sua", "suas", "sobre", "um", "uma", "uns",
  "umas", "voce", "voces",
]);

/** Normaliza o texto: minúsculas, sem acentos, apenas letras/números/espaços. */
export function normalizarTexto(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Tokeniza a pergunta removendo stopwords e termos muito curtos (sem repetidos). */
export function tokenizar(pergunta: string): string[] {
  const vistos = new Set<string>();
  const termos: string[] = [];
  for (const w of normalizarTexto(pergunta).split(" ")) {
    if (w.length < 3 || STOPWORDS.has(w)) continue;
    if (!vistos.has(w)) {
      vistos.add(w);
      termos.push(w);
    }
  }
  return termos;
}

export function contarOcorrencias(bloco: string, termo: string): number {
  const partes = bloco.split(termo);
  return partes.length - 1;
}

export interface SecaoPontuavel {
  titulo: string;
  conteudo: string;
}

export interface SecaoPontuada<T extends SecaoPontuavel> {
  item: T;
  score: number;
}

/**
 * Pontua itens por correspondência de termos (título vale peso maior) e
 * devolve em ordem decrescente de score. Itens com score zero são omitidos.
 */
export function pontuarSecoes<T extends SecaoPontuavel>(
  itens: T[],
  termos: string[]
): SecaoPontuada<T>[] {
  if (termos.length === 0) return [];
  const pontuados: SecaoPontuada<T>[] = [];
  for (const item of itens) {
    const titulo = normalizarTexto(item.titulo);
    const conteudo = normalizarTexto(item.conteudo);
    let score = 0;
    for (const termo of termos) {
      if (titulo.includes(termo)) score += 6;
      score += contarOcorrencias(conteudo, termo);
    }
    if (score > 0) pontuados.push({ item, score });
  }
  pontuados.sort((a, b) => b.score - a.score);
  return pontuados;
}

export function truncar(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max).trimEnd() + "…";
}
