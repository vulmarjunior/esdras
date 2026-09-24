import { describe, it, expect, beforeEach } from "vitest";
import { lerRascunhoSalvo, registrarRascunhoSalvo } from "../lib/draft-cache";

describe("cache de rascunhos salvos", () => {
  beforeEach(() => {
    (globalThis as unknown as { window?: unknown }).window = {};
  });

  it("devolve a última versão confirmada mais nova que a do servidor", () => {
    registrarRascunhoSalvo("art-1", "<p>Editado</p>", 3);
    expect(lerRascunhoSalvo("art-1", 2)).toEqual({ texto: "<p>Editado</p>", versao: 3 });
    expect(lerRascunhoSalvo("art-1", 3)).toEqual({ texto: "<p>Editado</p>", versao: 3 });
  });

  it("descarta o cache quando o servidor já está atualizado", () => {
    registrarRascunhoSalvo("art-1", "<p>Editado</p>", 3);
    expect(lerRascunhoSalvo("art-1", 4)).toBeNull();
    expect(lerRascunhoSalvo("art-1", 0)).toBeNull();
  });

  it("não devolve nada para dispositivo desconhecido", () => {
    expect(lerRascunhoSalvo("art-9", 0)).toBeNull();
  });

  it("sem window (SSR) não registra nem lê", () => {
    (globalThis as unknown as { window?: unknown }).window = undefined;
    registrarRascunhoSalvo("art-2", "<p>x</p>", 1);
    expect(lerRascunhoSalvo("art-2", 0)).toBeNull();
  });
});
