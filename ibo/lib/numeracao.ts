/**
 * Numeração derivada da ordem atual da árvore (módulo puro, sem banco).
 *
 * A numeração "oficial de trabalho" da proposta é sempre calculada a partir da
 * ordem (`ordem_pai`/`ordem`) — artigos em sequência (1º, 2º, …) e capítulos em
 * romanos (I, II, …). Dispositivos revogados não ocupam número. A numeração
 * importada do documento original permanece em `provision_placements` apenas
 * como referência histórica.
 */
import { toRoman } from "./renumeracao-core";
import { provisionLabel } from "./provision-label";

export interface NoNumeravel {
  id: string;
  type: string;
  alteracao_tipo?: string;
  numero?: string | null;
  children: NoNumeravel[];
}

/** Tipos de alteração que retiram o dispositivo do texto final (não numeram). */
export const ALTERACOES_REMOVIDAS = new Set(["revogado"]);

/** Mesmo formato do `provisionLabel`: "1º"…"9º", "10", "11"… */
export function formatarNumeroArtigo(n: number): string {
  return n < 10 ? `${n}º` : String(n);
}

/** Mapa id → número (artigos e capítulos) na ordem atual da árvore. */
export function numerarArvore(nodes: NoNumeravel[]): Map<string, string> {
  const numeros = new Map<string, string>();
  let artigo = 0;
  let capitulo = 0;
  const visitar = (lista: NoNumeravel[]) => {
    for (const no of lista) {
      if (ALTERACOES_REMOVIDAS.has(no.alteracao_tipo ?? "")) continue;
      if (no.type === "artigo") {
        artigo++;
        numeros.set(no.id, formatarNumeroArtigo(artigo));
      } else if (no.type === "capitulo") {
        capitulo++;
        numeros.set(no.id, toRoman(capitulo));
      }
      visitar(no.children);
    }
  };
  visitar(nodes);
  return numeros;
}

/** Normaliza número para comparação ("24º" = "24", "IV" = "IV"). */
export function normalizarNumero(valor: string | null | undefined): string {
  return (valor ?? "").replace(/[º°.\s]/g, "").toUpperCase();
}

export interface NoComOrigem {
  numero?: string | null;
  origem_ref_id?: string | null;
  sem_origem?: number | boolean | null;
}

/**
 * Era efetiva (número no Estatuto registrado) exibida no chip "era N".
 * A referência manual ao dispositivo de origem prevalece; `sem_origem` declara
 * que não há correspondência; sem anotação, vale o próprio número (automático).
 */
export function resolverEra(dispositivo: NoComOrigem, numeroReferenciado: string | null): string | null {
  if (dispositivo.origem_ref_id) return numeroReferenciado ?? null;
  if (dispositivo.sem_origem) return null;
  return dispositivo.numero ?? null;
}

/** IDs cujo número armazenado difere do derivado (numeração desatualizada). */
export function numeracaoDesatualizada(
  armazenados: Map<string, string | null | undefined>,
  derivados: Map<string, string>
): string[] {
  const out: string[] = [];
  for (const [id, derivado] of derivados) {
    const armazenado = armazenados.get(id);
    if (normalizarNumero(armazenado) !== normalizarNumero(derivado)) out.push(id);
  }
  return out;
}

/** Cópia da árvore com `numero` substituído pelos números derivados. */
export function aplicarNumeracao<T extends NoNumeravel>(nodes: T[], numeros: Map<string, string>): T[] {
  return nodes.map((n) => ({
    ...n,
    numero: numeros.get(n.id) ?? n.numero ?? null,
    children: aplicarNumeracao(n.children as T[], numeros),
  }));
}

/** Rótulo do dispositivo com o número da versão exibida (se houver). */
export function rotuloDe(
  node: { id: string; type: string; numero?: string | null; titulo?: string | null },
  numeros: Record<string, string> | Map<string, string>
): string {
  const numero = numeros instanceof Map ? numeros.get(node.id) : numeros[node.id];
  return numero ? provisionLabel({ ...node, numero } as never) : provisionLabel(node as never);
}

/** Números já presentes na árvore (ex.: placements da versão vigente), por id. */
export function numerosDaArvore(nodes: NoNumeravel[]): Map<string, string> {
  const out = new Map<string, string>();
  const visitar = (lista: NoNumeravel[]) => {
    for (const no of lista) {
      if (no.numero) out.set(no.id, no.numero);
      visitar(no.children);
    }
  };
  visitar(nodes);
  return out;
}

/** Conta dispositivos de um tipo na árvore, ignorando os removidos (revogados). */
export function contarTipo(nodes: NoNumeravel[], tipo: string): number {
  let total = 0;
  const visitar = (lista: NoNumeravel[]) => {
    for (const no of lista) {
      if (ALTERACOES_REMOVIDAS.has(no.alteracao_tipo ?? "")) continue;
      if (no.type === tipo) total++;
      visitar(no.children);
    }
  };
  visitar(nodes);
  return total;
}

/**
 * Numeração local dos dispositivos subordinados, pela posição real na proposta.
 * Capítulos e artigos continuam sujeitos ao fluxo próprio de renumeração.
 * O Estatuto vigente não é alterado.
 */
export function numerarSubordinados(nodes: NoNumeravel[]): Map<string, string> {
  const numeros = new Map<string, string>();
  const alinea = (index: number): string => {
    let n = index;
    let value = "";
    do {
      value = String.fromCharCode(97 + n % 26) + value;
      n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return value;
  };
  const visitar = (lista: NoNumeravel[]) => {
    const ativos = lista.filter((node) => !ALTERACOES_REMOVIDAS.has(node.alteracao_tipo ?? ""));
    const parags = ativos.filter((node) => node.type === "paragrafo");
    const incisos = ativos.filter((node) => node.type === "inciso");
    const alineas = ativos.filter((node) => node.type === "alinea");
    parags.forEach((node, i) => numeros.set(node.id, parags.length === 1 ? "único" : `${i + 1}º`));
    incisos.forEach((node, i) => numeros.set(node.id, toRoman(i + 1)));
    alineas.forEach((node, i) => numeros.set(node.id, alinea(i)));
    for (const node of ativos) visitar(node.children);
  };
  visitar(nodes);
  return numeros;
}
