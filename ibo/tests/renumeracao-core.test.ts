import { describe, expect, it } from "vitest";
import { ordinalArtigo, parseNumeroArtigo, renumerar, toRoman } from "../lib/renumeracao-core";

describe("ordinalArtigo", () => {
  it("formata ordinais em português", () => {
    expect(ordinalArtigo(1)).toBe("1º");
    expect(ordinalArtigo(26)).toBe("26º");
    expect(ordinalArtigo(33)).toBe("33º");
  });
});

describe("parseNumeroArtigo", () => {
  it("extrai o inteiro de números de artigo", () => {
    expect(parseNumeroArtigo("5º")).toBe(5);
    expect(parseNumeroArtigo("26")).toBe(26);
    expect(parseNumeroArtigo("1º")).toBe(1);
  });
  it("retorna null para nulos/inválidos", () => {
    expect(parseNumeroArtigo(null)).toBeNull();
    expect(parseNumeroArtigo("")).toBeNull();
    expect(parseNumeroArtigo("NOVO")).toBeNull();
  });
});

describe("renumerar", () => {
  it("atribui numeração sequencial na ordem dada", () => {
    const map = renumerar(["a", "b", "c"]);
    expect(map.get("a")).toBe("1º");
    expect(map.get("b")).toBe("2º");
    expect(map.get("c")).toBe("3º");
  });
});

describe("toRoman", () => {
  it("converte números para algarismos romanos", () => {
    expect(toRoman(1)).toBe("I");
    expect(toRoman(4)).toBe("IV");
    expect(toRoman(7)).toBe("VII");
    expect(toRoman(10)).toBe("X");
    expect(toRoman(44)).toBe("XLIV");
  });
});