import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Dica orientativa exibida em cada campo/seção da tela de análise.
 */
export function FieldHelper({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground", className)}>
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/60" />
      <span>{children}</span>
    </p>
  );
}