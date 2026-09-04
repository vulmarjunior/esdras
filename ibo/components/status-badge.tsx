import { cn } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/labels";

export const STATUS_COLORS: Record<string, string> = {
  nao_iniciado: "border-border bg-muted text-muted-foreground",
  em_analise: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  em_discussao: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  redacao_definida: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300",
  aprovado: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  reaberto: "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300",
};

export const STATUS_DOTS: Record<string, string> = {
  nao_iniciado: "bg-zinc-300 dark:bg-zinc-600",
  em_analise: "bg-blue-500",
  em_discussao: "bg-amber-500",
  redacao_definida: "bg-violet-500",
  aprovado: "bg-emerald-500",
  reaberto: "bg-red-500",
};

export const SUGGESTION_COLORS: Record<string, string> = {
  aberta: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  em_discussao: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  aceita: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  aceita_parcialmente: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300",
  rejeitada: "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300",
  retirada: "border-border bg-muted text-muted-foreground",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const label = STATUS_LABELS[status] || status;
  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        STATUS_COLORS[status] || "border-border bg-muted text-muted-foreground",
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOTS[status] || "bg-current")} />
      {label}
    </span>
  );
}

export function StatusDot({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 shrink-0 rounded-full",
        STATUS_DOTS[status] || "bg-current",
        className
      )}
      title={STATUS_LABELS[status] || status}
    />
  );
}

/** Marca distintiva de dispositivo novo (inserido na proposta de reforma). */
export function NovoBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-4 shrink-0 items-center rounded-full bg-amber-400 px-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-950 shadow-sm dark:bg-amber-500",
        className
      )}
    >
      novo
    </span>
  );
}