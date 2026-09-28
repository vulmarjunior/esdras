import type { Confissao } from "./types";
import dados from "./data/compromisso-membresia-criancas.json";

export const COMPROMISSO_MEMBRESIA_CRIANCAS: Confissao = {
  id: "compromisso-membresia-criancas",
  nome: "Compromisso de Membresia — crianças e adolescentes",
  ano: null,
  origem:
    "Versão adaptada do Compromisso de Membresia, em linguagem simples, para candidatos menores de idade que professam pessoalmente a fé (sugestão em apreciação pela comissão).",
  resumo:
    "Minuta de linguagem adaptada do Compromisso de Membresia para crianças e adolescentes: a fé em Jesus Cristo, o compromisso com a Bíblia, o batismo e a participação na igreja, a vida que agrada a Deus, o respeito ao corpo, o casamento e a família, os irmãos da igreja, o crescimento na fé e a correção fraterna, com termo dos responsáveis legais e orientação de aplicação à comissão.",
  grupo: "Compromissos de membresia",
  itens: dados.itens,
};