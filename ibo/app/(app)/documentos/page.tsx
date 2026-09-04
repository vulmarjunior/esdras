import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { CONFISSOES } from "@/lib/confissoes";
import { Biblioteca } from "@/components/documentos/biblioteca";
import { ConsultaForm } from "@/components/documentos/consulta-form";
import { FieldHelper } from "@/components/field-helper";

export const dynamic = "force-dynamic";

export default async function DocumentosPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Documentos doutrinários</h2>
        <p className="text-sm text-muted-foreground">
          Textos integrais dos documentos confessionais e de princípios utilizados como fundamento doutrinário da
          reforma estatutária.
        </p>
      </div>

      <FieldHelper>
        Textos para consulta e fundamentação. As respostas da IA são assistivas: respondem apenas com base nos
        documentos abaixo e devem ser revisadas antes de usar.
      </FieldHelper>

      <ConsultaForm />

      <Biblioteca docs={CONFISSOES} />
    </div>
  );
}