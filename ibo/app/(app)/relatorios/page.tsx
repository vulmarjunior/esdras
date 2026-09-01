import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDown } from "lucide-react";

export const dynamic = "force-dynamic";

const EXPORTS = [
  { type: "consolidado", title: "Estatuto consolidado", desc: "Somente o texto final aprovado, na ordem do documento." },
  { type: "comparativo", title: "Quadro comparativo", desc: "Redação vigente × redação proposta/aprovada, artigo por artigo." },
  { type: "reforma", title: "Relatório da reforma", desc: "Dispositivo, tipo de alteração e justificativa." },
  { type: "fundamentacao", title: "Relatório de fundamentação", desc: "Referências bíblicas, doutrinárias e jurídicas por dispositivo." },
  { type: "historico", title: "Histórico da comissão", desc: "Reuniões, deliberações, artigos aprovados e pendências." },
  { type: "atas", title: "Atas aprovadas", desc: "Exportação individual das atas aprovadas." },
];

export default async function ReportsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Relatórios e exportações</h2>
        <p className="text-sm text-muted-foreground">Documentos gerados a partir dos dados registrados no sistema.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {EXPORTS.map((e) => (
          <Card key={e.type}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{e.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{e.desc}</p>
              <a
                href={`/api/export?type=${e.type}`}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                <FileDown className="h-4 w-4" /> Baixar .txt
              </a>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
