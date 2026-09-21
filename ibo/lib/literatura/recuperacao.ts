/**
 * Recuperação de trechos da biblioteca de literatura para a consulta por IA.
 *
 * Diferente de `lib/confissoes/recuperacao.ts` (documentos estáticos), aqui os
 * livros vêm do Postgres. A pontuação é a mesma (`lib/busca.ts`).
 */
import { all, get } from "@/lib/db";
import { normalizarTexto, pontuarSecoes, tokenizar, truncar } from "@/lib/busca";
import { montarContextoConsulta } from "@/lib/confissoes/recuperacao";
import type { FonteConsulta, LivroBiblioteca, SecaoBiblioteca } from "./types";

export interface TrechoLivro {
  livro: LivroBiblioteca;
  item: SecaoBiblioteca;
  score: number;
}

export interface LivroComContagem extends LivroBiblioteca {
  secoes_count: number;
}

export async function listarLivros(): Promise<LivroBiblioteca[]> {
  return all<LivroBiblioteca>(
    "SELECT id, titulo, autor, ano, fonte, resumo, ordem, created_at FROM library_books ORDER BY ordem, id"
  );
}

export async function listarLivrosComContagem(): Promise<LivroComContagem[]> {
  return all<LivroComContagem>(
    `SELECT b.id, b.titulo, b.autor, b.ano, b.fonte, b.resumo, b.ordem, b.created_at,
            COUNT(s.id)::int AS secoes_count
     FROM library_books b
     LEFT JOIN library_sections s ON s.book_id = b.id
     GROUP BY b.id
     ORDER BY b.ordem, b.id`
  );
}

export async function getLivro(id: number): Promise<LivroBiblioteca | undefined> {
  return get<LivroBiblioteca>(
    "SELECT id, titulo, autor, ano, fonte, resumo, ordem, created_at FROM library_books WHERE id = ?",
    [id]
  );
}

/** Busca seções do livro pelo texto normalizado (coluna `busca`). */
export async function buscarSecoesNoLivro(bookId: number, termo: string, limite = 80): Promise<SecaoBiblioteca[]> {
  const alvo = normalizarTexto(termo);
  if (!alvo) return [];
  return all<SecaoBiblioteca>(
    `SELECT id, book_id, ordem_pai, titulo, conteudo FROM library_sections
     WHERE book_id = ? AND busca LIKE ?
     ORDER BY ordem_pai, id
     LIMIT ?`,
    [bookId, `%${alvo}%`, limite]
  );
}

export async function listarSecoes(bookId: number): Promise<SecaoBiblioteca[]> {
  return all<SecaoBiblioteca>(
    "SELECT id, book_id, ordem_pai, titulo, conteudo FROM library_sections WHERE book_id = ? ORDER BY ordem_pai, id",
    [bookId]
  );
}

export interface SecaoSumario {
  id: number;
  titulo: string;
  ordem_pai: number;
}

export async function listarSumario(bookId: number): Promise<SecaoSumario[]> {
  return all<SecaoSumario>(
    "SELECT id, titulo, ordem_pai FROM library_sections WHERE book_id = ? ORDER BY ordem_pai, id",
    [bookId]
  );
}

export async function getSecao(bookId: number, secaoId: number): Promise<SecaoBiblioteca | undefined> {
  return get<SecaoBiblioteca>(
    "SELECT id, book_id, ordem_pai, titulo, conteudo FROM library_sections WHERE id = ? AND book_id = ?",
    [secaoId, bookId]
  );
}

function resumosDeLivros(livros: LivroBiblioteca[]): string {
  return livros
    .map((l) => `- ${l.titulo}${l.autor ? ` — ${l.autor}` : ""}${l.ano ? ` (${l.ano})` : ""}: ${l.resumo}`)
    .join("\n");
}

/**
 * Retorna as top-N seções dos livros mais relevantes para a pergunta, com os
 * resumos dos livros cadastrados. O texto integral fica na página `/literatura`.
 */
export async function buscarTrechosLivros(
  pergunta: string,
  limite = 5,
  maxCharsPorTrecho = 2500
): Promise<{ trechos: TrechoLivro[]; resumos: string }> {
  const termos = tokenizar(pergunta);
  const livros = await listarLivros();
  const resumos = resumosDeLivros(livros);
  if (termos.length === 0 || livros.length === 0) return { trechos: [], resumos };

  const porId = new Map(livros.map((l) => [l.id, l]));
  const secoes = await all<SecaoBiblioteca>(
    "SELECT id, book_id, ordem_pai, titulo, conteudo FROM library_sections ORDER BY book_id, ordem_pai, id"
  );
  const trechos = pontuarSecoes(secoes, termos)
    .slice(0, limite)
    .map(({ item, score }) => ({
      livro: porId.get(item.book_id)!,
      item: { ...item, conteudo: truncar(item.conteudo, maxCharsPorTrecho) },
      score,
    }))
    .filter((t) => t.livro);
  return { trechos, resumos };
}

/**
 * Monta o bloco de contexto para injetar no prompt de IA conforme a fonte.
 * Orçamentos reduzidos no modo "tudo" para caber no TPM do plano gratuito.
 */
export async function montarContextoBiblioteca(
  pergunta: string,
  fonte: FonteConsulta
): Promise<string> {
  const blocos: string[] = [];
  const tudo = fonte === "tudo";

  if (fonte === "documentos" || tudo) {
    blocos.push(montarContextoConsulta(pergunta, tudo ? 3 : 5, tudo ? 2200 : 2500));
  }

  if (fonte === "livros" || tudo) {
    const { trechos, resumos } = await buscarTrechosLivros(pergunta, tudo ? 3 : 5, tudo ? 2200 : 2500);
    const selecao = trechos
      .map((t) => `[${t.livro.titulo} — ${t.item.titulo}]\n${t.item.conteudo}`)
      .join("\n\n---\n\n");
    const corpo =
      selecao || "(nenhum trecho correspondeu à pergunta nos livros disponíveis)";
    blocos.push(
      `Livros de literatura disponíveis (resumos):\n${resumos || "(nenhum livro cadastrado)"}\n\nTextos selecionados como base para responder:\n\n${corpo}`
    );
  }

  return blocos.join("\n\n==========\n\n");
}
