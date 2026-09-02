"use client";

import { useEffect, useRef, useState, type ClipboardEvent } from "react";
import { cn } from "@/lib/utils";
import { Bold, Italic, Underline, Highlighter, RemoveFormatting, type LucideIcon } from "lucide-react";

type Tool = { cmd: string; label: string; Icon: LucideIcon };

const TOOLS: Tool[] = [
  { cmd: "bold", label: "Negrito", Icon: Bold },
  { cmd: "italic", label: "Itálico", Icon: Italic },
  { cmd: "underline", label: "Sublinhado", Icon: Underline },
  { cmd: "hiliteColor", label: "Destacar redação nova (liga/desliga)", Icon: Highlighter },
  { cmd: "removeFormat", label: "Limpar formatação da seleção", Icon: RemoveFormatting },
];

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeightClass?: string;
}

/**
 * Editor de texto com formatação básica (negrito, itálico, sublinhado, destaque).
 * Zero dependência: contenteditable + document.execCommand. Armazena HTML sanitizado.
 *
 * A seleção dentro do editor é capturada (onSelect) e restaurada imediatamente antes
 * de executar o comando, garantindo que a formatação atinja apenas o trecho escolhido.
 * O DOM não é controlado pelo React enquanto o usuário digita (evita cursor voltando
 * ao início): atualizações externas chegam apenas quando o editor está sem foco.
 */
export function RichTextEditor({ value, onChange, placeholder, className, minHeightClass = "min-h-32" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (el && !focused && el.innerHTML !== value) {
      el.innerHTML = value;
    }
  }, [value, focused]);

  function saveSelection() {
    const sel = window.getSelection();
    const el = ref.current;
    if (!sel || sel.rangeCount === 0 || !el) {
      savedRange.current = null;
      return;
    }
    const range = sel.getRangeAt(0);
    savedRange.current =
      range.collapsed || el.contains(range.commonAncestorContainer) ? range.cloneRange() : null;
  }

  function restoreSelection() {
    const sel = window.getSelection();
    if (!sel || !savedRange.current) return;
    sel.removeAllRanges();
    sel.addRange(savedRange.current);
  }

  function emit() {
    if (ref.current) onChange(ref.current.innerHTML);
  }

  const isHighlight = (n: HTMLElement): boolean => {
    const tag = n.tagName.toLowerCase();
    if (tag === "mark") return true;
    if (tag === "font" || tag === "span") {
      const bg = n.style.backgroundColor;
      return Boolean(bg) && bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)";
    }
    return false;
  };

  function getHighlightAncestor(node: Node | null): HTMLElement | null {
    let n: Node | null = node;
    while (n && n !== ref.current) {
      if (n instanceof HTMLElement && isHighlight(n)) return n;
      n = n.parentNode;
    }
    return null;
  }

  /** Aplica destaque (marca-texto) envolvendo a seleção em <mark>. */
  function applyHighlight() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) {
      document.execCommand("hiliteColor", false, "#fde68a");
      return;
    }
    const fragment = range.extractContents();
    const mark = document.createElement("mark");
    mark.style.backgroundColor = "#fde68a";
    mark.appendChild(fragment);
    range.insertNode(mark);
    const textRange = document.createRange();
    textRange.selectNodeContents(mark);
    sel.removeAllRanges();
    sel.addRange(textRange);
  }

  /** Remove destaque desfazendo (unwrap) os elementos marcados na seleção. */
  function removeHighlight() {
    const el = ref.current;
    const sel = window.getSelection();
    if (!el || !sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const targets: HTMLElement[] = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT);
    while (walker.nextNode()) {
      const n = walker.currentNode as HTMLElement;
      if (isHighlight(n) && range.intersectsNode(n)) targets.push(n);
    }
    if (range.collapsed) {
      const anc = getHighlightAncestor(sel.anchorNode);
      if (anc && !targets.includes(anc)) targets.push(anc);
    }
    for (const t of targets) {
      const parent = t.parentNode;
      if (!parent) continue;
      while (t.firstChild) parent.insertBefore(t.firstChild, t);
      parent.removeChild(t);
    }
    emit();
    saveSelection();
  }

  function toggleHighlight() {
    ref.current?.focus();
    restoreSelection();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const startH = getHighlightAncestor(sel.anchorNode);
    const endH = getHighlightAncestor(sel.focusNode);
    if (range.collapsed) {
      if (startH) {
        removeHighlight();
      } else {
        applyHighlight();
      }
      return;
    }
    if (startH || endH) {
      removeHighlight();
    } else {
      applyHighlight();
    }
    emit();
    saveSelection();
  }

  /** Substitui a seleção por texto puro — remove qualquer formatação/estrutura de forma confiável. */
  function clearFormatting() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) return;
    const text = range.toString();
    document.execCommand("insertText", false, text);
    emit();
    saveSelection();
  }

  /** Colagem limpa: insere apenas texto puro, ignorando a formatação da origem. */
  function onPaste(e: ClipboardEvent<HTMLDivElement>) {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    emit();
  }

  function run(cmd: string) {
    if (cmd === "removeFormat") {
      clearFormatting();
      return;
    }
    if (cmd === "hiliteColor") {
      toggleHighlight();
      return;
    }
    ref.current?.focus();
    restoreSelection();
    document.execCommand(cmd, false);
    emit();
    saveSelection();
  }

  return (
    <div className={cn("rounded-lg border bg-background", focused && "ring-2 ring-ring", className)}>
      <div className="flex items-center gap-0.5 border-b bg-muted/30 px-1.5 py-1">
        {TOOLS.map((t) => (
          <button
            key={t.cmd}
            type="button"
            title={t.label}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => run(t.cmd)}
          >
            <t.Icon className="h-4 w-4" />
          </button>
        ))}
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onPaste={onPaste}
        onSelect={saveSelection}
        onKeyUp={saveSelection}
        onMouseUp={saveSelection}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        data-placeholder={placeholder}
        className={cn(
          "px-3.5 py-3 font-serif text-[15px] leading-relaxed text-foreground outline-none",
          "[&:empty:before]:content-[attr(data-placeholder)] [&:empty:before]:pointer-events-none [&:empty:before]:text-muted-foreground [&:empty:before]:italic",
          minHeightClass
        )}
      />
    </div>
  );
}