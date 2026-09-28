import { normalizarTexto, tokenizar, truncar } from "../busca";
import { provisionLabel } from "../provision-label";
import type { Provision } from "../types";
import type { Draft, DraftNode, NodeType } from "./model";

/** Dispositivo do Estatuto registrado disponível para vinculação. */
export type CandidatoVinculo = Pick<Provision, "id" | "type" | "numero" | "titulo"> & {
  vigente: string;
  proposta: string;
};

export type SugestaoVinculo = { id: string; score: number; igual: boolean };
export type SugestaoLote = { nodeId: string; sugestao: SugestaoVinculo };

/** Tipos do Estatuto registrado compatíveis com cada tipo da nova minuta. */
const TIPOS_COMPATIVEIS: Record<NodeType, string[]> = {
  chapter: ["capitulo"],
  section: ["secao"],
  subsection: ["secao"],
  article: ["artigo"],
  paragraph: ["paragrafo"],
  inciso: ["inciso", "paragrafo"],
  alinea: ["alinea", "inciso"],
  free: ["capitulo", "secao", "artigo", "paragrafo", "inciso", "alinea"],
};

const ESTRUTURAIS: NodeType[] = ["chapter", "section", "subsection"];

export const rotuloCandidato = (c: CandidatoVinculo): string => provisionLabel(c);
export const textoVigente = (c: CandidatoVinculo): string => c.vigente.trim();
export const textoProposta = (c: CandidatoVinculo): string => c.proposta.trim();
export const resumoCandidato = (c: CandidatoVinculo): string =>
  truncar(textoProposta(c) || textoVigente(c) || c.titulo || "", 140);

const tokensDe = (texto: string): Set<string> => new Set(tokenizar(texto));

const coeficiente = (alvo: Set<string>, fonte: Set<string>): number => {
  if (!alvo.size || !fonte.size) return 0;
  let intersecao = 0;
  for (const termo of alvo) if (fonte.has(termo)) intersecao++;
  const uniao = alvo.size + fonte.size - intersecao;
  const jaccard = uniao ? intersecao / uniao : 0;
  // Trechos extraídos de um dispositivo maior ficam com Jaccard baixo; a cobertura
  // (interseção sobre o menor conjunto) os recupera com um desconto de confiança.
  const cobertura = intersecao / Math.min(alvo.size, fonte.size);
  return Math.max(jaccard, cobertura * 0.8);
};

/** Compara um nó da minuta com um dispositivo do Estatuto, respeitando o tipo. */
export function compararCandidato(node: DraftNode, candidato: CandidatoVinculo): { score: number; igual: boolean } {
  const tipos = TIPOS_COMPATIVEIS[node.type] ?? [];
  if (!tipos.includes(candidato.type)) return { score: 0, igual: false };
  const alvo = normalizarTexto(node.text);
  if (!alvo) return { score: 0, igual: false };
  const tokensAlvo = tokensDe(node.text);
  const fontes = ESTRUTURAIS.includes(node.type)
    ? [candidato.titulo ?? "", candidato.vigente, candidato.proposta]
    : [candidato.vigente, candidato.proposta];
  let melhor = 0;
  let igual = false;
  for (const texto of fontes) {
    const norm = normalizarTexto(texto);
    if (!norm) continue;
    if (norm === alvo) {
      igual = true;
      melhor = 1;
      continue;
    }
    melhor = Math.max(melhor, coeficiente(tokensAlvo, tokensDe(texto)));
  }
  return { score: Number(melhor.toFixed(3)), igual };
}

/** Melhores correspondências para um dispositivo, ignorando vínculos já registrados. */
export function sugerirVinculos(
  node: DraftNode,
  candidatos: CandidatoVinculo[],
  opcoes?: { limite?: number; minimo?: number },
): SugestaoVinculo[] {
  const limite = opcoes?.limite ?? 3;
  const minimo = opcoes?.minimo ?? 0.55;
  const encontradas: SugestaoVinculo[] = [];
  for (const candidato of candidatos) {
    if (node.vinculos?.includes(candidato.id)) continue;
    const { score, igual } = compararCandidato(node, candidato);
    if (igual || score >= minimo) encontradas.push({ id: candidato.id, score, igual });
  }
  encontradas.sort((a, b) => Number(b.igual) - Number(a.igual) || b.score - a.score);
  return encontradas.slice(0, limite);
}

/**
 * Sugestões para toda a minuta, separadas por confiança: `alta` (igualdade ou
 * score ≥ limiarAlto) pode ser aplicada em lote após prévia; `revisar` fica
 * para confirmação individual. Nós já vinculados não são tocados.
 */
export function sugerirLote(
  draft: Draft,
  candidatos: CandidatoVinculo[],
  opcoes?: { limiarAlto?: number; minimo?: number },
): { alta: SugestaoLote[]; revisar: SugestaoLote[]; semSugestao: string[] } {
  const limiarAlto = opcoes?.limiarAlto ?? 0.85;
  const minimo = opcoes?.minimo ?? 0.55;
  const alta: SugestaoLote[] = [];
  const revisar: SugestaoLote[] = [];
  const semSugestao: string[] = [];
  const visit = (nodes: DraftNode[]) => {
    for (const node of nodes) {
      if (node.text.trim() && !(node.vinculos?.length)) {
        const sugestoes = sugerirVinculos(node, candidatos, { limite: 1, minimo });
        if (!sugestoes.length) semSugestao.push(node.id);
        else if (sugestoes[0].igual || sugestoes[0].score >= limiarAlto) alta.push({ nodeId: node.id, sugestao: sugestoes[0] });
        else revisar.push({ nodeId: node.id, sugestao: sugestoes[0] });
      }
      visit(node.children);
    }
  };
  visit(draft.nodes);
  return { alta, revisar, semSugestao };
}