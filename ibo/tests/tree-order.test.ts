import { describe, it, expect } from "vitest";
import { RANK_TIPO, compararIrmaos, ordenarIrmaos } from "../lib/tree-order";

describe("RANK_TIPO", () => {
  it("define precedência: capitulo < secao < artigo < inciso < paragrafo < alinea", () => {
    expect(RANK_TIPO.capitulo).toBeLessThan(RANK_TIPO.secao);
    expect(RANK_TIPO.secao).toBeLessThan(RANK_TIPO.artigo);
    expect(RANK_TIPO.artigo).toBeLessThan(RANK_TIPO.inciso);
    expect(RANK_TIPO.inciso).toBeLessThan(RANK_TIPO.paragrafo);
    expect(RANK_TIPO.paragrafo).toBeLessThan(RANK_TIPO.alinea);
  });
});

describe("compararIrmaos", () => {
  it("coloca incisos antes de parágrafos", () => {
    const paragrafo = { type: "paragrafo" as const, ordem_pai: 0 };
    const inciso = { type: "inciso" as const, ordem_pai: 1 };
    expect(compararIrmaos(inciso, paragrafo)).toBeLessThan(0);
    expect(compararIrmaos(paragrafo, inciso)).toBeGreaterThan(0);
  });

  it("mantém ordem_pai como desempate dentro do mesmo tipo", () => {
    const a = { type: "inciso" as const, ordem_pai: 2 };
    const b = { type: "inciso" as const, ordem_pai: 5 };
    expect(compararIrmaos(a, b)).toBeLessThan(0);
    expect(compararIrmaos(b, a)).toBeGreaterThan(0);
  });

  it("alíneas vêm depois de parágrafos e incisos", () => {
    const alinea = { type: "alinea" as const, ordem_pai: 0 };
    const paragrafo = { type: "paragrafo" as const, ordem_pai: 0 };
    const inciso = { type: "inciso" as const, ordem_pai: 0 };
    expect(compararIrmaos(inciso, alinea)).toBeLessThan(0);
    expect(compararIrmaos(paragrafo, alinea)).toBeLessThan(0);
  });

  it("capítulos precedem artigos na raiz", () => {
    const artigo = { type: "artigo" as const, ordem_pai: 1 };
    const capitulo = { type: "capitulo" as const, ordem_pai: 0 };
    expect(compararIrmaos(capitulo, artigo)).toBeLessThan(0);
  });
});

describe("ordenarIrmaos", () => {
  it("agrupa incisos antes de parágrafos preservando a ordem relativa", () => {
    const filhos = [
      { id: "inc-2", type: "inciso" as const, ordem_pai: 1 },
      { id: "p-1", type: "paragrafo" as const, ordem_pai: 2 },
      { id: "inc-1", type: "inciso" as const, ordem_pai: 0 },
      { id: "p-2", type: "paragrafo" as const, ordem_pai: 3 },
    ];
    const out = ordenarIrmaos(filhos).map((f) => f.id);
    expect(out).toEqual(["inc-1", "inc-2", "p-1", "p-2"]);
  });

  it("mantém a ordem original quando já está agrupado por tipo", () => {
    const filhos = [
      { id: "i1", type: "inciso" as const, ordem_pai: 0 },
      { id: "i2", type: "inciso" as const, ordem_pai: 1 },
      { id: "p1", type: "paragrafo" as const, ordem_pai: 2 },
      { id: "p2", type: "paragrafo" as const, ordem_pai: 3 },
    ];
    expect(ordenarIrmaos(filhos).map((f) => f.id)).toEqual(["i1", "i2", "p1", "p2"]);
  });

  it("não muta o array original", () => {
    const filhos = [
      { id: "p1", type: "paragrafo" as const, ordem_pai: 0 },
      { id: "i1", type: "inciso" as const, ordem_pai: 1 },
    ];
    const antes = JSON.stringify(filhos);
    ordenarIrmaos(filhos);
    expect(JSON.stringify(filhos)).toBe(antes);
  });

  it("não reordena por número — originais e propostas mantêm a posição física", () => {
    // §4º/§5º (originais, ordem_pai menor) vêm antes de §1º–§3º (novos): a
    // ordem é definida pela posição, não pelo número.
    const filhos = [
      { id: "p4-orig", type: "paragrafo" as const, ordem_pai: 6, numero: "4º" },
      { id: "p5-orig", type: "paragrafo" as const, ordem_pai: 7, numero: "5º" },
      { id: "p1-novo", type: "paragrafo" as const, ordem_pai: 8, numero: "1º" },
      { id: "p2-novo", type: "paragrafo" as const, ordem_pai: 9, numero: "2º" },
      { id: "p3-novo", type: "paragrafo" as const, ordem_pai: 10, numero: "3º" },
    ];
    const out = ordenarIrmaos(filhos).map((f) => f.id);
    expect(out).toEqual(["p4-orig", "p5-orig", "p1-novo", "p2-novo", "p3-novo"]);
  });

  it("separa parágrafos intercalados entre incisos", () => {
    // Simula o art-8: incisos I–VI, §4º/§5º no meio, inciso VII depois.
    const filhos = [
      { id: "inc-6", type: "inciso" as const, ordem_pai: 5 },
      { id: "p4", type: "paragrafo" as const, ordem_pai: 6 },
      { id: "p5", type: "paragrafo" as const, ordem_pai: 7 },
      { id: "inc-7", type: "inciso" as const, ordem_pai: 8 },
    ];
    const out = ordenarIrmaos(filhos).map((f) => f.id);
    expect(out).toEqual(["inc-6", "inc-7", "p4", "p5"]);
  });
});