"use client";

import type { DiffPart } from "@/lib/review-core";

/** Renderiza um texto com marcações de trechos retirados (antes) ou acrescentados (depois). */
export function ComparedText({
  parts,
  side,
  highlight,
}: {
  parts: DiffPart[];
  side: "before" | "after";
  highlight: boolean;
}) {
  return (
    <p className="whitespace-pre-wrap break-words text-sm leading-7">
      {parts.map((part, i) => {
        if (!highlight || !part.changed) return <span key={i}>{part.text}</span>;
        return side === "before" ? (
          <del key={i} className="bg-red-100 text-red-900 decoration-red-600 dark:bg-red-950 dark:text-red-200">
            {part.text}
          </del>
        ) : (
          <ins key={i} className="bg-emerald-100 text-emerald-900 decoration-emerald-600 dark:bg-emerald-950 dark:text-emerald-200">
            {part.text}
          </ins>
        );
      })}
    </p>
  );
}
