import { describe, it, expect } from "vitest";
import { MANUAL, buscarSecoes, formarContextoManual } from "../lib/manual";

describe("manual de utilização", () => {
  it("tem seções com id e título únicos e conteúdo não vazio", () => {
    expect(MANUAL.length).toBeGreaterThan(0);
    const ids = MANUAL.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of MANUAL) {
      expect(s.titulo.trim()).toBeTruthy();
      expect(s.markdown.trim().length).toBeGreaterThan(50);
    }
  });

  it("cobre as principais áreas do sistema", () => {
    const texto = MANUAL.map((s) => `${s.titulo} ${s.markdown}`).join(" ").toLowerCase();
    for (const termo of ["painel", "dispositivo", "reuni", "ata", "consolidado", "perfil", "ia"]) {
      expect(texto).toContain(termo);
    }
  });

  it("buscarSecoes sem termo retorna todas", () => {
    expect(buscarSecoes()).toEqual(MANUAL);
    expect(buscarSecoes("  ")).toEqual(MANUAL);
  });

  it("buscarSecoes filtra por termo", () => {
    const atas = buscarSecoes("ata");
    expect(atas.length).toBeGreaterThan(0);
    for (const s of atas) {
      expect(`${s.titulo} ${s.markdown}`.toLowerCase()).toContain("ata");
    }
  });

  it("formarContextoManual monta o bloco com títulos de seção", () => {
    const ctx = formarContextoManual();
    expect(ctx).toContain("## Visão geral e princípios");
    expect(ctx).toContain("Perguntas frequentes");
  });
});