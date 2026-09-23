import { describe, expect, it } from "vitest";
import { simulateArticleMove, type WorkbenchMoveNode } from "../lib/workbench-move";

function article(n: number): WorkbenchMoveNode {
  return { id: `art-${n}`, type: "artigo", children: [] };
}

describe("prévia de movimentação da Mesa de Trabalho", () => {
  it("realoca o antigo art. 5 para a posição 26 e renumera somente o intervalo afetado", () => {
    const tree: WorkbenchMoveNode[] = [
      { id: "cap-1", type: "capitulo", children: Array.from({ length: 26 }, (_, index) => article(index + 1)) },
      { id: "cap-2", type: "capitulo", children: [article(27), article(28)] },
    ];

    const effects = simulateArticleMove(tree, "art-5", "cap-1", "art-26");
    const byId = new Map(effects.map((effect) => [effect.id, effect]));

    expect(byId.get("art-5")).toEqual({ id: "art-5", from: "5º", to: "26" });
    expect(byId.get("art-6")).toEqual({ id: "art-6", from: "6º", to: "5º" });
    expect(byId.get("art-26")).toEqual({ id: "art-26", from: "26", to: "25" });
    expect(byId.has("art-4")).toBe(false);
    expect(byId.has("art-27")).toBe(false);
  });

  it("leva os filhos junto sem numerá-los como artigos autônomos", () => {
    const tree: WorkbenchMoveNode[] = [{
      id: "cap-1",
      type: "capitulo",
      children: [
        { ...article(1), children: [{ id: "art-1-p1", type: "paragrafo", children: [] }] },
        article(2),
      ],
    }];
    expect(simulateArticleMove(tree, "art-1", "cap-1", "art-2")).toEqual([
      { id: "art-1", from: "1º", to: "2º" },
      { id: "art-2", from: "2º", to: "1º" },
    ]);
  });
  it("renumera o segundo parágrafo ao movê-lo para a terceira posição", () => {
    const tree: WorkbenchMoveNode[] = [{
      id: "cap-2", type: "capitulo", children: [{
        ...article(2), children: [
          { id: "p1", type: "paragrafo", children: [] },
          { id: "p2", type: "paragrafo", children: [] },
          { id: "p3", type: "paragrafo", children: [] },
        ],
      }],
    }];
    const effects = simulateArticleMove(tree, "p2", "art-2", "p3");
    expect(effects).toEqual([
      { id: "p2", from: "2º", to: "3º" },
      { id: "p3", from: "3º", to: "2º" },
    ]);
  });

  it("renumera os parágrafos ao transferir um para outro artigo, incluindo parágrafo único", () => {
    const tree: WorkbenchMoveNode[] = [{
      id: "cap", type: "capitulo", children: [
        { ...article(1), children: [
          { id: "p1", type: "paragrafo", children: [] },
          { id: "p2", type: "paragrafo", children: [] },
        ] },
        { ...article(2), children: [
          { id: "p3", type: "paragrafo", children: [] },
        ] },
      ],
    }];
    const byId = new Map(simulateArticleMove(tree, "p2", "art-2", "p3").map((x) => [x.id, x]));
    expect(byId.get("p1")).toEqual({ id: "p1", from: "1º", to: "único" });
    expect(byId.get("p2")).toEqual({ id: "p2", from: "2º", to: "2º" });
    expect(byId.get("p3")).toEqual({ id: "p3", from: "único", to: "1º" });
  });

  it("renumera incisos e alíneas dentro de cada pai", () => {
    const tree: WorkbenchMoveNode[] = [{
      id: "cap", type: "capitulo", children: [{
        ...article(1), children: [
          { id: "i1", type: "inciso", children: [
            { id: "a1", type: "alinea", children: [] },
            { id: "a2", type: "alinea", children: [] },
            { id: "a3", type: "alinea", children: [] },
          ] },
          { id: "i2", type: "inciso", children: [] },
        ],
      }],
    }];
    expect(simulateArticleMove(tree, "i1", "art-1", "i2")).toEqual([
      { id: "i1", from: "I", to: "II" },
      { id: "i2", from: "II", to: "I" },
    ]);
    expect(simulateArticleMove(tree, "a2", "i1", "a3")).toEqual([
      { id: "a2", from: "b", to: "c" },
      { id: "a3", from: "c", to: "b" },
    ]);
  });

});
