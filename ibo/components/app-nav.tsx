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
  BookMarked,
  ChevronDown,
  Layers,
  CircleHelp,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
}

interface NavTema {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  itens: NavItem[];
  adminOnly?: boolean;
}

/** Item principal fixo (home). */
const NAV_PRINCIPAL: NavItem = { href: "/", label: "Painel", icon: LayoutDashboard };

/** Navegação organizada por temas. */
const NAV_TEMAS: NavTema[] = [
  {
    id: "reforma",
    label: "Reforma",
    icon: Layers,
    itens: [
      { href: "/pendentes", label: "Pendências", icon: CircleAlert },
      { href: "/renumeracao", label: "Renumeração", icon: ListOrdered },
      { href: "/coerencia", label: "Coerência", icon: ShieldAlert },
      { href: "/consolidado", label: "Consolidado", icon: ScrollText },
    ],
  },
  {
    id: "reunioes",
    label: "Reuniões",
    icon: CalendarDays,
    itens: [
      { href: "/reunioes", label: "Reuniões", icon: CalendarDays },
      { href: "/relatorios", label: "Relatórios", icon: FileDown },
    ],
  },
  {
    id: "consulta",
    label: "Consulta",
    icon: BookOpen,
    itens: [
      { href: "/manual", label: "Manual de utilização", icon: CircleHelp },
      { href: "/guia-redacao", label: "Guia de redação", icon: BookOpenText },
      { href: "/documentos", label: "Documentos", icon: BookMarked },
    ],
  },
  {
    id: "administracao",
    label: "Administração",
    icon: ShieldCheck,
    adminOnly: true,
    itens: [
      { href: "/auditoria", label: "Auditoria", icon: History, adminOnly: true },
      { href: "/admin", label: "Administração", icon: ShieldCheck, adminOnly: true },
    ],
  },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const temas = NAV_TEMAS.filter((t) => !t.adminOnly || isAdmin);

  return (
    <nav className="sticky top-0 z-40 hidden border-b bg-background/90 backdrop-blur md:block">
      <div className="mx-auto flex max-w-6xl items-center gap-1 px-4 py-1.5">
        {(() => {
          const active = isActive(pathname, NAV_PRINCIPAL.href);
          const Icon = NAV_PRINCIPAL.icon;
          return (
            <Link
              href={NAV_PRINCIPAL.href}
              className={cn(
                "relative flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                active && "text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {NAV_PRINCIPAL.label}
              {active && <span className="absolute inset-x-3 -bottom-[7px] h-0.5 rounded-full bg-primary" />}
            </Link>
          );
        })()}

        {temas.map((tema) => {
          const temaAtivo = tema.itens.some((n) => isActive(pathname, n.href));
          const TemaIcon = tema.icon;
          return (
            <DropdownMenu key={tema.id}>
              <DropdownMenuTrigger
                className={cn(
                  "relative flex shrink-0 cursor-default items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground select-none",
                  temaAtivo && "text-foreground"
                )}
              >
                <TemaIcon className="h-4 w-4" />
                <span>{tema.label}</span>
                <ChevronDown className="h-4 w-4" />
                {temaAtivo && <span className="absolute inset-x-3 -bottom-[7px] h-0.5 rounded-full bg-primary" />}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" sideOffset={6} className="min-w-52">
                {tema.itens.map((n) => {
                  const active = isActive(pathname, n.href);
                  const Icon = n.icon;
                  return (
                    <DropdownMenuItem
                      key={n.href}
                      render={<Link href={n.href} />}
                      className={cn("gap-2.5 px-2.5 py-2", active && "bg-muted font-semibold text-foreground")}
                    >
                      <Icon className={cn("h-4 w-4 text-muted-foreground", active && "text-primary")} />
                      {n.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        })}
      </div>
    </nav>
  );
}

export function MobileNav({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const items = [
    NAV_PRINCIPAL,
    ...NAV_TEMAS.filter((t) => !t.adminOnly || isAdmin).flatMap((t) => t.itens),
  ].filter((n) => !n.adminOnly || isAdmin);

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