import { describe, it, expect } from "vitest";
import { compararEstados, type EstadoMarco, type MarcoProvision } from "../lib/marcos-core";

function p(overrides: Partial<MarcoProvision> & { id: string }): MarcoProvision {
  return {
    parent_id: null,
    type: "artigo",
    numero: "1º",
    titulo: null,
    ordem: 0,
    ordem_pai: 0,
    origem: "original",
    origem_ref_id: null,
    sem_origem: 0,
    alteracao_tipo: "nao_avaliado",
    status: "nao_iniciado",
    texto_vigente: "",
    proposta_inicial: "",
    redacao_trabalho: "",
    justificativa: "",
    redacao_consolidada: "",
    posicao_sugerida: null,
    deleted_at: null,
    deleted_by: null,
    acordo_version: null,
    acordo_em: null,
    acordo_por: null,
    ...overrides,
  };
}

function estado(overrides: Partial<EstadoMarco> = {}): EstadoMarco {
  return { provisions: [], placements: [], correspondencias: [], ...overrides };
}

describe("compararEstados", () => {
  it("detecta criados, retirados e restaurados", () => {
    const anterior = estado({ provisions: [p({ id: "a" }), p({ id: "b", deleted_at: null })] });
    const atual = estado({
      provisions: [
        p({ id: "a", deleted_at: "2026-09-23 10:00:00" }),
        p({ id: "b", deleted_at: null }),
        p({ id: "c" }),
      ],
    });
    const tipos = compararEstados(anterior, atual);
    expect(tipos.find((d) => d.provision_id === "a")?.tipo).toBe("retirado");
    expect(tipos.find((d) => d.provision_id === "c")?.tipo).toBe("adicionado");
    expect(tipos.some((d) => d.provision_id === "b")).toBe(false);
  });

  it("detecta restauração e alterações de texto, status e posição", () => {
    const anterior = estado({
      provisions: [
        p({ id: "a", deleted_at: "2026-09-22 10:00:00" }),
        p({ id: "b", redacao_trabalho: "<p>Antigo</p>", status: "em_analise" }),
      ],
      placements: [
        { provision_id: "b", parent_id: "cap-1", numero: "1º", titulo: null, ordem_pai: 0 },
      ],
    });
    const atual = estado({
      provisions: [
        p({ id: "a", deleted_at: null }),
        p({ id: "b", redacao_trabalho: "<p>Novo</p>", status: "aprovado" }),
      ],
      placements: [
        { provision_id: "b", parent_id: "cap-2", numero: "1º", titulo: null, ordem_pai: 3 },
      ],
    });
    const diferencas = compararEstados(anterior, atual);
    expect(diferencas.find((d) => d.provision_id === "a")?.tipo).toBe("restaurado");
    const b = diferencas.filter((d) => d.provision_id === "b").map((d) => d.tipo);
    expect(b).toContain("texto");
    expect(b).toContain("status");
    expect(b).toContain("posicao");
  });

  it("detecta correspondências adicionadas e removidas", () => {
    const anterior = estado({
      provisions: [p({ id: "a" }), p({ id: "v1" }), p({ id: "v2" })],
      correspondencias: [
        { provision_id: "a", vigente_id: "v1", tipo: "relacionado", observacao: null },
      ],
    });
    const atual = estado({
      provisions: [p({ id: "a" }), p({ id: "v1" }), p({ id: "v2" })],
      correspondencias: [
        { provision_id: "a", vigente_id: "v2", tipo: "desmembrado", observacao: null },
      ],
    });
    const correspondencias = compararEstados(anterior, atual).filter((d) => d.tipo === "correspondencia");
    expect(correspondencias).toHaveLength(2);
    expect(correspondencias.some((d) => d.detalhe.includes("adicionado"))).toBe(true);
    expect(correspondencias.some((d) => d.detalhe.includes("não está mais registrado"))).toBe(true);
  });

  it("estado igual não gera diferenças e a ordem é estável", () => {
    const anterior = estado({ provisions: [p({ id: "a" }), p({ id: "b" })] });
    expect(compararEstados(anterior, estado({ provisions: [p({ id: "a" }), p({ id: "b" })] }))).toEqual([]);

    const comDiferencas = compararEstados(
      estado({ provisions: [p({ id: "b", redacao_trabalho: "x" })] }),
      estado({ provisions: [p({ id: "b", redacao_trabalho: "y" }), p({ id: "a" })] }),
    );
    expect(comDiferencas[0].tipo).toBe("adicionado");
  });
});
