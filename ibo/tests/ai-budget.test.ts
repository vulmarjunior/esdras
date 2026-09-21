import { describe, it, expect } from "vitest";
import { estimarTokens, limitarTexto, orcamentoChars, CHARS_POR_TOKEN } from "../lib/ai-budget";
import { formarContextoAjuda, formarContextoManual } from "../lib/manual";

describe("orçamento de tokens da IA", () => {
  it("estima tokens por caracteres (1 token ≈ 3,5 caracteres)", () => {
    expect(estimarTokens("")).toBe(0);
    expect(estimarTokens("a".repeat(35))).toBe(10);
    expect(estimarTokens("a".repeat(36))).toBe(11);
    expect(orcamentoChars(1000)).toBe(Math.floor(1000 * CHARS_POR_TOKEN));
  });

  it("não altera texto que já cabe no orçamento", () => {
    const texto = "Pergunta curta.";
    expect(limitarTexto(texto, 100)).toBe(texto);
  });

  it("reduz preservando o início e o fim (a pergunta fica no fim)", () => {
    const inicio = "CONTEXTO ".repeat(50);
    const pergunta = "PERGUNTA: qual é o prazo?";
    const texto = inicio + "MEIO ".repeat(500) + pergunta;
    const limitado = limitarTexto(texto, 400);
    expect(limitado.length).toBeLessThanOrEqual(400);
    expect(limitado).toContain("CONTEXTO");
    expect(limitado).toContain(pergunta);
    expect(limitado).toContain("conteúdo reduzido");
  });

  it("orçamento zero devolve vazio", () => {
    expect(limitarTexto("texto", 0)).toBe("");
  });
});

describe("contexto de ajuda", () => {
  it("seleciona as seções relevantes e reduz o tamanho", () => {
    const completo = formarContextoManual();
    const focado = formarContextoAjuda("como funciona a renumeração e as referências?");
    expect(focado.length).toBeLessThan(completo.length);
    expect(focado.toLowerCase()).toContain("renumera");
  });

  it("sem correspondência, devolve o manual completo", () => {
    const contexto = formarContextoAjuda("zzzzz");
    expect(contexto).toBe(formarContextoManual());
  });
});
