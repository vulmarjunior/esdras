import type { Provision } from "./types";

/** Rótulo exibido para um dispositivo. Módulo puro (sem dependências de banco). */
export function provisionLabel(p: Provision): string {
  const novoTipo = (tipo: string) => `NOVO ${tipo}`;
  switch (p.type) {
    case "capitulo":
      return p.numero ? `Capítulo ${p.numero}` : novoTipo("CAPÍTULO");
    case "secao":
      return p.numero ? `Seção ${p.numero}` : novoTipo("SEÇÃO");
    case "artigo":
      return p.numero ? `Art. ${p.numero}` : novoTipo("ARTIGO");
    case "paragrafo":
      return p.numero ? `Parágrafo ${p.numero}` : novoTipo("PARÁGRAFO");
    case "inciso":
      return p.numero ? `${p.numero}` : novoTipo("INCISO");
    case "alinea":
      return p.numero ? `Alínea ${p.numero}` : novoTipo("ALÍNEA");
    default:
      return p.id;
  }
}