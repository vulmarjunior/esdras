import { describe, expect, it } from "vitest";
import { escolherSelecaoAposExclusao, type WorkbenchSelectableNode } from "../lib/workbench-move";

function no(id: string, parentId: string | null): WorkbenchSelectableNode {
  return { id, parentId };
}

describe("seleção após exclusão na Mesa de Trabalho", () => {
  it("seleciona o item imediatamente anterior na ordem do documento", () => {
    const lista = [no("art-1", "cap-1"), no("art-2", "cap-1"), no("art-3", "cap-1")];
    expect(escolherSelecaoAposExclusao(lista, "art-3")).toBe("art-2");
    expect(escolherSelecaoAposExclusao(lista, "art-2")).toBe("art-1");
  });

  it("no primeiro item, sobe para o pai (capítulo)", () => {
    const lista = [no("art-1", "cap-1"), no("art-2", "cap-1")];
    expect(escolherSelecaoAposExclusao(lista, "art-1")).toBe("cap-1");
  });

  it("considera o último descendente do irmão anterior como anterior visual", () => {
    const lista = [
      no("art-1", "cap-1"),
      no("art-1-p1", "art-1"),
      no("art-2", "cap-1"),
    ];
    expect(escolherSelecaoAposExclusao(lista, "art-2")).toBe("art-1-p1");
  });

  it("devolve null quando o item não está na lista", () => {
    expect(escolherSelecaoAposExclusao([no("art-1", "cap-1")], "art-9")).toBeNull();
  });
});
