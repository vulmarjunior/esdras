import { describe, it, expect } from "vitest";
import {
  GUIA,
  formarGuia,
  buscarRegras,
  type FonteRef,
} from "../lib/legal-refs";

describe("guia de redação (LC 95/1998 + Manual de Redação)", () => {
  it("guia não é vazio e cobre as duas fontes", () => {
    expect(GUIA.length).toBeGreaterThan(0);
    expect(new Set(GUIA.map((r) => r.fonte))).toEqual(new Set<FonteRef>(["lc95", "mrpr"]));
  });

  it("ids são únicos e regras têm seção e fonte válidas", () => {
    const ids = GUIA.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const r of GUIA) {
      expect(r.secao.trim()).toBeTruthy();
      expect(["lc95", "mrpr"]).toContain(r.fonte);
      expect(r.regra.trim()).toBeTruthy();
    }
  });

  it("formarGuia monta bloco com as duas fontes", () => {
    const guia = formarGuia();
    expect(guia).toContain("Lei Complementar nº 95/1998");
    expect(guia).toContain("Manual de Redação da Presidência da República");
  });

  it("buscarRegras sem termo retorna todas", () => {
    expect(buscarRegras()).toEqual(GUIA);
    expect(buscarRegras("  ")).toEqual(GUIA);
  });

  it("buscarRegras filtra por termo", () => {
    const paragrafo = buscarRegras("parágrafo único");
    expect(paragrafo.length).toBeGreaterThan(0);
    for (const r of paragrafo) {
      expect(`${r.regra} ${r.secao}`.toLowerCase()).toContain("parágrafo único".toLowerCase());
    }
  });

  it("buscarRegras filtra também pela fonte", () => {
    const mrpr = buscarRegras("manual de redação");
    expect(mrpr.length).toBeGreaterThan(0);
    for (const r of mrpr) expect(r.fonte).toBe("mrpr");
  });
});