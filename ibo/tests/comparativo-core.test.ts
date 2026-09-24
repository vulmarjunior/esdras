import { describe, it, expect } from "vitest";
import { buildComparativo, textoAtual, type NoComparavel } from "../lib/comparativo-core";

function no(parcial: Partial<NoComparavel> & { id: string; type: string }): NoComparavel {
  return {
    numero: null,
    titulo: null,
    status: "nao_iniciado",
    origem: "original",
    alteracao_tipo: "nao_avaliado",
    texto_vigente: "",
    proposta_inicial: "",
    redacao_trabalho: "",
    redacao_consolidada: "",
    children: [],
    ...parcial,
  };
}

const ARVORE: NoComparavel[] = [
  no({
    id: "cap-1",
    type: "capitulo",
    numero: "I",
    titulo: "DA IGREJA",
    children: [
      no({
        id: "art-6",
        type: "artigo",
        numero: "5º",
        titulo: "Dos membros",
        texto_vigente: "<p>Art. 6º A igreja é constituída por pessoas.</p>",
        redacao_trabalho: "<p>Art. 5º A igreja é constituída por membros batizados.</p>",
        status: "aprovado",
      }),
      no({
        id: "art-5",
        type: "artigo",
        numero: "26º",
        titulo: "Das missões",
        alteracao_tipo: "revogado",
        texto_vigente: "<p>Art. 5º A igreja coopera com as convenções.</p>",
      }),
      no({
        id: "novo-1",
        type: "artigo",
        numero: null,
        origem: "novo",
        alteracao_tipo: "novo",
        texto_vigente: "",
        proposta_inicial: "<p>Nova disposição sobre transparência.</p>",
      }),
    ],
  }),
];

describe("textoAtual", () => {
  it("respeita a prioridade trabalho → consolidada → proposta inicial → vigente", () => {
    expect(textoAtual({ redacao_consolidada: "c", redacao_trabalho: "t", proposta_inicial: "p", texto_vigente: "v" })).toBe("t");
    expect(textoAtual({ redacao_consolidada: "c", redacao_trabalho: "", proposta_inicial: "p", texto_vigente: "v" })).toBe("c");
    expect(textoAtual({ redacao_consolidada: "", redacao_trabalho: "", proposta_inicial: "p", texto_vigente: "v" })).toBe("p");
    expect(textoAtual({ redacao_consolidada: "", redacao_trabalho: "", proposta_inicial: "", texto_vigente: "v" })).toBe("v");
  });
});

describe("buildComparativo", () => {
  const linhas = buildComparativo(ARVORE, new Map([["art-6", "6º"]]), new Map([["art-6", "<p>Renumerado.</p>"]]));

  it("monta uma linha por artigo, na ordem da proposta", () => {
    expect(linhas.map((l) => l.id)).toEqual(["art-6", "art-5", "novo-1"]);
  });

  it("mostra número vigente → proposto, capítulo e título", () => {
    const l = linhas[0];
    expect(l.label).toBe("Art. 5º");
    expect(l.labelVigente).toBe("Art. 6º");
    expect(l.capitulo).toContain("Capítulo I");
    expect(l.titulo).toBe("Dos membros");
  });

  it("detecta alteração de texto e justificativa", () => {
    const l = linhas[0];
    expect(l.alterado).toBe(true);
    expect(l.justificativa).toBe("Renumerado.");
    expect(l.before).toContain("pessoas");
    expect(l.after).toContain("batizados");
    expect(l.beforeParts.some((p) => p.changed)).toBe(true);
  });

  it("marca revogado e novo", () => {
    expect(linhas[1].revogado).toBe(true);
    expect(linhas[1].alteracaoTipo).toBe("revogado");
    expect(linhas[2].labelVigente).toBeNull();
    expect(linhas[2].origem).toBe("novo");
    expect(linhas[2].alterado).toBe(true);
  });
});
