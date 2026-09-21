import { describe, it, expect } from "vitest";
import { parseMarkdown, sugerirResumo } from "../lib/literatura/parse";

describe("parseMarkdown (MD/TXT → seções)", () => {
  it("divide Markdown limpo em seções com título e conteúdo", () => {
    const md = [
      "# Capítulo 1",
      "",
      "Primeiro parágrafo do capítulo, com conteúdo suficiente para não ser fundido com o seguinte.",
      "",
      "Segundo parágrafo do capítulo, também com extensão razoável para manter a seção independente.",
      "",
      "# Capítulo 2",
      "",
      "Outro conteúdo do segundo capítulo, com tamanho suficiente para permanecer como seção própria do livro.",
      "",
      "Mais um parágrafo do segundo capítulo, garantindo extensão acima do limite de fusão de seções.",
    ].join("\n");
    const secoes = parseMarkdown(md);
    expect(secoes).toHaveLength(2);
    expect(secoes[0].titulo).toBe("Capítulo 1");
    expect(secoes[0].conteudo).toContain("Primeiro parágrafo do capítulo");
    expect(secoes[0].conteudo).toContain("Segundo parágrafo do capítulo");
    expect(secoes[1].titulo).toBe("Capítulo 2");
  });

  it("funde títulos quebrados em linhas consecutivas", () => {
    const md = "# PARTE UM\n# ASSUMINDO\n# NOSSAS\n# POSIÇÕES\n\nConteúdo do capítulo.";
    const secoes = parseMarkdown(md);
    expect(secoes).toHaveLength(1);
    expect(secoes[0].titulo).toBe("PARTE UM ASSUMINDO NOSSAS POSIÇÕES");
  });

  it("descarta números de página e notas de rodapé como títulos", () => {
    const md = [
      "# Capítulo",
      "",
      "Texto do capítulo.",
      "",
      "## 16",
      "",
      "Mais texto.",
      "",
      "## 5. Ibid., 119-38.",
      "",
      "Fim do capítulo.",
    ].join("\n");
    const secoes = parseMarkdown(md);
    expect(secoes).toHaveLength(1);
    expect(secoes[0].titulo).toBe("Capítulo");
    expect(secoes[0].conteudo).toContain("Mais texto.");
    expect(secoes[0].conteudo).toContain("Fim do capítulo.");
    expect(secoes[0].conteudo).not.toContain("Ibid");
  });

  it("remove linhas de ruído de conversão (Issuu etc.)", () => {
    const md = "# Capítulo\n\nIssuu.com/exemplo\n\nConteúdo real.";
    const secoes = parseMarkdown(md);
    expect(secoes[0].conteudo).toBe("Conteúdo real.");
  });

  it("junta palavras hifenizadas quebradas na linha", () => {
    const md = "# Capítulo\n\nA conside-\nração final do texto.";
    const secoes = parseMarkdown(md);
    expect(secoes[0].conteudo).toContain("consideração final");
  });

  it("funde seções minúsculas na anterior", () => {
    const md = [
      "# Capítulo",
      "",
      "Conteúdo principal ".repeat(30),
      "",
      "# Nota curta",
      "",
      "Texto curto.",
    ].join("\n");
    const secoes = parseMarkdown(md);
    expect(secoes).toHaveLength(1);
    expect(secoes[0].conteudo).toContain("Nota curta");
    expect(secoes[0].conteudo).toContain("Texto curto.");
  });

  it("divide seções gigantes em partes nos parágrafos", () => {
    const paragrafo = "Parágrafo longo do livro. ".repeat(50);
    const md = `# Capítulo Grande\n\n${Array(6).fill(paragrafo).join("\n\n")}`;
    const secoes = parseMarkdown(md);
    expect(secoes.length).toBeGreaterThan(1);
    expect(secoes[0].titulo).toContain("(parte 1)");
    expect(secoes[1].titulo).toContain("(parte 2)");
  });

  it("usa blocos por tamanho quando não há títulos", () => {
    const paragrafo = "Texto corrido sem títulos no arquivo. ".repeat(50);
    const texto = Array(4).fill(paragrafo).join("\n\n");
    const secoes = parseMarkdown(texto);
    expect(secoes.length).toBeGreaterThan(1);
    for (const secao of secoes) {
      expect(secao.titulo.trim().length).toBeGreaterThan(0);
      expect(secao.conteudo.trim().length).toBeGreaterThan(0);
    }
  });

  it("sugerirResumo devolve trecho do conteúdo", () => {
    const md = `# Capítulo\n\n${"Conteúdo substancial do livro. ".repeat(30)}`;
    const secoes = parseMarkdown(md);
    const resumo = sugerirResumo(secoes);
    expect(resumo.length).toBeGreaterThan(50);
    expect(resumo).toContain("Conteúdo substancial");
  });
});
