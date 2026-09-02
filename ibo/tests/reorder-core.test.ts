import { describe, it, expect } from "vitest";
import { inserirApos, podeMover, validarMovimento, type NoEstrutural } from "../lib/reorder-core";

describe("podeMover", () => {
  it("aceita artigo dentro de capitulo e secao", () => {
    expect(podeMover("artigo", "capitulo")).toBe(true);
    expect(podeMover("artigo", "secao")).toBe(true);
  });

  it("aceita qualquer tipo na raiz", () => {
    expect(podeMover("artigo", null)).toBe(true);
    expect(podeMover("capitulo", null)).toBe(true);
    expect(podeMover("alinea", null)).toBe(true);
  });

  it("rejeita combinações fora da hierarquia", () => {
    expect(podeMover("artigo", "artigo")).toBe(false);
    expect(podeMover("capitulo", "capitulo")).toBe(false);
    expect(podeMover("secao", "artigo")).toBe(false);
    expect(podeMover("artigo", "paragrafo")).toBe(false);
    expect(podeMover("inciso", "secao")).toBe(false);
  });

  it("aceita filhos válidos de artigo", () => {
    expect(podeMover("paragrafo", "artigo")).toBe(true);
    expect(podeMover("inciso", "artigo")).toBe(true);
    expect(podeMover("alinea", "inciso")).toBe(true);
    expect(podeMover("inciso", "paragrafo")).toBe(true);
  });
});

describe("inserirApos", () => {
  it("insere no início quando afterId é null", () => {
    expect(inserirApos(["a", "b", "c"], "x", null)).toEqual(["x", "a", "b", "c"]);
  });

  it("insere após um irmão específico", () => {
    expect(inserirApos(["a", "b", "c"], "b", "a")).toEqual(["a", "b", "c"]);
    expect(inserirApos(["a", "b", "c"], "a", "b")).toEqual(["b", "a", "c"]);
    expect(inserirApos(["a", "b", "c"], "c", "b")).toEqual(["a", "b", "c"]);
  });

  it("remove o movedId da lista antes de reinserir", () => {
    expect(inserirApos(["a", "b", "c"], "b", "c")).toEqual(["a", "c", "b"]);
  });

  it("anexa ao final se afterId não é irmão (defensivo)", () => {
    expect(inserirApos(["a", "b"], "x", "zzz")).toEqual(["a", "b", "x"]);
  });
});

function nos(map: Record<string, [string, string | null]>): Map<string, NoEstrutural> {
  const m = new Map<string, NoEstrutural>();
  for (const [id, [type, parent]] of Object.entries(map)) {
    m.set(id, { id, type: type as NoEstrutural["type"], parent_id: parent });
  }
  return m;
}

describe("validarMovimento", () => {
  const base = nos({
    "cap-1": ["capitulo", null],
    "cap-2": ["capitulo", null],
    "a1": ["artigo", "cap-1"],
    "a2": ["artigo", "cap-1"],
    "a3": ["artigo", "cap-2"],
    "p1": ["paragrafo", "a1"],
  });

  it("aceita mover artigo entre capítulos", () => {
    expect(validarMovimento(base, "a1", "cap-2", "a3")).toBeNull();
  });

  it("aceita mover artigo para a raiz", () => {
    expect(validarMovimento(base, "a1", null, null)).toBeNull();
  });

  it("aceita reordenar dentro do mesmo pai", () => {
    expect(validarMovimento(base, "a2", "cap-1", null)).toBeNull();
    expect(validarMovimento(base, "a2", "cap-1", "a1")).toBeNull();
  });

  it("rejeita mover para dentro de si mesmo", () => {
    expect(validarMovimento(base, "a1", "a1", null)).toMatch(/si mesmo/);
  });

  it("rejeita capítulo fora da raiz", () => {
    expect(validarMovimento(base, "cap-2", "cap-1", null)).toMatch(/raiz/);
  });

  it("rejeita hierarquia inválida", () => {
    expect(validarMovimento(base, "a1", "a2", null)).toMatch(/não é possível/i);
  });

  it("rejeita ciclo (destino dentro do próprio dispositivo)", () => {
    const corrompido = nos({
      "a1": ["artigo", "p1"],
      "p1": ["paragrafo", "a1"],
    });
    expect(validarMovimento(corrompido, "p1", "a1", null)).toMatch(/destino está dentro|si mesmo/);
  });

  it("rejeita afterId que não é irmão do destino", () => {
    expect(validarMovimento(base, "a1", "cap-2", "a2")).toMatch(/mesmo destino/);
  });

  it("rejeita mover após si mesmo", () => {
    expect(validarMovimento(base, "a1", "cap-1", "a1")).toMatch(/si mesmo/);
  });

  it("rejeita dispositivo inexistente", () => {
    expect(validarMovimento(base, "ghost", "cap-1", null)).toMatch(/não encontrado/);
  });
});
