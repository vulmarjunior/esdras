"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChevronRight, TriangleAlert } from "lucide-react";
import { normalizarNumero, rotuloDe } from "@/lib/numeracao";
import { ApprovedBadge, NovoBadge, NotedBadge } from "@/components/status-badge";
import type { TreeNode } from "@/lib/data";
import type { VersaoTrabalho } from "@/lib/types";

interface Props {
  nodes: TreeNode[];
  activeId: string;
  /** IDs de dispositivos com anotação pessoal do usuário (privada). */
  notedIds?: string[];
  /** Versão exibida (proposta = numeração derivada da ordem). */
  versao?: VersaoTrabalho;
  /** Números da versão exibida, por id. */
  numeros?: Record<string, string>;
  /** Números da outra versão (chip "era X" / "→ X"). */
  contraparte?: Record<string, string>;
  /** Números derivados da ordem atual (aviso quando divergem do documento). */
  sugeridos?: Record<string, string>;
}

/**
 * Navegação estrutural com colapse por nó.
 * Por padrão: capítulos e artigos visíveis; parágrafos/incisos recolhidos.
 * O caminho até o dispositivo ativo fica expandido.
 */
export function StructuralNav({
  nodes,
  activeId,
  notedIds = [],
  versao = "vigente",
  numeros = {},
  contraparte = {},
  sugeridos = {},
}: Props) {
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
          versao={versao}
          numeros={numeros}
          contraparte={contraparte}
          sugeridos={sugeridos}
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
  versao,
  numeros,
  contraparte,
  sugeridos,
}: {
  node: TreeNode;
  activeId: string;
  collapsed: Set<string>;
  onToggle: (id: string) => void;
  depth: number;
  notas: ReadonlySet<string>;
  activeRef: { current: HTMLAnchorElement | null };
  versao: VersaoTrabalho;
  numeros: Record<string, string>;
  contraparte: Record<string, string>;
  sugeridos: Record<string, string>;
}) {
  const hasChildren = node.children.length > 0;
  const isCollapsed = collapsed.has(node.id);
  const isActive = node.id === activeId;
  const revogado = node.alteracao_tipo === "revogado";
  const numeroExibido = numeros[node.id];
  const numeroContraparte = contraparte[node.id];
  const numeroSugerido = sugeridos[node.id];
  const mostrarChip =
    numeroExibido && numeroContraparte && normalizarNumero(numeroExibido) !== normalizarNumero(numeroContraparte);
  const divergente =
    versao === "proposta" &&
    numeroExibido &&
    numeroSugerido &&
    normalizarNumero(numeroExibido) !== normalizarNumero(numeroSugerido);
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
            <span className={cn("truncate", revogado && "text-muted-foreground line-through")}>{rotuloDe(node, numeros)}</span>
            {mostrarChip && (
              <span
                className="shrink-0 rounded-full border border-amber-300/70 bg-amber-50 px-1 py-px text-[9px] font-medium text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                title={versao === "proposta" ? "Numeração no Estatuto vigente" : "Numeração na proposta"}
              >
                {versao === "proposta" ? `era ${numeroContraparte}` : `→ ${numeroContraparte}`}
              </span>
            )}
            {divergente && (
              <TriangleAlert
                className="h-3 w-3 shrink-0 text-red-500"
                aria-label={`A ordem atual sugeriria ${numeroSugerido}`}
              />
            )}
            {node.origem === "novo" && <NovoBadge />}
            {revogado && <span className="shrink-0 rounded-full border px-1 py-px text-[9px] text-muted-foreground">rev.</span>}
            {notas.has(node.id) && <NotedBadge />}
            {node.status === "aprovado" && <ApprovedBadge />}
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
              versao={versao}
              numeros={numeros}
              contraparte={contraparte}
              sugeridos={sugeridos}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
