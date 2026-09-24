import { describe, it, expect } from "vitest";
import {
  numerarArvore,
  numerarSubordinados,
  formatarNumeroArtigo,
  numeracaoDesatualizada,
  aplicarNumeracao,
  numerosDaArvore,
  contarTipo,
  resolverEra,
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
  it("numera parágrafos pela posição e usa parágrafo único quando há apenas um", () => {
    const arvore: NoNumeravel[] = [
      no({ id: "art-1", type: "artigo", children: [
        no({ id: "p3", type: "paragrafo", numero: "3º" }),
        no({ id: "p2", type: "paragrafo", numero: "2º" }),
        no({ id: "p1", type: "paragrafo", numero: "1º" }),
      ] }),
      no({ id: "art-2", type: "artigo", children: [no({ id: "unico", type: "paragrafo", numero: "1º" })] }),
    ];
    const numeros = numerarSubordinados(arvore);
    expect(numeros.get("p3")).toBe("1º");
    expect(numeros.get("p2")).toBe("2º");
    expect(numeros.get("p1")).toBe("3º");
    expect(numeros.get("unico")).toBe("único");
  });

  it("incisos e alíneas são sequenciais por pai e não incluem revogados", () => {
    const arvore: NoNumeravel[] = [no({ id: "art", type: "artigo", children: [
      no({ id: "i1", type: "inciso", children: [
        no({ id: "a1", type: "alinea" }),
        no({ id: "a-rev", type: "alinea", alteracao_tipo: "revogado" }),
        no({ id: "a2", type: "alinea" }),
      ] }),
      no({ id: "i-rev", type: "inciso", alteracao_tipo: "revogado" }),
      no({ id: "i2", type: "inciso" }),
    ] })];
    const numeros = numerarSubordinados(arvore);
    expect(numeros.get("i1")).toBe("I");
    expect(numeros.get("i2")).toBe("II");
    expect(numeros.has("i-rev")).toBe(false);
    expect(numeros.get("a1")).toBe("a");
    expect(numeros.get("a2")).toBe("b");
    expect(numeros.has("a-rev")).toBe(false);
  });

});

describe("era efetiva (referência de origem)", () => {
  it("sem anotação usa o próprio número vigente (automático)", () => {
    expect(resolverEra({ numero: "5º" }, null)).toBe("5º");
    expect(resolverEra({ numero: null }, null)).toBeNull();
    expect(resolverEra({ numero: "5º", sem_origem: 0 }, null)).toBe("5º");
  });

  it("referência manual prevalece e usa o número do dispositivo referenciado", () => {
    expect(resolverEra({ numero: null, origem_ref_id: "art-5" }, "12º")).toBe("12º");
    expect(resolverEra({ numero: "5º", origem_ref_id: "art-5" }, "12º")).toBe("12º");
    expect(resolverEra({ numero: "5º", origem_ref_id: "art-5" }, null)).toBeNull();
  });

  it("sem_origem oculta a correspondência mesmo com número armazenado", () => {
    expect(resolverEra({ numero: "5º", sem_origem: 1 }, null)).toBeNull();
    expect(resolverEra({ numero: "5º", sem_origem: true }, null)).toBeNull();
  });
});
