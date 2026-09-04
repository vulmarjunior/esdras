import { describe, it, expect } from "vitest";
import { CONFISSOES } from "../lib/confissoes";
import { buscarTrechos, montarContextoConsulta, normalizarTexto, tokenizar } from "../lib/confissoes/recuperacao";

const IDS_ESPERADOS = [
  "londres-1689",
  "new-hampshire-1833",
  "fe-mensagem-2000",
  "cbb-declaracao",
  "principios-batistas",
  "pacto-igrejas",
];

describe("biblioteca doutrinária", () => {
  it("tem os 6 documentos previstos e não inclui Filadélfia", () => {
    const ids = CONFISSOES.map((c) => c.id).sort();
    expect(ids).toEqual([...IDS_ESPERADOS].sort());
    expect(ids.some((id) => id.includes("filadelfia"))).toBe(false);
  });

  it("cada documento tem nome, origem, resumo e itens não vazios", () => {
    for (const c of CONFISSOES) {
      expect(c.nome.trim()).toBeTruthy();
      expect(c.origem.trim()).toBeTruthy();
      expect(c.resumo.trim()).toBeTruthy();
      expect(c.itens.length).toBeGreaterThan(0);
      for (const item of c.itens) {
        expect(item.titulo.trim()).toBeTruthy();
        expect(item.conteudo.trim()).toBeTruthy();
      }
    }
  });

  it("títulos de seções são únicos dentro de cada documento", () => {
    for (const c of CONFISSOES) {
      const titulos = c.itens.map((i) => i.titulo);
      expect(new Set(titulos).size).toBe(titulos.length);
    }
  });

  it("Londres tem 32 capítulos e New Hampshire tem 18 artigos", () => {
    const londres = CONFISSOES.find((c) => c.id === "londres-1689")!;
    const nh = CONFISSOES.find((c) => c.id === "new-hampshire-1833")!;
    expect(londres.itens).toHaveLength(32);
    expect(nh.itens).toHaveLength(18);
  });

  it("normalizarTexto remove acentos e tokenizar ignora stopwords", () => {
    expect(normalizarTexto("Batismo e Ceia do Senhor")).toBe("batismo e ceia do senhor");
    const termos = tokenizar("Qual é a doutrina sobre o batismo?");
    expect(termos).toContain("batismo");
    expect(termos.some((t) => ["qual", "sobre"].includes(t))).toBe(false);
  });
});

describe("buscarTrechos", () => {
  it("pergunta vazia não retorna trechos", () => {
    const { trechos, resumos } = buscarTrechos("   ");
    expect(trechos).toHaveLength(0);
    expect(resumos).toContain("Londres");
  });

  it("retorna resumos de todos os documentos", () => {
    const { resumos } = buscarTrechos("batismo");
    for (const id of IDS_ESPERADOS) {
      expect(resumos).toContain(id === "londres-1689" ? "Londres" : id === "new-hampshire-1833" ? "New Hampshire" : "Batista");
    }
  });

  it("'batismo' encontra a seção de batismo em Londres 1689 e New Hampshire 1833", () => {
    const { trechos } = buscarTrechos("Qual é a doutrina sobre o batismo?");
    expect(trechos.length).toBeGreaterThan(0);

    const londres = trechos.find((t) => t.confissao.id === "londres-1689");
    expect(londres).toBeTruthy();
    expect(londres!.item.titulo.toLowerCase()).toContain("batismo");

    const nh = trechos.find((t) => t.confissao.id === "new-hampshire-1833");
    expect(nh).toBeTruthy();
    expect(nh!.item.titulo.toLowerCase()).toContain("batismo");
  });

  it("limita a quantidade de trechos e o tamanho de cada conteúdo", () => {
    const { trechos } = buscarTrechos("Deus", 2, 500);
    expect(trechos.length).toBeLessThanOrEqual(2);
    for (const t of trechos) {
      expect(t.item.conteudo.length).toBeLessThanOrEqual(501);
    }
  });

  it("montarContextoConsulta inclui resumos e trechos com a referência do documento", () => {
    const contexto = montarContextoConsulta("batismo");
    expect(contexto).toContain("Documentos doutrinários disponíveis");
    expect(contexto).toMatch(/\[[^\]]+—[^\]]+\]/);
  });
});