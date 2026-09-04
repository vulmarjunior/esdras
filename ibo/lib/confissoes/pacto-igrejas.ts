import type { Confissao } from "./types";
import dados from "./data/pacto-igrejas.json";

export const PACTO_IGREJAS: Confissao = {
  id: "pacto-igrejas",
  nome: "Pacto das Igrejas Batistas",
  ano: null,
  origem: "Pacto das Igrejas Batistas (texto integral)",
  resumo:
    "Compromisso mútuo firmado pelos membros da igreja batista: unidade no amor cristão, zelo pela doutrina e disciplina, contribuição liberal, devoção pessoal, cuidado mútuo e fidelidade até a morte.",
  itens: dados.itens,
};