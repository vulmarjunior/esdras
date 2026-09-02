import { cn } from "@/lib/utils";
import { renderRichText } from "@/lib/rich-text";

/**
 * Renderiza texto puro ou HTML sanitizado (negrito/itálico/sublinhado/highlight).
 * Pode ser usado em componentes server e client.
 */
export function RichTextContent({ text, className }: { text: string; className?: string }) {
  if (!text) return null;
  return (
    <div
      className={cn("font-serif text-[15px] leading-relaxed text-foreground", className)}
      dangerouslySetInnerHTML={{ __html: renderRichText(text) }}
    />
  );
}