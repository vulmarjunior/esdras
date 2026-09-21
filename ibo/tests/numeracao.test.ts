import { describe, it, expect } from "vitest";
import {
  numerarArvore,
  formatarNumeroArtigo,
  numeracaoDesatualizada,
  aplicarNumeracao,
  numerosDaArvore,
  contarTipo,
  type NoNumeravel,
} from "../lib/numeracao";

function no(parcial: Partial<NoNumeravel> & { id: string; type: string }): NoNumeravel {
  return { numero: null, children: [], ...parcial };
}

const ARVORE: NoNumeravel[] = [
  no({
    id: "cap-1",
    type: "capitulo",
    numero: "I",
    children: [
      no({ id: "art-1", type: "artigo", numero: "1º" }),
      no({ id: "art-2", type: "artigo", numero: "2º", children: [no({ id: "art-2-p1", type: "paragrafo" })] }),
    ],
  }),
  no({
    id: "cap-2",
    type: "capitulo",
    numero: "IV",
    children: [no({ id: "art-5", type: "artigo", numero: "5" }), no({ id: "art-6", type: "artigo", numero: "6º" })],
  }),
];

describe("numeração derivada", () => {
  it("formata artigos como o provisionLabel (1º…9º, 10)", () => {
    expect(formatarNumeroArtigo(1)).toBe("1º");
    expect(formatarNumeroArtigo(9)).toBe("9º");
    expect(formatarNumeroArtigo(10)).toBe("10");
    expect(formatarNumeroArtigo(26)).toBe("26");
  });

  it("numera artigos em sequência e capítulos em romanos na ordem da árvore", () => {
    const numeros = numerarArvore(ARVORE);
    expect(numeros.get("art-1")).toBe("1º");
    expect(numeros.get("art-2")).toBe("2º");
    expect(numeros.get("art-5")).toBe("3º");
    expect(numeros.get("art-6")).toBe("4º");
    expect(numeros.get("cap-1")).toBe("I");
    expect(numeros.get("cap-2")).toBe("II");
  });

  it("revogados não ocupam número (nem seus filhos)", () => {
    const arvore: NoNumeravel[] = [
      no({ id: "cap-1", type: "capitulo", children: [no({ id: "art-1", type: "artigo" })] }),
      no({
        id: "cap-2",
        type: "capitulo",
        children: [
          no({ id: "art-2", type: "artigo", alteracao_tipo: "revogado", children: [no({ id: "art-2-p1", type: "paragrafo" })] }),
          no({ id: "art-3", type: "artigo" }),
        ],
      }),
    ];
    const numeros = numerarArvore(arvore);
    expect(numeros.has("art-2")).toBe(false);
    expect(numeros.has("art-2-p1")).toBe(false);
    expect(numeros.get("art-3")).toBe("2º");
    expect(numeros.get("cap-2")).toBe("II");
  });

  it("numeracaoDesatualizada ignora diferenças de formatação (24º = 24)", () => {
    const derivados = new Map([
      ["art-1", "24"],
      ["art-2", "25"],
      ["cap-1", "III"],
    ]);
    const armazenados = new Map<string, string | null>([
      ["art-1", "24º"],
      ["art-2", "26º"],
      ["cap-1", "IV"],
    ]);
    expect(numeracaoDesatualizada(armazenados, derivados)).toEqual(["art-2", "cap-1"]);
  });

  it("aplicarNumeracao devolve cópia com os números derivados", () => {
    const numeros = numerarArvore(ARVORE);
    const numerada = aplicarNumeracao(ARVORE, numeros);
    expect(numerada[1].numero).toBe("II");
    expect(numerada[1].children[0].numero).toBe("3º");
    expect(ARVORE[1].numero).toBe("IV"); // original intacto
  });

  it("numerosDaArvore coleta os números existentes em toda a árvore", () => {
    const mapa = numerosDaArvore(ARVORE);
    expect(mapa.get("art-5")).toBe("5");
    expect(mapa.get("cap-2")).toBe("IV");
  });

  it("contarTipo ignora revogados", () => {
    const arvore: NoNumeravel[] = [
      no({
        id: "cap-1",
        type: "capitulo",
        children: [no({ id: "a1", type: "artigo" }), no({ id: "a2", type: "artigo", alteracao_tipo: "revogado" })],
      }),
    ];
    expect(contarTipo(arvore, "artigo")).toBe(1);
    expect(contarTipo(arvore, "capitulo")).toBe(1);
  });
});
