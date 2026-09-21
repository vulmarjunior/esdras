import { describe, it, expect } from "vitest";
import { strToU8, zipSync } from "fflate";
import { parseEpub, secoesDeXhtml, textoDeHtml, decodificarEntidades } from "../lib/literatura/epub";

function epubFake(): Uint8Array {
  const opf = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Livro de Teste</dc:title>
    <dc:creator>Autor de Teste</dc:creator>
    <dc:date>2020-05-01</dc:date>
  </metadata>
  <manifest>
    <item id="capa" href="Text/capa.xhtml" media-type="application/xhtml+xml"/>
    <item id="c1" href="Text/cap1.xhtml" media-type="application/xhtml+xml"/>
    <item id="c2" href="Text/cap2.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="capa"/>
    <itemref idref="c1"/>
    <itemref idref="c2"/>
  </spine>
</package>`;

  return zipSync({
    "META-INF/container.xml": strToU8(
      `<?xml version="1.0"?><container version="1.0"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`
    ),
    "OEBPS/content.opf": strToU8(opf),
    "OEBPS/Text/capa.xhtml": strToU8(
      `<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Capa</title></head><body><h1>Capa</h1><p>imagem</p></body></html>`
    ),
    "OEBPS/Text/cap1.xhtml": strToU8(
      `<html xmlns="http://www.w3.org/1999/xhtml"><head><title>1</title></head><body><h1>Capítulo Um</h1><p>Primeiro parágrafo &amp; teste.</p><p>Segundo parágrafo.</p></body></html>`
    ),
    "OEBPS/Text/cap2.xhtml": strToU8(
      `<html xmlns="http://www.w3.org/1999/xhtml"><body><h1>Capítulo Dois</h1><p>Conteúdo do segundo capítulo.</p></body></html>`
    ),
  });
}

describe("decodificarEntidades", () => {
  it("decodifica entidades nomeadas, numéricas e hexadecimais", () => {
    expect(decodificarEntidades("fé &amp; pr&aacute;tica")).toBe("fé & prática");
    expect(decodificarEntidades("caf&#233;")).toBe("café");
    expect(decodificarEntidades("caf&#xE9;")).toBe("café");
  });
});

describe("secoesDeXhtml", () => {
  it("converte h1 em título e p em parágrafos", () => {
    const secoes = secoesDeXhtml(
      `<html><body><h1>Capítulo</h1><p>Um parágrafo <span>com marcação</span>.</p><p>Outro.</p></body></html>`
    );
    expect(secoes).toHaveLength(1);
    expect(secoes[0].titulo).toBe("Capítulo");
    expect(secoes[0].conteudo).toContain("Um parágrafo com marcação.");
    expect(secoes[0].conteudo).toContain("Outro.");
  });

  it("ignora o conteúdo do head e scripts", () => {
    const secoes = secoesDeXhtml(
      `<html><head><title>Título interno</title><style>p{color:red}</style></head><body><h2>Seção</h2><p>Texto.</p><script>x()</script></body></html>`
    );
    expect(secoes).toHaveLength(1);
    expect(secoes[0].titulo).toBe("Seção");
    expect(secoes[0].conteudo).not.toContain("color:red");
    expect(secoes[0].conteudo).not.toContain("x()");
  });
});

describe("parseEpub", () => {
  it("lê metadados, respeita a ordem do spine e ignora capa", () => {
    const { meta, secoes } = parseEpub(epubFake());
    expect(meta.titulo).toBe("Livro de Teste");
    expect(meta.autor).toBe("Autor de Teste");
    expect(meta.ano).toBe(2020);
    expect(secoes.map((s) => s.titulo)).toEqual(["Capítulo Um", "Capítulo Dois"]);
    expect(secoes[0].conteudo).toContain("Primeiro parágrafo & teste.");
    expect(secoes[0].conteudo).toContain("Segundo parágrafo.");
    expect(secoes[1].conteudo).toContain("Conteúdo do segundo capítulo.");
  });

  it("rejeita arquivo que não é EPUB", () => {
    expect(() => parseEpub(strToU8("não é um zip"))).toThrow();
  });
});

describe("textoDeHtml", () => {
  it("remove tags e normaliza espaços", () => {
    expect(textoDeHtml("<p>Olá   <b>mundo</b></p>")).toBe("Olá mundo");
  });
});
