import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, Search } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { buscarSecoesNoLivro, getLivro, getSecao, listarSumario } from "@/lib/literatura/recuperacao";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

function trechoDeBusca(conteudo: string, termo: string): string {
  const baixo = conteudo.toLowerCase();
  const i = baixo.indexOf(termo.toLowerCase());
  if (i < 0) return conteudo.slice(0, 240).trim() + (conteudo.length > 240 ? "…" : "");
  const inicio = Math.max(0, i - 140);
  const fim = Math.min(conteudo.length, i + 280);
  return `${inicio > 0 ? "…" : ""}${conteudo.slice(inicio, fim).trim()}${fim < conteudo.length ? "…" : ""}`;
}

export default async function LivroPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookId: string }>;
  searchParams: Promise<{ q?: string; secao?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { bookId } = await params;
  const { q = "", secao = "" } = await searchParams;
  const id = Number(bookId);
  if (!Number.isFinite(id)) notFound();

  const livro = await getLivro(id);
  if (!livro) notFound();

  const termo = q.trim();
  const secaoId = Number(secao);
  const secaoAberta = Number.isFinite(secaoId) && secaoId > 0 ? await getSecao(id, secaoId) : undefined;
  const resultados = termo ? await buscarSecoesNoLivro(id, termo) : null;
  const sumario = resultados ? [] : await listarSumario(id);

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/literatura"
          className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Literatura de consulta
        </Link>
        <h2 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight">
          <BookOpen className="h-5 w-5 text-primary" />
          {livro.titulo}
          {livro.ano && <span className="text-base font-normal text-muted-foreground">({livro.ano})</span>}
        </h2>
        <p className="text-sm text-muted-foreground">
          {livro.autor || "Autor não informado"}
          {livro.fonte ? ` · ${livro.fonte}` : ""}
        </p>
        {livro.resumo && <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">{livro.resumo}</p>}
      </div>

      <form action={`/literatura/${id}`} method="get" className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            defaultValue={termo}
            placeholder="Buscar no texto deste livro..."
            className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none ring-ring transition-shadow focus:ring-2"
          />
        </div>
        <button type="submit" className="h-9 shrink-0 rounded-lg border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted">
          Buscar
        </button>
      </form>

      {termo && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {resultados && resultados.length > 0
              ? `${resultados.length} seção(ões) encontradas para “${termo}”.`
              : `Nenhuma seção encontrada para “${termo}”.`}
          </p>
          {resultados?.map((s) => (
            <Card key={s.id}>
              <CardContent className="space-y-1 py-4">
                <Link
                  href={`/literatura/${id}?secao=${s.id}&q=${encodeURIComponent(termo)}`}
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  {s.titulo}
                </Link>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {trechoDeBusca(s.conteudo, termo)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {secaoAberta && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{secaoAberta.titulo}</CardTitle>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">Seção {secaoAberta.ordem_pai + 1}</Badge>
              <Link href={`/literatura/${id}${termo ? `?q=${encodeURIComponent(termo)}` : ""}`} className="text-primary hover:underline">
                Voltar ao sumário
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-w-3xl whitespace-pre-wrap text-sm leading-relaxed">{secaoAberta.conteudo}</div>
          </CardContent>
        </Card>
      )}

      {!termo && !secaoAberta && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sumário ({sumario.length} seções)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {sumario.map((s, i) => (
                <li key={s.id}>
                  <Link
                    href={`/literatura/${id}?secao=${s.id}`}
                    className="flex items-baseline gap-3 py-2 text-sm transition-colors hover:text-primary"
                  >
                    <span className="w-8 shrink-0 text-right text-xs text-muted-foreground">{i + 1}.</span>
                    <span>{s.titulo}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
