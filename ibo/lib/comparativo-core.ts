/**
 * Montagem do quadro comparativo final (módulo puro).
 *
 * Para cada artigo, na ordem da proposta: número vigente → número proposto,
 * texto vigente × nova redação (com diff por palavras), tipo de alteração,
 * justificativa e status.
 */
import { diffWords, normalizeText, type DiffPart } from "./review-core";
import { provisionLabel } from "./provision-label";

export interface NoComparavel {
  id: string;
  type: string;
  numero: string | null;
  titulo: string | null;
  status: string;
  origem: string;
  alteracao_tipo: string;
  texto_vigente: string;
  proposta_inicial: string;
  redacao_trabalho: string;
  redacao_consolidada: string;
  children: NoComparavel[];
}

export interface LinhaComparativo {
  id: string;
  label: string;
  labelVigente: string | null;
  titulo: string;
  capitulo: string;
  status: string;
  origem: string;
  alteracaoTipo: string;
  justificativa: string;
  propostaInicial: string;
  currentText: string;
  before: string;
  after: string;
  beforeParts: DiffPart[];
  afterParts: DiffPart[];
  alterado: boolean;
  revogado: boolean;
}

/** Texto atual do dispositivo: a redação de trabalho é a fonte principal; a consolidada é marco histórico. */
export function textoAtual(p: {
  redacao_consolidada: string;
  redacao_trabalho: string;
  proposta_inicial: string;
  texto_vigente: string;
}): string {
  return p.redacao_trabalho || p.redacao_consolidada || p.proposta_inicial || p.texto_vigente || "";
}

export function buildComparativo(
  tree: NoComparavel[],
  numerosVigentes: Map<string, string>,
  justificativas: Map<string, string>
): LinhaComparativo[] {
  const linhas: LinhaComparativo[] = [];
  const visitar = (nodes: NoComparavel[], capitulo: string) => {
    for (const n of nodes) {
      const cap = n.type === "capitulo" ? provisionLabel({ ...n, numero: n.numero } as never) : capitulo;
      if (n.type === "artigo") {
        const numeroVigente = numerosVigentes.get(n.id) ?? null;
        const before = normalizeText(n.texto_vigente);
        const after = normalizeText(textoAtual(n));
        const [beforeParts, afterParts] = diffWords(before, after);
        linhas.push({
          id: n.id,
          label: provisionLabel({ ...n, numero: n.numero } as never),
          labelVigente: numeroVigente ? provisionLabel({ ...n, numero: numeroVigente } as never) : null,
          titulo: n.titulo ?? "",
          capitulo: cap,
          status: n.status,
          origem: n.origem,
          alteracaoTipo: n.alteracao_tipo,
          justificativa: normalizeText(justificativas.get(n.id) ?? ""),
          propostaInicial: n.proposta_inicial || "",
          currentText: textoAtual(n),
          before,
          after,
          beforeParts,
          afterParts,
          alterado: before !== after,
          revogado: n.alteracao_tipo === "revogado",
        });
      }
      visitar(n.children, cap);
    }
  };
  visitar(tree, "");
  return linhas;
}
