import { describe, it, expect } from "vitest";
import {
  CORRESPONDENCIA_TIPOS,
  TIPOS_COM_VINCULO,
  TIPOS_DECLARACAO,
  rotuloCorrespondencia,
  tipoCorrespondenciaValido,
  validarCorrespondencia,
} from "../lib/correspondencias";

describe("validarCorrespondencia", () => {
  it("exige dispositivo vinculado nos tipos de vínculo", () => {
    for (const tipo of TIPOS_COM_VINCULO) {
      expect(validarCorrespondencia(tipo, null)).toMatch(/exige/);
      expect(validarCorrespondencia(tipo, "art-1")).toBeNull();
    }
  });

  it("acréscimo e não aplicável dispensam vínculo e o recusam", () => {
    for (const tipo of TIPOS_DECLARACAO) {
      expect(validarCorrespondencia(tipo, null)).toBeNull();
      expect(validarCorrespondencia(tipo, "art-1")).toMatch(/não levam/);
    }
  });

  it("recusa tipo desconhecido", () => {
    expect(validarCorrespondencia("inventado", null)).toBeTruthy();
    expect(tipoCorrespondenciaValido("inventado")).toBe(false);
  });

  it("todo tipo tem rótulo", () => {
    for (const tipo of CORRESPONDENCIA_TIPOS) {
      expect(rotuloCorrespondencia(tipo)).toBeTruthy();
      expect(rotuloCorrespondencia(tipo)).not.toBe(tipo);
    }
  });
});
