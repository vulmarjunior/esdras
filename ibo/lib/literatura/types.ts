/** Tipos da biblioteca de literatura de consulta. Módulo puro. */

export interface SecaoImportada {
  titulo: string;
  conteudo: string;
}

export interface LivroBiblioteca {
  id: number;
  titulo: string;
  autor: string | null;
  ano: number | null;
  fonte: string | null;
  resumo: string;
  ordem: number;
  created_at: string;
}

export interface SecaoBiblioteca {
  id: number;
  book_id: number;
  ordem_pai: number;
  titulo: string;
  conteudo: string;
}

export type FonteConsulta = "livros" | "documentos" | "tudo";

export const FONTE_LABELS: Record<FonteConsulta, string> = {
  livros: "Livros de literatura",
  documentos: "Documentos de fé",
  tudo: "Tudo (livros + documentos)",
};
