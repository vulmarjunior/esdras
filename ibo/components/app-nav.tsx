"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CalendarDays,
  CircleAlert,
  ScrollText,
  FileDown,
  History,
  ShieldCheck,
  Menu,
  X,
  BookOpen,
  ListOrdered,
  ShieldAlert,
  BookOpenText,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";

export const NAV = [
  { href: "/", label: "Painel da Reforma", icon: LayoutDashboard },
  { href: "/reunioes", label: "Reuniões", icon: CalendarDays },
  { href: "/pendentes", label: "Pendências", icon: CircleAlert },
  { href: "/consolidado", label: "Estatuto consolidado", icon: ScrollText },
  { href: "/renumeracao", label: "Renumeração", icon: ListOrdered },
  { href: "/coerencia", label: "Coerência", icon: ShieldAlert },
  { href: "/guia-redacao", label: "Guia de redação", icon: BookOpenText },
  { href: "/relatorios", label: "Relatórios", icon: FileDown },
  { href: "/auditoria", label: "Auditoria", icon: History, adminOnly: true },
  { href: "/admin", label: "Administração", icon: ShieldCheck, adminOnly: true },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  return (
    <nav className="sticky top-0 z-40 hidden border-b bg-background/90 backdrop-blur md:block">
      <div className="mx-auto flex max-w-6xl items-center gap-1 px-4 py-1.5">
        {NAV.filter((n) => !n.adminOnly || isAdmin).map((n) => {
          const active = isActive(pathname, n.href);
          const Icon = n.icon;
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "relative flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                active && "text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {n.label}
              {active && <span className="absolute inset-x-3 -bottom-[7px] h-0.5 rounded-full bg-primary" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function MobileNav({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const items = NAV.filter((n) => !n.adminOnly || isAdmin);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Abrir menu"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
      >
        <Menu className="h-4.5 w-4.5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-4/5 gap-0 p-0 sm:max-w-xs">
        <SheetHeader className="flex-row items-center justify-between border-b px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BookOpen className="h-4 w-4" />
            </div>
            <SheetTitle className="font-heading text-base">ESDRAS</SheetTitle>
          </div>
          <SheetClose className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted">
            <X className="h-4 w-4" />
          </SheetClose>
        </SheetHeader>
        <div className="flex flex-col gap-1 overflow-y-auto p-3">
          {items.map((n) => {
            const active = isActive(pathname, n.href);
            const Icon = n.icon;
            return (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  active && "bg-muted text-foreground"
                )}
              >
                <Icon className={cn("h-4.5 w-4.5", active && "text-primary")} />
                {n.label}
              </Link>
            );
          })}
        </div>
        <div className="mt-auto border-t p-4">
          <p className="text-xs text-muted-foreground">
            ESDRAS — Espaço de Sugestões, Deliberações, Revisões, Atas e Sistematização
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}