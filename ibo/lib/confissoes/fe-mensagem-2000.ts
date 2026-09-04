import type { Confissao } from "./types";
import dados from "./data/fe-mensagem-2000.json";

export const FE_MENSAGEM_2000: Confissao = {
  id: "fe-mensagem-2000",
  nome: "A Fé e a Mensagem Batista",
  ano: 2000,
  origem: "A Fé e a Mensagem Batista (2000), Convenção Batista do Sul (EUA), versão 2000 (bfm.sbc.net)",
  resumo:
    "Declaração de fé da Convenção Batista do Sul, na versão de 2000, com 18 artigos sobre Escrituras, Deus, homem, salvação, eleição, igreja, batismo e ceia, dia do Senhor, reino, últimas coisas, missões, educação, mordomia, cooperação, ordem social, paz e guerra, liberdade religiosa e família.",
  itens: dados.itens,
};