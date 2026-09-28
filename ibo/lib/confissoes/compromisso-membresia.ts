import type { Confissao } from "./types";
import dados from "./data/compromisso-membresia.json";

export const COMPROMISSO_MEMBRESIA: Confissao = {
  id: "compromisso-membresia",
  nome: "Compromisso de Membresia — versão integral (minuta consolidada)",
  ano: null,
  origem:
    "Compromisso de Membresia da Igreja Batista Olaria — minuta consolidada apresentada para apreciação e aprovação da Assembleia dos Membros (sugestão em apreciação pela comissão).",
  resumo:
    "Minuta consolidada do Compromisso de Membresia da Igreja Batista Olaria: fundamentos da nossa fé, compromisso com a santidade e a conduta cristã, compromissos com a vida da igreja e declaração pública de compromisso, submetida à apreciação da comissão e da assembleia.",
  grupo: "Compromissos de membresia",
  itens: dados.itens,
};