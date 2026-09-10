import type { Provision } from "./types";

/** Rótulo exibido para um dispositivo. Módulo puro (sem dependências de banco). */
export function provisionLabel(p: Provision): string {
  const novoTipo = (tipo: string) => `NOVO ${tipo}`;
  const artigoNumero = p.numero && /^\d+$/.test(p.numero)
    ? (Number(p.numero) < 10 ? `${p.numero}º` : p.numero)
    : p.numero;
  switch (p.type) {
    case "capitulo":
      return p.numero ? `Capítulo ${p.numero}` : novoTipo("CAPÍTULO");
    case "secao":
      return p.numero ? `Seção ${p.numero}` : novoTipo("SEÇÃO");
    case "artigo":
      return artigoNumero ? `Art. ${artigoNumero}` : novoTipo("ARTIGO");
    case "paragrafo":
      if (!p.numero) return novoTipo("PARÁGRAFO");
      if (p.numero.toLowerCase() === "único") return "Parágrafo único";
      return `§ ${p.numero}`;
    case "inciso":
      return p.numero ? `${p.numero}` : novoTipo("INCISO");
    case "alinea":
      return p.numero ? `${p.numero.replace(/\)?$/, ")")}` : novoTipo("ALÍNEA");
    default:
      return p.id;
  }
}
