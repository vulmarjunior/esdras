import { describe, it, expect } from "vitest";
import { detectarMencoes, substituirMencoes, numeroDoRotulo } from "../lib/referencias-core";

describe("detectarMencoes", () => {
  it("encontra menções a artigos em variações de escrita", () => {
    const texto = "Nos termos do Art. 5º e do artigo 12, bem como do art. 3 desta Lei.";
    const mencoes = detectarMencoes(texto);
    expect(mencoes.map((m) => m.numero)).toEqual([5, 12, 3]);
  });

  it("não confunde números que não são de artigo", () => {
    const mencoes = detectarMencoes("Lei 8.666/93, inciso II, alínea b, 30 dias.");
    expect(mencoes).toHaveLength(0);
  });

  it("inclui um trecho de contexto", () => {
    const mencoes = detectarMencoes("Conforme previsto no Art. 7º, o prazo é de 30 dias.");
    expect(mencoes[0].trecho).toContain("Art. 7º");
  });
});

describe("substituirMencoes", () => {
  it("troca apenas o número alvo, preservando o prefixo", () => {
    const r = substituirMencoes("O Art. 5º remete ao artigo 12 e ao Art. 5º de novo.", 5, "26º");
    expect(r.trocas).toBe(2);
    expect(r.texto).toBe("O Art. 26º remete ao artigo 12 e ao Art. 26º de novo.");
  });

  it("não altera quando o número não aparece", () => {
    const r = substituirMencoes("O Art. 9º remete ao artigo 12.", 5, "26º");
    expect(r.trocas).toBe(0);
    expect(r.texto).toBe("O Art. 9º remete ao artigo 12.");
  });

  it("funciona com HTML", () => {
    const r = substituirMencoes("<p>Ver <strong>Art. 10</strong>, caput.</p>", 10, "9º");
    expect(r.trocas).toBe(1);
    expect(r.texto).toBe("<p>Ver <strong>Art. 9º</strong>, caput.</p>");
  });
});

describe("numeroDoRotulo", () => {
  it("extrai o inteiro de rótulos", () => {
    expect(numeroDoRotulo("26º")).toBe(26);
    expect(numeroDoRotulo("5")).toBe(5);
    expect(numeroDoRotulo(null)).toBeNull();
    expect(numeroDoRotulo("IV")).toBeNull();
  });
});
