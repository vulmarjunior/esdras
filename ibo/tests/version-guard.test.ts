import { describe, it, expect } from "vitest";
import { avaliarConflito } from "../lib/version-guard";

describe("avaliarConflito (PRD §41 — controle de concorrência)", () => {
  it("sem conflito quando as versões coincidem", () => {
    const r = avaliarConflito(7, 7);
    expect(r.conflito).toBe(false);
    expect(r.mensagem).toBeUndefined();
  });

  it("conflito quando a versão atual avançou", () => {
    const r = avaliarConflito(7, 8);
    expect(r.conflito).toBe(true);
    expect(r.mensagem).toMatch(/foi alterado desde que você iniciou a edição/);
  });

  it("conflito quando a versão atual recuou (dados inconsistentes)", () => {
    const r = avaliarConflito(8, 7);
    expect(r.conflito).toBe(true);
  });

  it("sem conflito na versão 0 inicial", () => {
    expect(avaliarConflito(0, 0).conflito).toBe(false);
    expect(avaliarConflito(0, 1).conflito).toBe(true);
  });
});
