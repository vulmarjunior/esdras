import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { all } from "@/lib/db";
import { LibraryAdmin, type LivroAdmin } from "@/components/admin/library-admin";

export const dynamic = "force-dynamic";

export default async function AdminLiteraturaPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/");

  const livros = await all<LivroAdmin>(`
    SELECT b.id, b.titulo, b.autor, b.ano, b.fonte, b.resumo, b.ordem, b.created_at,
           COUNT(s.id)::int AS secoes_count
    FROM library_books b
    LEFT JOIN library_sections s ON s.book_id = b.id
    GROUP BY b.id
    ORDER BY b.ordem, b.id
  `);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin"
          className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Administração
        </Link>
        <h2 className="text-2xl font-semibold tracking-tight">Biblioteca de literatura</h2>
        <p className="text-sm text-muted-foreground">
          Livros doutrinários disponíveis para consulta e para a IA. Importe MD, TXT ou EPUB — a análise e a revisão
          das seções acontecem antes de salvar.
        </p>
      </div>

      <LibraryAdmin livros={livros} />
    </div>
  );
}
