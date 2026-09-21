import { describe, it, expect } from "vitest";
import { pontuarSecoes, tokenizar, truncar } from "../lib/busca";

describe("busca compartilhada", () => {
  it("pontua o título com peso maior que o conteúdo", () => {
    const itens = [
      { titulo: "Batismo", conteudo: "Texto sem o termo pesquisado." },
      { titulo: "Outro assunto", conteudo: "O batismo aparece uma vez no corpo." },
    ];
    const pontuados = pontuarSecoes(itens, tokenizar("batismo"));
    expect(pontuados).toHaveLength(2);
    expect(pontuados[0].item.titulo).toBe("Batismo");
    expect(pontuados[0].score).toBeGreaterThan(pontuados[1].score);
  });

  it("ignora itens sem correspondência e perguntas vazias", () => {
    expect(pontuarSecoes([{ titulo: "X", conteudo: "Y" }], tokenizar("zzz"))).toHaveLength(0);
    expect(pontuarSecoes([{ titulo: "X", conteudo: "Y" }], [])).toHaveLength(0);
  });

  it("truncar limita o tamanho e sinaliza corte", () => {
    expect(truncar("abc", 5)).toBe("abc");
    expect(truncar("abcdefgh", 5)).toBe("abcde…");
  });
});
