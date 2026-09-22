import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { all } from "@/lib/db";
import { provisionLabel } from "@/lib/data";
import { CoherenceAnalyzer } from "@/components/coerencia/analyzer";
import { FieldHelper } from "@/components/field-helper";

export const dynamic = "force-dynamic";

export default async function CoerenciaPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "coordenador" && user.role !== "admin") redirect("/");

  const rows = await all<{ id: string; type: string; numero: string | null; redacao_consolidada: string; redacao_trabalho: string; texto_vigente: string }>(`
    SELECT id, type, numero, redacao_consolidada, redacao_trabalho, texto_vigente
    FROM provisions WHERE type = 'artigo' AND status = 'aprovado' ORDER BY ordem_pai`);

  const textos = rows.map((r) => ({
    id: r.id,
    label: provisionLabel(r as never),
    texto: (r.redacao_consolidada || r.redacao_trabalho || r.texto_vigente || "").trim(),
  })).filter((t) => t.texto);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Análise de coerência</h2>
        <p className="text-sm text-muted-foreground">
          A IA analisa as redações concluídas procurando duplicidades, contradições, nomenclaturas e lacunas — sempre como alerta.
        </p>
      </div>

      <FieldHelper>
        O relatório é gerado pela Groq a partir do texto concluído para a proposta. Nenhuma alteração é aplicada automaticamente.
      </FieldHelper>

      {textos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma redação foi concluída ainda. Conclua redações na Mesa de Trabalho para habilitar a análise.
        </p>
      ) : (
        <CoherenceAnalyzer textos={textos} />
      )}
    </div>
  );
}
