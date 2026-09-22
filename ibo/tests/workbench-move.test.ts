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
});
