"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateHistoricalText } from "@/app/actions/provision";
import { RichTextEditor } from "@/components/rich-text-editor";
import { RichTextContent } from "@/components/rich-text-content";
import { SubmitBtn } from "@/components/provision/submit-btn";

export function HistoricalTextEditor({
  provisionId,
  campo,
  texto,
  canEdit,
  emptyLabel,
}: {
  provisionId: string;
  campo: "texto_vigente" | "proposta_inicial";
  texto: string;
  canEdit: boolean;
  emptyLabel: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(texto);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  const isProposta = campo === "proposta_inicial";
  const editLabel = isProposta ? "Editar proposta" : "Corrigir extração";
  const editTitle = isProposta
    ? "Editar o texto da proposta da comissão. A alteração fica registrada na auditoria."
    : "Corrigir erro de extração do documento original. A correção fica registrada na auditoria.";
  const saveLabel = isProposta ? "Salvar proposta" : "Salvar correção";
  const successMsg = isProposta ? "Proposta salva." : "Texto corrigido.";

  async function save() {
    setPending(true);
    const res = await updateHistoricalText(provisionId, campo, value);
    setPending(false);
    if (res.error) return toast.error(res.error);
    toast.success(res.message || successMsg);
    setEditing(false);
    router.refresh();
  }

  if (!canEdit) {
    return texto ? (
      <RichTextContent text={texto} />
    ) : (
      <p className="text-sm text-muted-foreground italic">{emptyLabel}</p>
    );
  }

  if (!editing) {
    return (
      <div className="space-y-2">
        {texto ? (
          <RichTextContent text={texto} />
        ) : (
          <p className="text-sm text-muted-foreground italic">{emptyLabel}</p>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setValue(texto);
            setEditing(true);
          }}
          title={editTitle}
        >
          {editLabel}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {campo === "proposta_inicial" ? (
        <RichTextEditor value={value} onChange={setValue} placeholder="Sem alteração proposta (manter redação)." />
      ) : (
        <textarea
          rows={6}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded-lg border bg-background px-3 py-2 font-serif text-[15px] leading-relaxed"
        />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <SubmitBtn label={saveLabel} pending={pending} onClick={save} />
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
          Cancelar
        </Button>
        <span className="text-xs text-muted-foreground">
          A alteração será registrada na trilha de auditoria (antes → depois).
        </span>
      </div>
    </div>
  );
}