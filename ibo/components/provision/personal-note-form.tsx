"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldHelper } from "@/components/field-helper";
import { savePersonalNote } from "@/app/actions/notes";

export function PersonalNoteForm({ provisionId, initial }: { provisionId: string; initial: string }) {
  const [content, setContent] = useState(initial);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function submit() {
    setPending(true);
    const res = await savePersonalNote(provisionId, content);
    setPending(false);
    if (res.error) return toast.error(res.error);
    toast.success(res.message || "Anotação salva.");
    router.refresh();
  }

  return (
    <Card className="border-violet-200/70 bg-violet-50/40 dark:border-violet-800/60 dark:bg-violet-950/20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Anotações pessoais</CardTitle>
        <Badge variant="outline" className="border-violet-300 text-violet-700 dark:border-violet-800 dark:text-violet-300">
          visível apenas para você
        </Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        <textarea
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Suas observações particulares sobre este dispositivo..."
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-ring transition-shadow focus:ring-2"
        />
        <div className="flex items-center justify-between gap-2">
          <FieldHelper>Nota privada — nenhum outro membro consegue ler. Não gera histórico nem auditoria.</FieldHelper>
          <Button type="button" size="sm" disabled={pending} onClick={submit}>
            {pending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}