import { describe, expect, it } from "vitest";
import { compararMinutas, estatisticasDaMinuta, importarMinuta } from "./importar";
import { validateDraft } from "./validate";
import type { Draft } from "./model";

const baseDraft = (): Draft => ({
  id: "estatuto-ibo-2026",
  nodes: [
    {
      id: "cap-1",
      type: "chapter",
      text: "Dos fins",
      alignment: "center",
      children: [
        { id: "art-1", type: "article", text: "Redação antiga", children: [] },
        { id: "art-2", type: "article", text: "Permanece", children: [] },
      ],
    },
  ],
});

const consolidado = () => ({
  id: "estatuto-ibo-2026-minuta",
  titulo: "Estatuto Social — minuta integral",
  status: "minuta_para_revisao_nao_importar",
  fonte_esdras: { draft_id: "estatuto-ibo-2026", version: 261, consultado_em: "2026-09-26" },
  pontos_de_revisao: [{ capitulo: "I", artigo: "3", ponto: "Definir algo." }],
  nodes: [
    {
      id: "cap-1",
      type: "chapter",
      text: "Dos fins",
      titulo: "Dos fins",
      approved: true,
      numero: "I",
      ordem: 1,
      children: [
        {
          id: "art-1",
          type: "article",
          text: "Redação nova",
          children: [],
          approved: true,
          aprovado_no_esdras: true,
          origem: "Esdras, nova_mesa_drafts.content, versão 261",
          numero: "1",
          ordem: 1,
          revisao_pendente: "Conferir quórum.",
          runs: [{ text: "Redação nova", marks: [] }],
        },
        {
          id: "art-3",
          type: "article",
          texto: "Sem marcação",
          children: [],
          approved: false,
          revisao_pendente: "Definir algo.",
        },
      ],
    },
  ],
});

describe("importação da minuta consolidada", () => {
  it("normaliza o formato consolidado: identidade, aprovação, alerta e metadados", () => {
    const resultado = importarMinuta(consolidado(), baseDraft());
    expect(resultado.formato).toBe("consolidado");
    expect(resultado.draft.id).toBe("estatuto-ibo-2026");
    const capitulo = resultado.draft.nodes[0];
    expect(capitulo.status).toBe("aprovado");
    expect(capitulo.alignment).toBe("center");
    expect("titulo" in capitulo).toBe(false);
    const artigoAprovado = capitulo.children[0];
    expect(artigoAprovado.text).toBe("Redação nova");
    expect(artigoAprovado.status).toBe("aprovado");
    expect(artigoAprovado.revisao).toBe("Conferir quórum.");
    expect(artigoAprovado.runs).toEqual([{ text: "Redação nova", marks: [] }]);
    expect("approved" in artigoAprovado).toBe(false);
    expect("origem" in artigoAprovado).toBe(false);
    const artigoPendente = capitulo.children[1];
    expect(artigoPendente.text).toBe("Sem marcação");
    expect(artigoPendente.status).toBeUndefined();
    expect(artigoPendente.revisao).toBe("Definir algo.");
  });

  it("resume estatísticas e diferenças em relação à minuta atual", () => {
    const resultado = importarMinuta(consolidado(), baseDraft());
    expect(resultado.estatisticas).toEqual({ total: 3, porTipo: { chapter: 1, article: 2 }, apreciados: 2, emAnalise: 0, pendentes: 1, pontosRevisao: 2 });
    expect(resultado.diff.novos).toEqual(["art-3"]);
    expect(resultado.diff.removidos).toEqual(["art-2"]);
    expect(resultado.diff.textoAlterado).toEqual(["art-1"]);
    expect(resultado.diff.statusAlterado.sort()).toEqual(["art-1", "cap-1"].sort());
    expect(resultado.diff.revisaoAlterada).toEqual(["art-1"]);
  });

  it("avisa sobre ajustes e metadados ignorados", () => {
    const avisos = importarMinuta(consolidado()).avisos.join(" ");
    expect(avisos).toContain("Identificação do arquivo ajustada");
    expect(avisos).toContain("pontos_de_revisao");
  });

  it("aceita o formato nativo como ida e volta fiel", () => {
    const nativo = validateDraft({
      id: "estatuto-ibo-2026",
      nodes: [{ id: "art-1", type: "article", text: "Texto", revisao: "Conferir quórum.", vinculos: ["art-9"], children: [] }],
    });
    const resultado = importarMinuta(nativo);
    expect(resultado.formato).toBe("nativo");
    expect(resultado.draft).toEqual(nativo);
  });

  it("preserva vínculos já registrados no conteúdo importado", () => {
    const comVinculos = baseDraft();
    comVinculos.nodes[0].children[0].vinculos = ["art-2"];
    const resultado = importarMinuta(consolidado(), comVinculos);
    expect(resultado.draft.nodes[0].children[0].vinculos).toEqual(["art-2"]);
  });

  it("preserva o alinhamento existente e aplica o alerta trazido pelo arquivo", () => {
    const base = baseDraft();
    base.nodes[0].children[0].revisao = "Alerta antigo já resolvido";
    const resultado = importarMinuta(consolidado(), base);
    expect(resultado.draft.nodes[0].alignment).toBe("center");
    expect(resultado.draft.nodes[0].children[0].revisao).toBe("Conferir quórum.");
    expect(resultado.draft.nodes[0].children[1].revisao).toBe("Definir algo.");
  });

  it("recusa arquivos inválidos com mensagem clara", () => {
    expect(() => importarMinuta({ id: "x" })).toThrow("nodes");
    expect(() => importarMinuta("não é json")).toThrow("JSON válido");
    const quebrado = consolidado();
    (quebrado.nodes[0].children[0] as { approved?: unknown }).approved = "sim";
    expect(() => importarMinuta(quebrado)).toThrow("Marcação de aprovação");
  });

  it("detecta diferenças também em minutas sem base", () => {
    const resultado = importarMinuta(consolidado());
    expect(resultado.diff.novos.sort()).toEqual(["art-1", "art-3", "cap-1"].sort());
    expect(resultado.diff.removidos).toEqual([]);
  });

  it("conta estatísticas de qualquer minuta", () => {
    expect(estatisticasDaMinuta(baseDraft()).total).toBe(3);
    expect(compararMinutas(baseDraft(), baseDraft()).novos).toEqual([]);
  });
});