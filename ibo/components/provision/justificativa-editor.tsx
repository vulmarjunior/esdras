"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { updateJustificativa } from "@/app/actions/provision";
import { RichTextEditor } from "@/components/rich-text-editor";
import { RichTextContent } from "@/components/rich-text-content";
import { SubmitBtn } from "@/components/provision/submit-btn";

export function JustificativaEditor({ provisionId, initial, canEdit }: { provisionId: string; initial: string; canEdit: boolean }) {
  const [text, setText] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  async function save() {
    setPending(true);
    await updateJustificativa(provisionId, text);
    setPending(false);
    setEditing(false);
    router.refresh();
  }
  if (!canEdit) {
    return initial ? <RichTextContent text={initial} className="text-sm" /> : <p className="text-sm text-muted-foreground">—</p>;
  }
  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-2">
        {initial ? <RichTextContent text={initial} className="text-sm" /> : <p className="text-sm text-muted-foreground">—</p>}
        <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Editar</Button>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <RichTextEditor value={text} onChange={setText} placeholder="Justificativa..." minHeightClass="min-h-24" />
      <div className="flex gap-2">
        <SubmitBtn label="Salvar" pending={pending} onClick={save} />
        <Button size="sm" variant="ghost" onClick={() => { setText(initial); setEditing(false); }}>Cancelar</Button>
      </div>
    </div>
  );
}