import { describe, expect, it } from "vitest";
import { cleanExtractedText } from "../lib/extraction-cleanup";

describe("cleanExtractedText", () => {
  it("separa palavras coladas e preserva HTML", () => {
    expect(cleanExtractedText("<mark>daIgreja</mark> eextraordinárias o§ 1º")).toBe("<mark>da Igreja</mark> e extraordinárias o § 1º");
  });
  it("corrige número de registro sem alterar atributos", () => {
    expect(cleanExtractedText('<span data-id="nº04">nº04.771</span>')).toBe('<span data-id="nº04">nº 04.771</span>');
  });
});
