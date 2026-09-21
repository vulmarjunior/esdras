"use server";

import { revalidatePath } from "next/cache";
import { get, run, transaction } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { rolesCom } from "@/lib/permissions";
import { publishRealtime } from "@/lib/realtime";
import { normalizarTexto } from "@/lib/busca";
import type { SecaoImportada } from "@/lib/literatura/types";
import type { ActionState } from "./state";

const MAX_SECOES = 2000;
const MAX_CARACTERES = 5_000_000;

async function audit(userId: number, userName: string, action: string, entityId: string, detail?: string) {
  await run(
    "INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, detail) VALUES (?, ?, ?, ?, ?, ?)",
    [userId, userName, action, "library", entityId, detail || ""]
  );
}

export interface DadosLivro {
  titulo: string;
  autor?: string;
  ano?: number | null;
  fonte?: string;
  resumo?: string;
  secoes: SecaoImportada[];
}

function validar(dados: DadosLivro): string | null {
  if (!dados.titulo?.trim()) return "Informe o título do livro.";
  if (!Array.isArray(dados.secoes) || dados.secoes.length === 0) return "Nenhuma seção para importar.";
  if (dados.secoes.length > MAX_SECOES) return `Limite de ${MAX_SECOES} seções por livro.`;
  const secoes = dados.secoes.filter((s) => s.conteudo?.trim());
  if (secoes.length === 0) return "Nenhuma seção com conteúdo.";
  const total = secoes.reduce((acc, s) => acc + s.titulo.length + s.conteudo.length, 0);
  if (total > MAX_CARACTERES) return "Livro muito grande para importar (limite de 5 milhões de caracteres).";
  if (dados.ano != null && (!Number.isInteger(dados.ano) || dados.ano < 1000 || dados.ano > 2200)) {
    return "Ano inválido.";
  }
  return null;
}

function limparSecoes(secoes: SecaoImportada[]): SecaoImportada[] {
  return secoes
    .map((s) => ({
      titulo: (s.titulo || "").trim().slice(0, 300) || "Seção",
      conteudo: s.conteudo.trim(),
    }))
    .filter((s) => s.conteudo);
}

async function inserirSecoes(bookId: number, secoes: SecaoImportada[]) {
  for (let i = 0; i < secoes.length; i++) {
    const secao = secoes[i];
    await run(
      "INSERT INTO library_sections (book_id, ordem_pai, titulo, conteudo, busca) VALUES (?, ?, ?, ?, ?)",
      [bookId, i, secao.titulo, secao.conteudo, normalizarTexto(`${secao.titulo} ${secao.conteudo}`)]
    );
  }
}

export async function createBook(dados: DadosLivro): Promise<ActionState & { id?: number }> {
  const user = await requireRole(...rolesCom("gerenciar_biblioteca"));
  const erro = validar(dados);
  if (erro) return { error: erro };
  const secoes = limparSecoes(dados.secoes);

  const id = await transaction(async () => {
    const res = await run(
      "INSERT INTO library_books (titulo, autor, ano, fonte, resumo, created_by) VALUES (?, ?, ?, ?, ?, ?)",
      [
        dados.titulo.trim(),
        dados.autor?.trim() || null,
        dados.ano ?? null,
        dados.fonte?.trim() || null,
        dados.resumo?.trim() || "",
        user.id,
      ]
    );
    const bookId = res.lastInsertRowid;
    await inserirSecoes(bookId, secoes);
    return bookId;
  });

  await audit(user.id, user.name, "Importou livro da biblioteca", String(id), `${dados.titulo.trim()} (${secoes.length} seções)`);
  revalidatePath("/literatura");
  revalidatePath("/admin/literatura");
  await publishRealtime({ entity: "library", id: String(id), action: "importar" });
  return { ok: true, message: `Livro importado com ${secoes.length} seções.`, id };
}

export async function updateBook(
  id: number,
  dados: Omit<DadosLivro, "secoes">
): Promise<ActionState> {
  const user = await requireRole(...rolesCom("gerenciar_biblioteca"));
  if (!dados.titulo?.trim()) return { error: "Informe o título do livro." };
  const livro = await get<{ id: number }>("SELECT id FROM library_books WHERE id = ?", [id]);
  if (!livro) return { error: "Livro não encontrado." };
  await run("UPDATE library_books SET titulo = ?, autor = ?, ano = ?, fonte = ?, resumo = ?, updated_at = datetime('now') WHERE id = ?", [
    dados.titulo.trim(),
    dados.autor?.trim() || null,
    dados.ano ?? null,
    dados.fonte?.trim() || null,
    dados.resumo?.trim() || "",
    id,
  ]);
  await audit(user.id, user.name, "Atualizou livro da biblioteca", String(id), dados.titulo.trim());
  revalidatePath("/literatura");
  revalidatePath(`/literatura/${id}`);
  revalidatePath("/admin/literatura");
  await publishRealtime({ entity: "library", id: String(id), action: "atualizar" });
  return { ok: true, message: "Livro atualizado." };
}

export async function replaceSections(id: number, secoes: SecaoImportada[]): Promise<ActionState> {
  const user = await requireRole(...rolesCom("gerenciar_biblioteca"));
  const erro = validar({ titulo: "x", secoes });
  if (erro) return { error: erro };
  const livro = await get<{ titulo: string }>("SELECT titulo FROM library_books WHERE id = ?", [id]);
  if (!livro) return { error: "Livro não encontrado." };
  const limpas = limparSecoes(secoes);

  await transaction(async () => {
    await run("DELETE FROM library_sections WHERE book_id = ?", [id]);
    await inserirSecoes(id, limpas);
    await run("UPDATE library_books SET updated_at = datetime('now') WHERE id = ?", [id]);
  });

  await audit(user.id, user.name, "Reimportou seções da biblioteca", String(id), `${livro.titulo} (${limpas.length} seções)`);
  revalidatePath("/literatura");
  revalidatePath(`/literatura/${id}`);
  revalidatePath("/admin/literatura");
  await publishRealtime({ entity: "library", id: String(id), action: "reimportar" });
  return { ok: true, message: `Seções substituídas (${limpas.length}).` };
}

export async function deleteBook(id: number): Promise<ActionState> {
  const user = await requireRole(...rolesCom("gerenciar_biblioteca"));
  const livro = await get<{ titulo: string }>("SELECT titulo FROM library_books WHERE id = ?", [id]);
  if (!livro) return { error: "Livro não encontrado." };
  await run("DELETE FROM library_books WHERE id = ?", [id]);
  await audit(user.id, user.name, "Excluiu livro da biblioteca", String(id), livro.titulo);
  revalidatePath("/literatura");
  revalidatePath("/admin/literatura");
  await publishRealtime({ entity: "library", id: String(id), action: "excluir" });
  return { ok: true, message: "Livro removido." };
}
