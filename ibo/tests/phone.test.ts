import { describe, it, expect } from "vitest";
import { somenteDigitos, normalizarTelefone, formatarTelefone, whatsappLink, telefoneValido } from "../lib/phone";

describe("somenteDigitos", () => {
  it("remove máscara e símbolos", () => {
    expect(somenteDigitos("(69) 99999-9999")).toBe("69999999999");
    expect(somenteDigitos("+55 69 99999-9999")).toBe("5569999999999");
    expect(somenteDigitos(null)).toBe("");
    expect(somenteDigitos("")).toBe("");
  });
});

describe("normalizarTelefone", () => {
  it("completa com 55 quando falta DDI", () => {
    expect(normalizarTelefone("(69) 99999-9999")).toBe("5569999999999");
    expect(normalizarTelefone("69 99999-9999")).toBe("5569999999999");
    expect(normalizarTelefone("(69) 3211-0000")).toBe("556932110000");
  });

  it("mantém quando já vem com 55", () => {
    expect(normalizarTelefone("+55 69 99999-9999")).toBe("5569999999999");
  });

  it("rejeita números inválidos", () => {
    expect(normalizarTelefone("9999")).toBe("");
    expect(normalizarTelefone("")).toBe("");
    expect(normalizarTelefone(null)).toBe("");
    expect(normalizarTelefone("1234567890123456")).toBe("");
  });
});

describe("formatarTelefone", () => {
  it("formata para exibição brasileira", () => {
    expect(formatarTelefone("5569999999999")).toBe("(69) 99999-9999");
    expect(formatarTelefone("(69) 99999-9999")).toBe("(69) 99999-9999");
    expect(formatarTelefone("556932110000")).toBe("(69) 3211-0000");
  });
});

describe("whatsappLink", () => {
  it("gera link wa.me com DDI", () => {
    expect(whatsappLink("(69) 99999-9999")).toBe("https://wa.me/5569999999999");
  });

  it("retorna null para telefone inválido", () => {
    expect(whatsappLink("123")).toBeNull();
    expect(whatsappLink(null)).toBeNull();
  });
});

describe("telefoneValido", () => {
  it("valida formatos comuns", () => {
    expect(telefoneValido("(69) 99999-9999")).toBe(true);
    expect(telefoneValido("+55 69 99999-9999")).toBe(true);
    expect(telefoneValido("abc")).toBe(false);
    expect(telefoneValido("")).toBe(false);
  });
});
