import type { Confissao } from "./types";
import dados from "./data/principios-batistas.json";

export const PRINCIPIOS_BATISTAS: Confissao = {
  id: "principios-batistas",
  nome: "Declaração de Princípios Batistas",
  ano: null,
  origem: "Princípios históricos batistas de identidade (texto integral)",
  resumo:
    "Os princípios históricos que moldam a identidade batista: a autoridade (Cristo, Escrituras e Espírito), o valor do indivíduo, a vida cristã, a natureza da igreja e a tarefa contínua (culto, ministério, evangelismo, missões, mordomia, ensino e autocrítica).",
  itens: dados.itens,
};