"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { provisionLabel } from "@/lib/provision-label";
import type { TreeNode } from "@/lib/data";

interface Props {
  nodes: TreeNode[];
  activeId: string;
}

/**
 * Navegação estrutural com colapse por nó.
 * Por padrão: capítulos e artigos visíveis; parágrafos/incisos recolhidos.
 * O caminho até o dispositivo ativo fica expandido.
 */
export function StructuralNav({ nodes, activeId }: Props) {
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
        <TreeItem key={n.id} node={n} activeId={activeId} collapsed={collapsed} onToggle={toggle} depth={0} />
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
}: {
  node: TreeNode;
  activeId: string;
  collapsed: Set<string>;
  onToggle: (id: string) => void;
  depth: number;
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
          href={`/dispositivo/${node.id}`}
          className={cn(
            "min-w-0 flex-1 rounded px-1.5 py-1 text-sm leading-snug transition-colors hover:bg-muted",
            isActive ? "bg-muted font-medium" : "text-muted-foreground"
          )}
        >
          <span className="block truncate">{provisionLabel(node)}</span>
          {node.titulo && <span className="block truncate text-[11px] text-muted-foreground/70">{node.titulo}</span>}
        </Link>
      </div>
      {hasChildren && !isCollapsed && (
        <ul className="space-y-0.5">
          {node.children.map((c) => (
            <TreeItem key={c.id} node={c} activeId={activeId} collapsed={collapsed} onToggle={onToggle} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}