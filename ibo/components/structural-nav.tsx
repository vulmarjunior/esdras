"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { provisionLabel } from "@/lib/provision-label";
import { NovoBadge, NotedBadge } from "@/components/status-badge";
import type { TreeNode } from "@/lib/data";

interface Props {
  nodes: TreeNode[];
  activeId: string;
  /** IDs de dispositivos com anotação pessoal do usuário (privada). */
  notedIds?: string[];
}

/**
 * Navegação estrutural com colapse por nó.
 * Por padrão: capítulos e artigos visíveis; parágrafos/incisos recolhidos.
 * O caminho até o dispositivo ativo fica expandido.
 */
export function StructuralNav({ nodes, activeId, notedIds = [] }: Props) {
  const notas = useMemo(() => new Set(notedIds), [notedIds]);
  const ancestors = useMemo(() => {
    const set = new Set<string>();
    const walk = (list: TreeNode[], path: TreeNode[]): boolean => {
      for (const n of list) {
        if (n.id === activeId) {
          path.forEach((p) => set.add(p.id));
          return true;
        }
        if (n.children.length && walk(n.children, [...path, n])) return true;
      }
      return false;
    };
    walk(nodes, []);
    return set;
  }, [nodes, activeId]);

  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    const s = new Set<string>();
    const walk = (list: TreeNode[], depth: number) => {
      for (const n of list) {
        if (n.children.length && depth >= 2 && !ancestors.has(n.id)) s.add(n.id);
        walk(n.children, depth + 1);
      }
    };
    walk(nodes, 0);
    return s;
  });

  const activeRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "center", behavior: "auto" });
  }, [activeId]);

  function toggle(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <ul className="space-y-0.5">
      {nodes.map((n) => (
        <TreeItem
          key={n.id}
          node={n}
          activeId={activeId}
          collapsed={collapsed}
          onToggle={toggle}
          depth={0}
          notas={notas}
          activeRef={activeRef}
        />
      ))}
    </ul>
  );
}

function TreeItem({
  node,
  activeId,
  collapsed,
  onToggle,
  depth,
  notas,
  activeRef,
}: {
  node: TreeNode;
  activeId: string;
  collapsed: Set<string>;
  onToggle: (id: string) => void;
  depth: number;
  notas: ReadonlySet<string>;
  activeRef: { current: HTMLAnchorElement | null };
}) {
  const hasChildren = node.children.length > 0;
  const isCollapsed = collapsed.has(node.id);
  const isActive = node.id === activeId;
  return (
    <li>
      <div className="flex items-center gap-0.5">
        {hasChildren ? (
          <button
            type="button"
            aria-label={isCollapsed ? "Expandir" : "Recolher"}
            onClick={() => onToggle(node.id)}
            className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            style={{ marginLeft: depth * 12 - 8 }}
          >
            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", !isCollapsed && "rotate-90")} />
          </button>
        ) : (
          <span className="shrink-0" style={{ width: 8, marginLeft: depth * 12 - 8 }} />
        )}
        <Link
          ref={isActive ? activeRef : undefined}
          href={`/dispositivo/${node.id}`}
          className={cn(
            "min-w-0 flex-1 rounded px-1.5 py-1 text-sm leading-snug transition-colors hover:bg-muted",
            isActive ? "bg-muted font-medium" : "text-muted-foreground"
          )}
        >
          <span className="flex min-w-0 items-center gap-1">
            <span className="truncate">{provisionLabel(node)}</span>
            {node.origem === "novo" && <NovoBadge />}
            {notas.has(node.id) && <NotedBadge />}
          </span>
          {node.titulo && <span className="block truncate text-[11px] text-muted-foreground/70">{node.titulo}</span>}
        </Link>
      </div>
      {hasChildren && !isCollapsed && (
        <ul className="space-y-0.5">
          {node.children.map((c) => (
            <TreeItem
              key={c.id}
              node={c}
              activeId={activeId}
              collapsed={collapsed}
              onToggle={onToggle}
              depth={depth + 1}
              notas={notas}
              activeRef={activeRef}
            />
          ))}
        </ul>
      )}
    </li>
  );
}