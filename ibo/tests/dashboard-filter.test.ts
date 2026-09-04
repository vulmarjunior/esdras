import { describe, it, expect } from "vitest";
import { contemAnotacao, filtrarPorAnotacao } from "../lib/dashboard-filter";
import type { TreeNode } from "../lib/data";

function node(partial: Partial<TreeNode>): TreeNode {
  return {
    id: "",
    parent_id: null,
    project_id: "p1",
    type: "artigo",
    numero: null,
    titulo: null,
    ordem: 0,
    origem: "original",
    alteracao_tipo: "sem_alteracao",
    status: "nao_iniciado",
    texto_vigente: "",
    proposta_inicial: "",
    redacao_trabalho: "",
    justificativa: "",
    redacao_consolidada: "",
    posicao_sugerida: null,
    version: 1,
    updated_at: "",
    updated_by: null,
    children: [],
    child_count: 0,
    ...partial,
  };
}

const arvore: TreeNode = node({
  id: "cap-1",
  type: "capitulo",
  children: [
    node({
      id: "art-1",
      children: [
        node({ id: "art-1-p1", type: "paragrafo" }),
        node({ id: "art-1-p2", type: "paragrafo" }),
      ],
    }),
    node({
      id: "art-2",
      children: [node({ id: "art-2-p1", type: "paragrafo" })],
    }),
  ],
});

describe("filtro do painel por anotação pessoal", () => {
  it("contemAnotacao detecta anotação em descendente", () => {
    expect(contemAnotacao(arvore, new Set(["art-1-p1"]))).toBe(true);
    expect(contemAnotacao(arvore, new Set(["art-3"]))).toBe(false);
  });

  it("sem anotações retorna null", () => {
    expect(filtrarPorAnotacao(arvore, new Set())).toBeNull();
  });

  it("mantém nó com anotação e seus ancestrais", () => {
    const resultado = filtrarPorAnotacao(arvore, new Set(["art-1-p2"]))!;
    expect(resultado.id).toBe("cap-1");
    expect(resultado.children).toHaveLength(1);
    const art = resultado.children[0];
    expect(art.id).toBe("art-1");
    expect(art.children.map((c) => c.id)).toEqual(["art-1-p2"]);
  });

  it("remove nós sem anotação, mantendo a hierarquia dos que têm", () => {
    const resultado = filtrarPorAnotacao(arvore, new Set(["art-2-p1"]))!;
    expect(resultado.id).toBe("cap-1");
    expect(resultado.children.map((c) => c.id)).toEqual(["art-2"]);
    expect(resultado.children[0].children.map((c) => c.id)).toEqual(["art-2-p1"]);
  });

  it("mantém nó com anotação própria mesmo sem descendentes", () => {
    const resultado = filtrarPorAnotacao(arvore, new Set(["art-1"]))!;
    expect(resultado.children.map((c) => c.id)).toEqual(["art-1"]);
    expect(resultado.children[0].children).toHaveLength(0);
  });

  it("não muta a árvore original", () => {
    const original = JSON.stringify(arvore);
    filtrarPorAnotacao(arvore, new Set(["art-1-p2"]));
    expect(JSON.stringify(arvore)).toBe(original);
  });
});