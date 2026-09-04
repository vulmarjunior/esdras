import type { Confissao } from "./types";
import dados from "./data/cbb-declaracao.json";

export const CBB_DECLARACAO: Confissao = {
  id: "cbb-declaracao",
  nome: "Declaração Doutrinária da Convenção Batista Brasileira",
  ano: 1985,
  origem: "Declaração Doutrinária da Convenção Batista Brasileira (aprovada em 1985), texto integral",
  resumo:
    "Declaração doutrinária dos batistas brasileiros, elaborada por comissão da CBB e aprovada em 1985, com 19 artigos sobre Escrituras, Deus, homem, pecado, salvação, eleição, reino de Deus, igreja, ordenanças e vida cristã.",
  itens: dados.itens,
};