import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { converterCompromisso } from "../scripts/parse-compromisso.mjs";
import { COMPROMISSO_MEMBRESIA, ESTATUTO } from "../lib/nova-mesa-poc/documentos";
import { validateDraft } from "../lib/nova-mesa-poc/validate";
import { flattenDraft } from "../lib/nova-mesa-poc/model";
import { paraHtml, paraMarkdown } from "../lib/nova-mesa-poc/exportar";

const fonte = fileURLToPath(new URL("../../Documentos fonte/Compromisso_de_Membresia_IBO_versao_definitiva.txt", import.meta.url));

const draft = () => validateDraft(converterCompromisso(readFileSync(fonte, "utf-8")), COMPROMISSO_MEMBRESIA);

describe("Compromisso de Membresia editável", () => {
  it("converte o texto definitivo em capítulos, seções e blocos livres válidos", () => {
    const documento = draft();
    const rows = flattenDraft(documento);
    expect(documento.id).toBe(COMPROMISSO_MEMBRESIA.id);
    expect(rows.filter((row) => row.node.type === "chapter")).toHaveLength(5);
    expect(rows.filter((row) => row.node.type === "article")).toHaveLength(13);
    expect(rows.length).toBeGreaterThan(80);
    for (const row of rows) expect(COMPROMISSO_MEMBRESIA.tipos).toContain(row.node.type);
    expect(new Set(rows.map((row) => row.node.id)).size).toBe(rows.length);
  });

  it("rotula capítulos em romanos e seções com o número do documento", () => {
    const rows = flattenDraft(draft());
    const capitulo = rows.find((row) => row.node.id === "cap-1")!;
    const secao = rows.find((row) => row.node.id === "sec-1")!;
    expect(COMPROMISSO_MEMBRESIA.rotular(capitulo.node, capitulo.siblings, capitulo.articleNumber, capitulo.chapterNumber)).toBe("CAPÍTULO I");
    expect(COMPROMISSO_MEMBRESIA.rotular(secao.node, secao.siblings, secao.articleNumber, secao.chapterNumber)).toBe("1. ");
    expect(secao.node.text).toBe("DAS ESCRITURAS SAGRADAS");
  });

  it("rejeita identificação e hierarquia de outro documento", () => {
    expect(() => validateDraft(converterCompromisso("CAPÍTULO I — TESTE\n\n1. SEÇÃO\n\nTexto."), ESTATUTO)).toThrow();
    expect(() => validateDraft({ id: COMPROMISSO_MEMBRESIA.id, nodes: [{ id: "x", type: "paragraph", text: "x", children: [] }] }, COMPROMISSO_MEMBRESIA)).toThrow();
  });

  it("exporta com o cabeçalho e o sumário do Compromisso", () => {
    const meta = { versao: 1, data: new Date("2026-10-05T10:00:00-04:00") };
    const md = paraMarkdown(draft(), meta, { sumario: true }, COMPROMISSO_MEMBRESIA);
    expect(md).toContain("# Compromisso de Membresia");
    expect(md).toContain("CAPÍTULO I");
    expect(md).toContain("**1.** **DAS ESCRITURAS SAGRADAS**");
    expect(md).toContain("DAS ESCRITURAS SAGRADAS");
    const html = paraHtml(draft(), meta, {}, COMPROMISSO_MEMBRESIA);
    expect(html).toContain("<h1>Compromisso de Membresia</h1>");
    expect(html).not.toContain("Minuta do Estatuto Social");
  });
});
