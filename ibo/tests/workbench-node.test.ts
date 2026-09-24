import { describe, it, expect } from "vitest";
import {
  allowedChildren,
  articleStats,
  currentText,
  descendantIds,
  destinationLabel,
  findNode,
  flatten,
  isStructural,
  label,
  type WorkbenchNode,
} from "../lib/workbench-node";

function no(overrides: Partial<WorkbenchNode> & { id: string }): WorkbenchNode {
  return {
    parentId: null,
    type: "artigo",
    numero: null,
    numeroVigente: null,
    numeroSugerido: null,
    titulo: null,
    origem: "original",
    origemRefId: null,
    semOrigem: false,
    temVigente: false,
    alteracaoTipo: "nao_avaliado",
    status: "nao_iniciado",
    textoVigente: "",
    propostaInicial: "",
    redacaoTrabalho: "",
    redacaoConsolidada: "",
    acordoEm: null,
    acordoPorName: null,
    acordoVersion: null,
    justificativa: "",
    version: 0,
    updatedAt: "",
    hasNote: false,
    hasPending: false,
    personalNote: "",
    suggestions: [],
    comments: [],
    pendings: [],
    correspondencias: [],
    suggestionCount: 0,
    commentCount: 0,
    childCount: 0,
    children: [],
    ...overrides,
  };
}

describe("workbench-node", () => {
  it("rotula capítulos, artigos, parágrafos, alíneas e itens", () => {
    expect(label(no({ id: "c", type: "capitulo", numero: "II" }))).toBe("Capítulo II");
    expect(label(no({ id: "a", numero: "5" }))).toBe("Art. 5º");
    expect(label(no({ id: "p", type: "paragrafo", numero: "único" }))).toBe("Parágrafo único");
    expect(label(no({ id: "l", type: "alinea", numero: "b" }))).toBe("b)");
    expect(label(no({ id: "i", type: "item", numero: "3" }))).toBe("3.");
  });

  it("hierarquia inclui itens dentro de alíneas", () => {
    expect(allowedChildren("alinea")).toEqual(["item"]);
    expect(allowedChildren("item")).toEqual([]);
    expect(isStructural("capitulo")).toBe(true);
    expect(isStructural("item")).toBe(false);
  });

  it("texto atual prioriza trabalho → proposta inicial → vigente", () => {
    expect(currentText(no({ id: "x", redacaoTrabalho: "t", propostaInicial: "p", textoVigente: "v" }))).toBe("t");
    expect(currentText(no({ id: "x", propostaInicial: "p", textoVigente: "v" }))).toBe("p");
    expect(currentText(no({ id: "x", textoVigente: "v" }))).toBe("v");
  });

  it("achata, encontra e lista descendentes", () => {
    const arvore = [
      no({
        id: "cap",
        type: "capitulo",
        children: [no({ id: "art", children: [no({ id: "p1", type: "paragrafo" })] })],
      }),
    ];
    expect(flatten(arvore).map((n) => n.id)).toEqual(["cap", "art", "p1"]);
    expect(findNode(arvore, "p1")?.type).toBe("paragrafo");
    expect(descendantIds(arvore[0])).toEqual(new Set(["art", "p1"]));
  });

  it("conta redações concluídas do capítulo ignorando revogados", () => {
    const capitulo = no({
      id: "cap",
      type: "capitulo",
      children: [
        no({ id: "a1", status: "aprovado" }),
        no({ id: "a2", status: "em_analise" }),
        no({ id: "a3", alteracaoTipo: "revogado", status: "aprovado" }),
      ],
    });
    expect(articleStats(capitulo)).toEqual({ total: 2, approved: 1 });
  });

  it("destino mostra o número vigente quando diverge do atual", () => {
    expect(destinationLabel(no({ id: "x", numero: "3", numeroVigente: "5º", titulo: "Da sede" })))
      .toBe("Art. 3º — Da sede · vigente 5º");
  });
});
