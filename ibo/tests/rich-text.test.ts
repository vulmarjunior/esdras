import { describe, expect, it } from "vitest";
import { sanitizeHtml, isHtml, plainToHtml, htmlToText, renderRichText } from "../lib/rich-text";

describe("sanitizeHtml", () => {
  it("mantém tags textuais e background-color", () => {
    expect(sanitizeHtml("<b>negrito</b> <mark style=\"background-color:#fde68a\">destacado</mark>")).toBe(
      '<b>negrito</b> <mark style="background-color:#fde68a">destacado</mark>'
    );
  });
  it("remove script, iframe e atributos perigosos", () => {
    expect(sanitizeHtml('<script>alert(1)</script><b onclick="x()">ok</b>')).toBe("<b>ok</b>");
    expect(sanitizeHtml("<iframe src='http://x'></iframe>texto")).toBe("texto");
  });
  it("remove tags não permitidas mantendo o texto", () => {
    expect(sanitizeHtml("a <div> b <h1>c</h1></div>")).toBe("a <div> b c</div>");
  });
  it("normaliza nbsp e espaços no início/fim", () => {
    expect(sanitizeHtml("texto&nbsp; ")).toBe("texto");
    expect(sanitizeHtml("  a  b  ")).toBe("a b");
  });
});

describe("isHtml", () => {
  it("detecta HTML rico e não detecta texto puro", () => {
    expect(isHtml("<b>x</b>")).toBe(true);
    expect(isHtml("texto simples")).toBe(false);
    expect(isHtml("linha 1\nlinha 2")).toBe(false);
  });
});

describe("plainToHtml / htmlToText", () => {
  it("converte texto puro em HTML escapado com <br>", () => {
    expect(plainToHtml("a <b>\nc")).toBe("a &lt;b&gt;<br>c");
  });
  it("converte HTML de volta em texto puro", () => {
    expect(htmlToText("<b>a</b><br>linha 2")).toBe("a\nlinha 2");
    expect(htmlToText("&amp; &nbsp;")).toBe("&");
  });
});

describe("renderRichText", () => {
  it("renderiza HTML sanitizado ou texto puro escapado", () => {
    expect(renderRichText("<b>ok</b>")).toBe("<b>ok</b>");
    expect(renderRichText("linha1\nlinha2")).toBe("linha1<br>linha2");
  });
});