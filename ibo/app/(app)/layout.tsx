import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/labels";
import { AppNav, MobileNav } from "@/components/app-nav";
import { logoutAction } from "@/app/actions/auth";
import { getActiveMeeting } from "@/lib/data";
import Link from "next/link";
import { BookOpen, LogOut, Radio } from "lucide-react";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const activeMeeting = getActiveMeeting();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-3 sm:px-4 sm:py-3.5">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <MobileNav isAdmin={user.role === "admin"} />
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm sm:h-10 sm:w-10">
              <BookOpen className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-heading text-sm font-semibold leading-tight sm:text-lg">
                Reforma do Estatuto Social da IBO
              </h1>
              <p className="hidden truncate text-xs text-muted-foreground sm:block">
                ESDRAS — Espaço de Sugestões, Deliberações, Revisões, Atas e Sistematização
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            {activeMeeting && (
              <Link
                href={`/reunioes/${activeMeeting.id}`}
                className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 sm:px-3"
              >
                <Radio className="h-3.5 w-3.5 animate-pulse" />
                <span className="hidden sm:inline">Reunião em andamento</span>
                <span className="sm:hidden">Ao vivo</span>
              </Link>
            )}
            <div className="flex items-center gap-2 sm:gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary sm:h-9 sm:w-9 sm:text-sm">
                {initials(user.name)}
              </div>
              <div className="hidden text-right md:block">
                <p className="text-sm font-medium leading-tight">{user.name}</p>
                <p className="text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</p>
              </div>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                title="Sair"
                className="flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:h-9 sm:w-auto sm:gap-1.5 sm:px-2.5 sm:text-xs sm:font-medium"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </form>
          </div>
        </div>
      </header>
      <AppNav isAdmin={user.role === "admin"} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">{children}</main>
      <footer className="border-t py-4">
        <p className="mx-auto max-w-6xl px-4 text-center text-xs text-muted-foreground">
          ESDRAS — Comissão de Reforma do Estatuto Social da Igreja Batista Olaria
        </p>
      </footer>
    </div>
  );
}