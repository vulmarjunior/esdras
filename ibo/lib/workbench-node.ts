/**
 * Tipos e funções puras da Mesa de Trabalho (módulo sem banco).
 * Usados pelo workbench, pela linha do documento e pela página.
 */
import { normalizarNumero } from "./numeracao";
import { provisionLabel } from "./provision-label";
import { PROVISION_TYPE_LABELS } from "./labels";
import type { CorrespondenciaRegistro } from "./correspondencias";
import type { Comment, PendingIssue, Suggestion } from "./types";

export interface WorkbenchNode {
  id: string;
  parentId: string | null;
  type: string;
  numero: string | null;
  numeroVigente: string | null;
  numeroSugerido: string | null;
  titulo: string | null;
  origem: string;
  origemRefId: string | null;
  semOrigem: boolean;
  temVigente: boolean;
  alteracaoTipo: string;
  status: string;
  textoVigente: string;
  propostaInicial: string;
  redacaoTrabalho: string;
  redacaoConsolidada: string;
  acordoEm: string | null;
  acordoPorName: string | null;
  acordoVersion: number | null;
  justificativa: string;
  version: number;
  updatedAt: string;
  hasNote: boolean;
  hasPending: boolean;
  personalNote: string;
  suggestions: Suggestion[];
  comments: Comment[];
  pendings: PendingIssue[];
  correspondencias: CorrespondenciaRegistro[];
  suggestionCount: number;
  commentCount: number;
  childCount: number;
  children: WorkbenchNode[];
}

export interface FlatNode extends WorkbenchNode {
  depth: number;
}

export function label(node: Pick<WorkbenchNode, "type" | "numero" | "id">): string {
  const numeroArtigo = node.numero && /^\d+$/.test(node.numero)
    ? Number(node.numero) < 10 ? `${node.numero}º` : node.numero
    : node.numero;
  if (node.type === "capitulo") return node.numero ? `Capítulo ${node.numero}` : "Novo capítulo";
  if (node.type === "secao") return node.numero ? `Seção ${node.numero}` : "Nova seção";
  if (node.type === "artigo") return numeroArtigo ? `Art. ${numeroArtigo}` : "Novo artigo";
  if (node.type === "paragrafo") {
    if (!node.numero) return "Novo parágrafo";
    if (node.numero.toLocaleLowerCase("pt-BR") === "único") return "Parágrafo único";
    return `§ ${node.numero}`;
  }
  if (node.type === "alinea") return node.numero ? node.numero.replace(/\)?$/, ")") : "Nova alínea";
  if (node.type === "item") return node.numero ? node.numero.replace(/\.?$/, ".") : "Novo item";
  return node.numero || PROVISION_TYPE_LABELS[node.type] || node.id;
}

export function flatten(nodes: WorkbenchNode[], depth = 0): FlatNode[] {
  return nodes.flatMap((node) => [
    { ...node, depth },
    ...flatten(node.children, depth + 1),
  ]);
}

export function findNode(nodes: WorkbenchNode[], id: string): WorkbenchNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNode(node.children, id);
    if (found) return found;
  }
  return undefined;
}

export function descendantIds(node: WorkbenchNode): Set<string> {
  return new Set(flatten(node.children).map((child) => child.id));
}

export function destinationLabel(node: WorkbenchNode): string {
  const former = node.numeroVigente && normalizarNumero(node.numeroVigente) !== normalizarNumero(node.numero)
    ? ` · vigente ${node.numeroVigente}`
    : "";
  return `${label(node)}${node.titulo ? ` — ${node.titulo}` : ""}${former}`;
}

export function currentText(node: WorkbenchNode): string {
  return node.redacaoTrabalho || node.propostaInicial || node.textoVigente || "";
}

export function allowedChildren(type: string): string[] {
  const hierarchy: Record<string, string[]> = {
    capitulo: ["secao", "artigo"],
    secao: ["artigo"],
    artigo: ["paragrafo", "inciso", "alinea"],
    paragrafo: ["inciso", "alinea"],
    inciso: ["alinea"],
    alinea: ["item"],
    item: [],
  };
  return hierarchy[type] ?? [];
}

/** Capítulos e seções são nós estruturais: o conteúdo no documento é o título. */
export function isStructural(type: string): boolean {
  return type === "capitulo" || type === "secao";
}

export function articleStats(chapter: WorkbenchNode) {
  const articles = flatten(chapter.children).filter((node) => node.type === "artigo" && node.alteracaoTipo !== "revogado");
  const approved = articles.filter((node) => node.status === "aprovado").length;
  return { total: articles.length, approved };
}

export { provisionLabel };
