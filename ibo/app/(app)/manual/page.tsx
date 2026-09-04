import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { MANUAL } from "@/lib/manual";
import { ManualView } from "@/components/manual/manual-view";
import { FieldHelper } from "@/components/field-helper";

export const dynamic = "force-dynamic";

export default async function ManualPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Manual de utilização</h2>
        <p className="text-sm text-muted-foreground">
          Como usar o ESDRAS: fluxo de trabalho, telas, perfis, termos e perguntas frequentes.
        </p>
      </div>

      <FieldHelper>
        O assistente de ajuda (botão &quot;Ajuda&quot;, canto inferior direito) responde dúvidas com base neste manual — revisar
        antes de usar.
      </FieldHelper>

      <ManualView secoes={MANUAL} />
    </div>
  );
}