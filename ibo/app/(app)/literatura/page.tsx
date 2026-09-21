import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, ChevronRight, Library } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { listarLivrosComContagem } from "@/lib/literatura/recuperacao";
import { ConsultaForm } from "@/components/documentos/consulta-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FieldHelper } from "@/components/field-helper";

export const dynamic = "force-dynamic";

export default async function LiteraturaPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const livros = await listarLivrosComContagem();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Literatura de consulta</h2>
        <p className="text-sm text-muted-foreground">
          Livros doutrinários usados como orientação nas decisões da reforma estatutária. Consulte por leitura direta ou
          pergunte à IA.
        </p>
      </div>

      <FieldHelper>
        A IA responde apenas com base nas fontes escolhidas e cita obra e seção. As respostas são assistivas e devem ser
        revisadas antes de usar.
      </FieldHelper>

      <ConsultaForm
        titulo="Consultar a biblioteca"
        fontePadrao="livros"
        comFonte
        placeholder="Ex.: o que a literatura diz sobre disciplina na igreja? Como fundamentar a membresia? O que é uma igreja saudável?"
      />

      {livros.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <Library className="h-8 w-8 text-muted-foreground/60" />
            Nenhum livro na biblioteca ainda. Um administrador pode importar em Administração → Biblioteca de literatura.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {livros.map((livro) => (
            <Link key={livro.id} href={`/literatura/${livro.id}`} className="block">
              <Card className="transition-colors hover:bg-muted/50">
                <CardHeader className="gap-1 pb-3">
                  <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                    <BookOpen className="h-4 w-4 shrink-0 text-primary" />
                    {livro.titulo}
                    {livro.ano && <span className="font-normal text-muted-foreground">({livro.ano})</span>}
                    <Badge variant="outline">{livro.secoes_count} seções</Badge>
                    <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{livro.autor || "Autor não informado"}</p>
                  {livro.resumo && <p className="text-sm leading-relaxed text-muted-foreground">{livro.resumo}</p>}
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
