/**
 * Guia curado de técnica legislativa (Lei Complementar nº 95/1998) e de
 * redação oficial (Manual de Redação da Presidência da República).
 *
 * Módulo puro (sem banco): usado no servidor (prompts de IA) e na página
 * `/guia-redacao`. Resumo prático para consulta rápida — para uso formal,
 * sempre consultar o texto oficial das fontes.
 */

export type FonteRef = "lc95" | "mrpr";

export interface RegraRef {
  id: string;
  fonte: FonteRef;
  secao: string;
  regra: string;
}

export const FONTE_LABELS: Record<FonteRef, string> = {
  lc95: "Lei Complementar nº 95/1998 — técnica legislativa",
  mrpr: "Manual de Redação da Presidência da República — redação oficial",
};

export const GUIA: RegraRef[] = [
  // Lei Complementar nº 95/1998
  {
    id: "lc95-objeto",
    fonte: "lc95",
    secao: "Objeto único",
    regra:
      "A norma trata de um único objeto; vedada a vinculação ou conexão entre matérias diferentes (LC 95, art. 7).",
  },
  {
    id: "lc95-artigo-unico-assunto",
    fonte: "lc95",
    secao: "Estrutura do artigo",
    regra:
      "Cada artigo deve tratar de um único assunto ou princípio (LC 95, art. 11, III).",
  },
  {
    id: "lc95-numeracao-artigo",
    fonte: "lc95",
    secao: "Numeração",
    regra:
      "Artigos são indicados por 'Art.', com numeração ordinal até o nono ('Art. 1º', 'Art. 9º') e cardinal a partir do décimo ('Art. 10', 'Art. 15') (LC 95, art. 10, I).",
  },
  {
    id: "lc95-paragrafo-unicos",
    fonte: "lc95",
    secao: "Parágrafos",
    regra:
      "Um único parágrafo → 'Parágrafo único'; mais de um → '§ 1º', '§ 2º', ... (LC 95, art. 10, II e § 1º).",
  },
  {
    id: "lc95-incisos-alineas",
    fonte: "lc95",
    secao: "Incisos, alíneas e itens",
    regra:
      "Desdobramentos: incisos com 'I, II, III', alíneas com 'a), b), c)', itens com '1., 2., 3.' — usar somente quando a subdivisão for necessária (LC 95, art. 10, II a IV e § 2º).",
  },
  {
    id: "lc95-clareza",
    fonte: "lc95",
    secao: "Clareza",
    regra:
      "Redigir com clareza, precisão e ordem lógica: palavras em acepção comum, frases curtas e concisas, orações em ordem direta, uniformidade do tempo verbal (LC 95, art. 11, II).",
  },
  {
    id: "lc95-precisao",
    fonte: "lc95",
    secao: "Precisão",
    regra:
      "Evitar expressões ou palavras que confiram duplo sentido; evitar preciosismos, neologismos e adjetivações dispensáveis (LC 95, art. 11, II).",
  },
  {
    id: "lc95-estrutura",
    fonte: "lc95",
    secao: "Divisão do documento",
    regra:
      "Usar títulos, capítulos, seções e subseções somente quando a matéria justificar a divisão — não dividir sem necessidade (LC 95, art. 12).",
  },
  {
    id: "lc95-remissao",
    fonte: "lc95",
    secao: "Remissões",
    regra:
      "Ao remeter a outro dispositivo, indicar a referência completa (ex.: 'art. 1º, § 2º, inciso I') e evitar repetir o texto já existente em outro dispositivo.",
  },

  // Manual de Redação da Presidência da República
  {
    id: "mrpr-padrao-culto",
    fonte: "mrpr",
    secao: "Padrão culto",
    regra:
      "Usar o padrão culto da língua, com correção gramatical, de pontuação e de concordância.",
  },
  {
    id: "mrpr-impessoalidade",
    fonte: "mrpr",
    secao: "Impessoalidade",
    regra:
      "Redação impessoal e uniforme: o foco é a informação e o órgão, não a pessoa; evitar tom pessoal.",
  },
  {
    id: "mrpr-ordem-direta",
    fonte: "mrpr",
    secao: "Clareza",
    regra:
      "Preferir ordem direta (sujeito → verbo → complemento), frases curtas e parágrafos curtos.",
  },
  {
    id: "mrpr-concisao",
    fonte: "mrpr",
    secao: "Concisão",
    regra:
      "Ser conciso: eliminar palavras e expressões supérfluas e evitar repetições desnecessárias.",
  },
  {
    id: "mrpr-uniformidade-termos",
    fonte: "mrpr",
    secao: "Uniformidade",
    regra:
      "Usar o mesmo termo para a mesma realidade em todo o documento; não alternar sinônimos para o mesmo conceito.",
  },
  {
    id: "mrpr-formalidade",
    fonte: "mrpr",
    secao: "Formalidade",
    regra:
      "Manter tom formal e uniforme; evitar coloquialismos, jargões e gírias.",
  },
  {
    id: "mrpr-tempo-verbal",
    fonte: "mrpr",
    secao: "Tempo verbal",
    regra:
      "Manter a uniformidade do tempo e do modo verbal no documento (ex.: presente normativo 'deve', 'deverá').",
  },
  {
    id: "mrpr-bem-como",
    fonte: "mrpr",
    secao: "Precisão",
    regra:
      "Evitar o uso de 'bem como' para conectar itens de uma enumeração, pois gera ambiguidade sobre a extensão da lista.",
  },
];

/** Monta o bloco de referência pronto para ser injetado nos prompts de IA. */
export function formarGuia(): string {
  const bloco = (fonte: FonteRef) => {
    const itens = GUIA.filter((r) => r.fonte === fonte);
    return `[${FONTE_LABELS[fonte]}]\n${itens.map((r) => `- ${r.regra}`).join("\n")}`;
  };
  return [bloco("lc95"), bloco("mrpr")].join("\n\n");
}

/** Filtra as regras por termo (regra, seção ou fonte); sem termo, retorna todas. */
export function buscarRegras(termo?: string): RegraRef[] {
  const t = (termo || "").trim().toLowerCase();
  if (!t) return GUIA;
  return GUIA.filter((r) => {
    const fonte = FONTE_LABELS[r.fonte].toLowerCase();
    return `${r.regra} ${r.secao} ${fonte}`.toLowerCase().includes(t);
  });
}