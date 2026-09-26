import { describe, expect, it } from "vitest";
import { corpoDocumento, paraHtml, paraMarkdown } from "./exportar";
import type { Draft, DraftNode } from "./model";

const artigo = (id: string, texto: string, status?: DraftNode["status"], children: DraftNode[] = []): DraftNode => ({ id, type: "article", text: texto, status, children });
const draft = (): Draft => ({
  id: "estatuto-ibo-2026",
  nodes: [
    {
      id: "cap-1",
      type: "chapter",
      text: "Dos fins",
      children: [
        artigo("art-1", "Uma associação religiosa.", "aprovado", [
          { id: "art-1-p1", type: "paragraph", text: "Parágrafo com <marca> e & símbolos.", children: [] },
        ]),
        artigo("art-2", "Texto em revisão.", "em_analise"),
        artigo("art-3", "Texto nunca tocado."),
      ],
    },
  ],
});
const meta = { versao: 7, data: new Date("2026-09-26T14:30:00-04:00") };

describe("exportação da nova minuta", () => {
  it("gera markdown com legenda, rubricas e hierarquia", () => {
    const md = paraMarkdown(draft(), meta);
    expect(md).toContain("# Minuta do Estatuto Social");
    expect(md).toContain("Versão 7");
    expect(md).toContain("Documento de trabalho — minuta em elaboração");
    expect(md).toContain("✓ Apreciado pela comissão");
    expect(md).toContain("● Em análise");
    expect(md).toContain("○ Pendente de análise");
    expect(md).toContain("## CAPÍTULO I — Dos fins");
    expect(md).toContain("**Art. 1º**");
    expect(md).toContain("✓ **Art. 1º**");
    expect(md).toContain("● **Art. 2º**");
    expect(md).toContain("○ **Art. 3º**");
  });

  it("escapa marcação vinda do texto no markdown e no html", () => {
    const md = paraMarkdown(draft(), meta);
    expect(md).toContain("Parágrafo com &lt;marca&gt; e &amp; símbolos.");
    expect(md).not.toContain("<marca>");
    const html = paraHtml(draft(), meta);
    expect(html).toContain("&lt;marca&gt; e &amp; símbolos.");
    expect(html).not.toContain("<marca>");
  });

  it("filtra somente os apreciados mantendo capítulos e ancestrais", () => {
    const md = paraMarkdown(draft(), meta, { somenteApreciados: true });
    expect(md).toContain("CAPÍTULO I");
    expect(md).toContain("Art. 1º");
    expect(md).not.toContain("Art. 2º");
    expect(md).not.toContain("Art. 3º");
  });

  it("respeita a opção de esconder as marcas", () => {
    const html = paraHtml(draft(), meta, { marcas: false });
    expect(html).not.toContain('class="rubrica');
    expect(html).not.toContain('class="legenda"');
    expect(html).not.toContain('class="dispositivo dispositivo-apreciado"');
    const md = paraMarkdown(draft(), meta, { marcas: false });
    expect(md).not.toContain("**Legenda:**");
    expect(md).not.toContain("✓ ");
  });

  it("inclui o sumário quando pedido e o cabeçalho institucional sempre", () => {
    const html = paraHtml(draft(), meta, { sumario: true });
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("Igreja Batista Olaria");
    expect(html).toContain("Comissão de Reforma do Estatuto Social");
    expect(html).toContain("class=\"sumario\"");
    expect(html).toContain("CAPÍTULO I — Dos fins");
    expect(html).toContain("dispositivo-apreciado");
  });

  it("renderiza negrito itálico e sublinhado", () => {
    const comRuns: Draft = {
      id: "estatuto-ibo-2026",
      nodes: [artigo("art-1", "Fé viva", "aprovado")],
    };
    comRuns.nodes[0].runs = [
      { text: "Fé ", marks: ["italic"] },
      { text: "viva", marks: ["bold", "underline"] },
    ];
    const html = corpoDocumento(comRuns, meta);
    expect(html).toContain("<em>Fé </em>");
    expect(html).toContain("<strong><u>viva</u></strong>");
    const md = paraMarkdown(comRuns, meta);
    expect(md).toContain("*Fé *");
    expect(md).toContain("**<u>viva</u>**");
  });

  it("avisa quando não há dispositivos apreciados", () => {
    const semApreciados: Draft = { id: "estatuto-ibo-2026", nodes: [artigo("art-1", "Pendente.")] };
    const md = paraMarkdown(semApreciados, meta, { somenteApreciados: true });
    expect(md).toContain("(Nenhum dispositivo apreciado pela comissão.)");
  });
});
