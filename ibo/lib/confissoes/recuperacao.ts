/**
 * Recuperação de trechos doutrinários para a consulta por IA.
 *
 * Módulo puro (sem banco): tokeniza a pergunta, pontua as seções por
 * correspondência de termos no título e no conteúdo e retorna as top-N
 * seções + os resumos dos documentos (Londres 1689 é grande demais para
 * ser injetada inteira no prompt).
 */
import { CONFISSOES } from "./index";
import type { Confissao, ItemConfissao } from "./types";

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

function contar(bloco: string, termo: string): number {
  const partes = bloco.split(termo);
  return partes.length - 1;
}

export interface TrechoDoutrinario {
  confissao: Confissao;
  item: ItemConfissao;
  score: number;
}

export interface ResultadoBusca {
  trechos: TrechoDoutrinario[];
  resumos: string;
}

function montarResumos(): string {
  return CONFISSOES.map(
    (c) => `- ${c.nome}${c.ano ? ` (${c.ano})` : ""}: ${c.resumo}`
  ).join("\n");
}

function truncar(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max).trimEnd() + "…";
}

/**
 * Retorna as top-N seções mais relevantes para a pergunta, com os resumos
 * de todos os documentos. Seções fora do topo não são retornadas — o texto
 * integral fica disponível para leitura na página `/documentos`.
 */
export function buscarTrechos(
  pergunta: string,
  limite = 6,
  maxCharsPorTrecho = 4000
): ResultadoBusca {
  const termos = tokenizar(pergunta);
  const resumos = montarResumos();
  if (termos.length === 0) return { trechos: [], resumos };

  const pontuados: TrechoDoutrinario[] = [];
  for (const confissao of CONFISSOES) {
    for (const item of confissao.itens) {
      const titulo = normalizarTexto(item.titulo);
      const conteudo = normalizarTexto(item.conteudo);
      let score = 0;
      for (const termo of termos) {
        if (titulo.includes(termo)) score += 6;
        score += contar(conteudo, termo);
      }
      if (score > 0) pontuados.push({ confissao, item, score });
    }
  }
  pontuados.sort((a, b) => b.score - a.score);

  const trechos = pontuados.slice(0, limite).map((t) => ({
    confissao: t.confissao,
    item: { ...t.item, conteudo: truncar(t.item.conteudo, maxCharsPorTrecho) },
    score: t.score,
  }));
  return { trechos, resumos };
}

/** Monta o bloco de contexto para injetar no prompt de IA (consulta doutrinária). */
export function montarContextoConsulta(pergunta: string): string {
  const { trechos, resumos } = buscarTrechos(pergunta);
  const selecao = trechos
    .map(
      (t) =>
        `[${t.confissao.nome} — ${t.item.titulo}]\n${t.item.conteudo}`
    )
    .join("\n\n---\n\n");
  const corpo =
    selecao ||
    "(nenhum trecho correspondeu à pergunta nos documentos disponíveis)";
  return `Documentos doutrinários disponíveis (resumos):\n${resumos}\n\nTextos selecionados como base para responder:\n\n${corpo}`;
}