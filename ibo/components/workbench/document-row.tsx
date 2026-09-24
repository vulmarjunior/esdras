"use client";

import dynamic from "next/dynamic";
import { AlertTriangle, StickyNote } from "lucide-react";
import { RichTextContent } from "@/components/rich-text-content";
import { NovoBadge, StatusDot } from "@/components/status-badge";
import { normalizarNumero } from "@/lib/numeracao";
import { cn } from "@/lib/utils";
import { currentText, isStructural, label, type FlatNode } from "@/lib/workbench-node";

const WorkingTextEditor = dynamic(
  () => import("@/components/provision/working-text-editor").then((module) => module.WorkingTextEditor),
  { loading: () => <p className="text-sm text-muted-foreground">Carregando editor…</p> },
);

/**
 * Uma linha do documento em construção. O dispositivo selecionado vira editor
 * inline (autosave); os demais são leitura com marcas de estado.
 */
export function WorkbenchDocumentRow({
  item,
  active,
  canEdit,
  editingOpen,
  onSelect,
  registerRef,
}: {
  item: FlatNode;
  active: boolean;
  canEdit: boolean;
  editingOpen: boolean;
  onSelect: (id: string) => void;
  registerRef?: (element: HTMLElement | null) => void;
}) {
  const revoked = item.alteracaoTipo === "revogado";
  const moved = item.numero && item.numeroVigente && normalizarNumero(item.numero) !== normalizarNumero(item.numeroVigente);

  const cabecalho = (
    <span className="mb-1 flex flex-wrap items-center gap-2">
      <span className={cn("font-heading text-sm font-semibold", revoked && "line-through")}>{label(item)}</span>
      {item.titulo && <span className="text-sm text-muted-foreground">— {item.titulo}</span>}
      {item.origem === "novo" && <NovoBadge />}
      {moved && (
        <span className="rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          era {item.numeroVigente}
        </span>
      )}
      {revoked && <span className="rounded-full border px-1.5 py-0.5 text-[10px] text-muted-foreground">revogado</span>}
      <span className="ml-auto flex items-center gap-1.5">
        {item.hasPending && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" aria-label="Possui pendência aberta" />}
        {item.hasNote && <StickyNote className="h-3.5 w-3.5 text-violet-500" aria-label="Possui anotação pessoal" />}
        <StatusDot status={item.status} />
      </span>
    </span>
  );

  const inlineEditing = active && canEdit && !revoked && !isStructural(item.type) && !editingOpen;

  if (inlineEditing) {
    return (
      <div
        ref={registerRef}
        className="rounded-xl border border-primary/50 bg-card px-3 py-2 shadow-sm ring-2 ring-primary/10"
        style={{ paddingLeft: `${12 + Math.min(item.depth, 4) * 18}px` }}
      >
        <button type="button" onClick={() => onSelect(item.id)} className="w-full text-left">
          {cabecalho}
        </button>
        <div className="mt-1">
          <WorkingTextEditor
            key={item.id}
            provisionId={item.id}
            initialText={currentText(item)}
            version={item.version}
            canEdit
            compararTexto={item.textoVigente}
            inline
            editorMinHeightClass="min-h-[7rem]"
          />
        </div>
      </div>
    );
  }

  return (
    <button
      ref={registerRef}
      type="button"
      onClick={() => onSelect(item.id)}
      className={cn(
        "group w-full rounded-xl border border-transparent px-3 py-2 text-left transition-all hover:border-border hover:bg-card",
        active && "border-primary/50 bg-card shadow-sm ring-2 ring-primary/10",
        revoked && "opacity-65",
      )}
      style={{ paddingLeft: `${12 + Math.min(item.depth, 4) * 18}px` }}
    >
      {cabecalho}
      {revoked ? (
        <span className="block text-sm italic text-muted-foreground">Retirado da proposta de texto futuro.</span>
      ) : isStructural(item.type) ? null : currentText(item).trim() ? (
        <RichTextContent text={currentText(item)} className="text-[15px] leading-7 text-foreground/85" />
      ) : (
        <span className="block text-sm italic text-muted-foreground">Redação ainda não cadastrada.</span>
      )}
    </button>
  );
}
