import { describe, expect, it } from "vitest";
import type { DraftNode } from "./model";
import { compararCandidato, rotuloCandidato, sugerirLote, sugerirVinculos, type CandidatoVinculo } from "./vinculos";

const no = (id: string, type: DraftNode["type"], text: string, extra: Partial<DraftNode> = {}): DraftNode => ({ id, type, text, children: [], ...extra });
const candidato = (over: Partial<CandidatoVinculo> & { id: string; type: string }): CandidatoVinculo => ({
  numero: null, titulo: null, vigente: "", proposta: "", ...over,
});

const textoBase = "A igreja Batista Olaria é constituída como organização religiosa sem fins lucrativos.";
const candidatos: CandidatoVinculo[] = [
  candidato({ id: "art-1", type: "artigo", numero: "1º", vigente: textoBase, proposta: textoBase }),
  candidato({ id: "art-2", type: "artigo", numero: "2º", proposta: "A igreja reconhece a Bíblia como regra de fé e prática e adota a Declaração Doutrinária." }),
  candidato({ id: "cap-1", type: "capitulo", numero: "I", titulo: "DA IDENTIDADE, NATUREZA E FINS", vigente: "" }),
  candidato({ id: "par-1", type: "paragrafo", numero: "1", proposta: "O desligamento depende de deliberação da assembleia." }),
];

describe("sugestão de vínculos com o Estatuto", () => {
  it("reconhece igualdade mesmo com acentos e pontuação diferentes", () => {
    const node = no("n1", "article", "A IGREJA Batista Olaria é constituída como organização religiosa, sem fins lucrativos!");
    const resultado = compararCandidato(node, candidatos[0]);
    expect(resultado.igual).toBe(true);
    expect(resultado.score).toBe(1);
  });

  it("pontua alto uma redação levemente editada, sem marcar igualdade", () => {
    const node = no("n1", "article", "A igreja Batista Olaria é constituída como organização religiosa sem fins lucrativos, por tempo indeterminado.");
    const resultado = compararCandidato(node, candidatos[0]);
    expect(resultado.igual).toBe(false);
    expect(resultado.score).toBeGreaterThanOrEqual(0.8);
  });

  it("respeita o tipo: artigo não casa com capítulo", () => {
    const node = no("n1", "article", "DA IDENTIDADE, NATUREZA E FINS");
    expect(compararCandidato(node, candidatos[2])).toEqual({ score: 0, igual: false });
  });

  it("compara títulos em dispositivos estruturais", () => {
    const capitulo = no("c1", "chapter", "Da identidade, natureza e fins");
    const resultado = compararCandidato(capitulo, candidatos[2]);
    expect(resultado.igual).toBe(true);
    expect(rotuloCandidato(candidatos[2])).toBe("Capítulo I");
  });

  it("lista as melhores sugestões e ignora vínculos já registrados", () => {
    const node = no("n1", "article", textoBase, { vinculos: ["art-1"] });
    const sugestoes = sugerirVinculos(node, candidatos, { limite: 3 });
    expect(sugestoes.map((s) => s.id)).not.toContain("art-1");
    const proxima = no("n2", "article", "A igreja reconhece a Bíblia como regra de fé e prática e adota a Declaração Doutrinária.");
    expect(sugerirVinculos(proxima, candidatos)[0]).toMatchObject({ id: "art-2" });
  });

  it("separa o lote em alta confiança, revisão e sem sugestão", () => {
    const draft = {
      id: "estatuto-ibo-2026",
      nodes: [
        no("a", "article", textoBase),
        no("b", "article", "A igreja reconhece a Bíblia como regra de fé e de prática, adota a Declaração Doutrinária da CBB e valoriza a educação cristã."),
        no("c", "article", "Texto completamente novo sobre a tesouraria e o conselho fiscal."),
        no("d", "paragraph", "O desligamento depende de deliberação da assembleia.", { vinculos: ["par-1"] }),
      ],
    };
    const lote = sugerirLote(draft, candidatos);
    expect(lote.alta.map((i) => i.nodeId)).toEqual(["a"]);
    expect(lote.revisar.map((i) => i.nodeId)).toEqual(["b"]);
    expect(lote.semSugestao).toContain("c");
    expect(lote.semSugestao).not.toContain("d");
  });
});