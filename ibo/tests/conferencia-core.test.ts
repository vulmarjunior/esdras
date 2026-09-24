import { describe, it, expect } from "vitest";
import { conferirMinuta, type NoConferencia, type OpcoesConferencia } from "../lib/conferencia-core";

function no(overrides: Partial<NoConferencia> & { id: string }): NoConferencia {
  return {
    type: "artigo",
    titulo: null,
    alteracao_tipo: "nao_avaliado",
    status: "nao_iniciado",
    texto_vigente: "",
    proposta_inicial: "",
    redacao_trabalho: "",
    justificativa: "",
    sem_origem: 0,
    origem_ref_id: null,
    children: [],
    ...overrides,
  };
}

function opcoes(overrides: Partial<OpcoesConferencia> = {}): OpcoesConferencia {
  return {
    numerosDerivados: new Map(),
    numerosArmazenados: new Map(),
    correspondencias: [],
    pendencias: [],
    labels: new Map(),
    ...overrides,
  };
}

describe("conferirMinuta", () => {
  it("aponta dispositivo provisório vazio, justificativa ausente e remissão sem alvo", () => {
    const arvore = [
      no({
        id: "art-1",
        redacao_trabalho: "<p>Conforme o Art. 9 desta proposta, fica definido.</p>",
        texto_vigente: "<p>Texto antigo.</p>",
      }),
      no({ id: "art-2", type: "paragrafo" }),
    ];
    const achados = conferirMinuta(arvore, opcoes({
      numerosDerivados: new Map([["art-1", "1º"], ["art-2", "1º"]]),
      numerosArmazenados: new Map([["art-1", "1º"], ["art-2", "1º"]]),
      labels: new Map([["art-1", "Art. 1º"], ["art-2", "§ 1º"]]),
    }));
    const tipos = achados.map((a) => a.tipo);
    expect(tipos).toContain("provisorio_vazio");
    expect(tipos).toContain("justificativa_ausente");
    expect(tipos).toContain("remissao_a_revisar");
    expect(tipos).not.toContain("correspondencia_ausente");
  });

  it("separa supressão (revogado) e numeração divergente", () => {
    const arvore = [
      no({ id: "art-1", redacao_trabalho: "<p>Texto.</p>", justificativa: "Motivo.", texto_vigente: "<p>Vigente.</p>" }),
      no({ id: "art-2", alteracao_tipo: "revogado", redacao_trabalho: "<p>Retirado.</p>" }),
    ];
    const achados = conferirMinuta(arvore, opcoes({
      numerosDerivados: new Map([["art-1", "1º"], ["art-2", "2º"]]),
      numerosArmazenados: new Map([["art-1", "5º"], ["art-2", "6º"]]),
      labels: new Map([["art-1", "Art. 1º"], ["art-2", "Art. 2º"]]),
    }));
    const supressao = achados.find((a) => a.tipo === "supressao");
    expect(supressao?.gravidade).toBe("info");
    expect(achados.some((a) => a.tipo === "numeracao_divergente" && a.gravidade === "alerta")).toBe(true);
    expect(achados.some((a) => a.tipo === "provisorio_vazio" && a.provision_id === "art-2")).toBe(false);
  });

  it("sinaliza correspondência não examinada e acréscimo sem declaração", () => {
    const arvore = [
      no({ id: "art-1", redacao_trabalho: "<p>Novo dispositivo.</p>", justificativa: "x" }),
      no({ id: "art-2", redacao_trabalho: "<p>Outro.</p>", justificativa: "x", texto_vigente: "<p>Vigente.</p>" }),
    ];
    const achados = conferirMinuta(arvore, opcoes({
      correspondencias: [{ provision_id: "art-1", tipo: "nao_examinado", vigente_id: "art-9" }],
      labels: new Map([["art-1", "Art. 1º"], ["art-2", "Art. 2º"]]),
    }));
    expect(achados.some((a) => a.tipo === "correspondencia_nao_examinada" && a.provision_id === "art-1")).toBe(true);
    expect(achados.some((a) => a.tipo === "correspondencia_ausente")).toBe(false);
  });

  it("inclui pendências abertas como alerta e ordena por gravidade", () => {
    const achados = conferirMinuta([no({ id: "art-1", redacao_trabalho: "<p>x</p>", justificativa: "y" })], opcoes({
      pendencias: [{ provision_id: "art-1", status: "aberta", descricao: "Revisar remissão." }],
      labels: new Map([["art-1", "Art. 1º"]]),
    }));
    expect(achados[0].tipo).toBe("pendencia_aberta");
    expect(achados[0].gravidade).toBe("alerta");
  });
});
