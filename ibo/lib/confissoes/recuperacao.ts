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
import { pontuarSecoes, tokenizar, truncar } from "../busca";

export { normalizarTexto, tokenizar } from "../busca";

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

/**
 * Retorna as top-N seções mais relevantes para a pergunta, com os resumos
 * de todos os documentos. Seções fora do topo não são retornadas — o texto
 * integral fica disponível para leitura na página `/documentos`.
 */
export function buscarTrechos(
  pergunta: string,
  limite = 5,
  maxCharsPorTrecho = 2500
): ResultadoBusca {
  const termos = tokenizar(pergunta);
  const resumos = montarResumos();
  if (termos.length === 0) return { trechos: [], resumos };

  const itens = CONFISSOES.flatMap((confissao) =>
    confissao.itens.map((item) => ({ confissao, item, titulo: item.titulo, conteudo: item.conteudo }))
  );
  const trechos = pontuarSecoes(itens, termos)
    .slice(0, limite)
    .map(({ item, score }) => ({
      confissao: item.confissao,
      item: { ...item.item, conteudo: truncar(item.item.conteudo, maxCharsPorTrecho) },
      score,
    }));
  return { trechos, resumos };
}

/** Monta o bloco de contexto para injetar no prompt de IA (consulta doutrinária). */
export function montarContextoConsulta(pergunta: string, limite = 5, maxCharsPorTrecho = 2500): string {
  const { trechos, resumos } = buscarTrechos(pergunta, limite, maxCharsPorTrecho);
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
