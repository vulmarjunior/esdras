import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { GUIA, FONTE_LABELS } from "@/lib/legal-refs";
import { DuvidaForm } from "@/components/guia/duvida-form";
import { RegrasList } from "@/components/guia/regras-list";
import { FieldHelper } from "@/components/field-helper";

export const dynamic = "force-dynamic";

export default async function GuiaRedacaoPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Guia de redação</h2>
        <p className="text-sm text-muted-foreground">
          Referências de técnica legislativa (Lei Complementar nº 95/1998) e de redação oficial
          (Manual de Redação da Presidência da República) para apoiar a redação do Estatuto e tirar dúvidas.
        </p>
      </div>

      <FieldHelper>
        Resumo curado para consulta rápida — para uso formal, consulte sempre o texto oficial das fontes.
        As respostas da IA são assistivas: revisar antes de usar.
      </FieldHelper>

      <DuvidaForm />

      <RegrasList regras={GUIA} fontes={FONTE_LABELS} />
    </div>
  );
}