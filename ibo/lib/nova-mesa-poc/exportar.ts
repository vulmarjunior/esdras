import { flattenDraft, labelFor, statusOf, type Draft, type DraftNode, type NovaMesaStatus } from "./model";
import type { Mark, TextRun } from "./rich-text";
import { NOVAMESA_STATUS_LABELS } from "../labels";

export type OpcoesExportacao = { marcas?: boolean; sumario?: boolean; somenteApreciados?: boolean };
export type MetaDocumento = { versao: number; data: Date };

const SIMBOLOS: Record<NovaMesaStatus, string> = { pendente: "○", em_analise: "●", aprovado: "✓" };

const formatarDataHora = (data: Date): string =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Porto_Velho", dateStyle: "short", timeStyle: "short" }).format(data);

const escapeHtml = (texto: string): string =>
  texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const escapeMd = (texto: string): string => texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Mantém o dispositivo e seus ancestrais quando a subárvore tem algo apreciado. */
const podar = (nodes: DraftNode[]): DraftNode[] => {
  const manter = (node: DraftNode): boolean => statusOf(node) === "aprovado" || node.children.some(manter);
  return nodes.filter(manter).map((node) => ({ ...node, children: podar(node.children) }));
};

const runsDoTexto = (node: DraftNode): TextRun[] => (node.runs?.length ? node.runs : [{ text: node.text, marks: [] }]);

const runsHtml = (node: DraftNode): string => {
  const runs = runsDoTexto(node);
  const ordem: Mark[] = ["bold", "italic", "underline"];
  return runs
    .map((run) => {
      let html = escapeHtml(run.text).replace(/\n/g, "<br/>");
      for (const mark of [...ordem].reverse()) {
        if (!run.marks.includes(mark)) continue;
        html = mark === "bold" ? `<strong>${html}</strong>` : mark === "italic" ? `<em>${html}</em>` : `<u>${html}</u>`;
      }
      return html;
    })
    .join("");
};

const runsMarkdown = (node: DraftNode): string => {
  const runs = runsDoTexto(node);
  return runs
    .map((run) => {
      let out = escapeMd(run.text);
      if (run.marks.includes("underline")) out = `<u>${out}</u>`;
      if (run.marks.includes("italic")) out = `*${out}*`;
      if (run.marks.includes("bold")) out = `**${out}**`;
      return out;
    })
    .join("")
    .replace(/\n/g, "  \n");
};

const estrutura = (node: DraftNode): boolean => ["chapter", "section", "subsection"].includes(node.type);

const conteudoVisivel = (draft: Draft, opcoes: OpcoesExportacao): DraftNode[] =>
  (opcoes.somenteApreciados ? podar(draft.nodes) : draft.nodes);

const legendaHtml = (): string =>
  `<ul class="legenda">${(["aprovado", "em_analise", "pendente"] as NovaMesaStatus[])
    .map((status) => `<li><span class="rubrica rubrica-${status}" aria-hidden="true">${SIMBOLOS[status]}</span>${NOVAMESA_STATUS_LABELS[status]}</li>`)
    .join("")}</ul>`;

const sumarioHtml = (rows: ReturnType<typeof flattenDraft>): string => {
  const itens = rows.filter((row) => row.node.type === "chapter" || row.node.type === "section");
  if (!itens.length) return "";
  return `<nav class="sumario"><h2>Sumário</h2><ul>${itens
    .map((row) => {
      const rotulo = escapeHtml(labelFor(row.node, row.siblings, row.articleNumber, row.chapterNumber).trim());
      const titulo = row.node.text ? ` — ${escapeHtml(row.node.text)}` : "";
      return `<li style="margin-left:${Math.min(row.depth, 3)}em">${rotulo}${titulo}</li>`;
    })
    .join("")}</ul></nav>`;
};

export const ESTILO_DOCUMENTO = `
@page { size: A4; margin: 18mm 16mm 20mm; }
:root { color-scheme: light; }
* { box-sizing: border-box; }
body { margin: 0; background: #f4f2ee; color: #1f2937; font-family: "Lora", Georgia, "Times New Roman", serif; }
.documento { max-width: 46rem; margin: 0 auto; padding: 2.4rem 2.6rem 3rem; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
.cabecalho { text-align: center; border-bottom: 1px solid #d6d3d1; padding-bottom: 1rem; margin-bottom: 1rem; }
.instituicao { margin: 0; font-size: .72rem; letter-spacing: .18em; text-transform: uppercase; color: #57534e; }
.comissao { margin: .15rem 0 .7rem; font-size: .72rem; color: #78716c; }
.documento h1 { margin: 0 0 .5rem; font-size: 1.35rem; }
.meta { margin: 0; font-size: .75rem; color: #57534e; }
.aviso { margin: .45rem 0 0; font-size: .72rem; color: #92400e; }
.legenda { list-style: none; display: flex; flex-wrap: wrap; gap: .35rem 1rem; justify-content: center; padding: 0; margin: .7rem 0 0; font-size: .72rem; color: #44403c; }
.legenda li { display: inline-flex; align-items: center; gap: .3rem; }
.sumario { border: 1px solid #e7e5e4; padding: .8rem 1rem; margin: 0 0 1.3rem; font-size: .85rem; break-inside: avoid; }
.sumario h2 { margin: 0 0 .4rem; font-size: .8rem; letter-spacing: .08em; text-transform: uppercase; color: #57534e; }
.sumario ul { list-style: none; margin: 0; padding: 0; }
.sumario li { margin: .15rem 0; }
.minuta { margin: 0; }
.dispositivo { display: flex; align-items: flex-start; gap: .45rem; margin: .55rem 0; padding: .25rem .4rem; break-inside: avoid; page-break-inside: avoid; }
.dispositivo-apreciado { background: #ecfdf5; border-left: 2px solid #34d399; }
.rubrica { display: inline-block; min-width: 1.1em; text-align: center; font-family: system-ui, sans-serif; font-size: .78rem; color: #a8a29e; }
.rubrica-aprovado { color: #059669; font-weight: 700; }
.rubrica-em_analise { color: #2563eb; }
.rubrica-pendente { color: #a8a29e; }
.rotulo { font-weight: 600; white-space: nowrap; }
.texto { white-space: normal; }
.rodape { margin: 2rem 0 0; padding-top: .6rem; border-top: 1px solid #e7e5e4; font-size: .7rem; color: #78716c; text-align: center; }
@media print {
  body { background: #fff; }
  .documento { max-width: none; padding: 0; box-shadow: none; }
  .dispositivo-apreciado { background: #ecfdf5 !important; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  .rubrica { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
}
`;

/** Corpo do documento (cabeçalho, legenda, sumário e dispositivos) compartilhado pela impressão e pelo HTML exportado. */
export function corpoDocumento(draft: Draft, meta: MetaDocumento, opcoes: OpcoesExportacao = {}): string {
  const marcas = opcoes.marcas !== false;
  const rows = flattenDraft({ id: draft.id, nodes: conteudoVisivel(draft, opcoes) });
  const linhas = rows
    .map((row) => {
      const status = statusOf(row.node);
      const marcar = marcas && (!estrutura(row.node) || status !== "pendente");
      const apreciado = marcar && status === "aprovado";
      const rubrica = marcar
        ? `<span class="rubrica rubrica-${status}" title="${escapeHtml(NOVAMESA_STATUS_LABELS[status])}" aria-label="${escapeHtml(NOVAMESA_STATUS_LABELS[status])}">${SIMBOLOS[status]}</span>`
        : "";
      const rotulo = escapeHtml(labelFor(row.node, row.siblings, row.articleNumber, row.chapterNumber).trim());
      const alinhamento = row.node.alignment ?? (estrutura(row.node) ? "center" : "justify");
      return `<div class="dispositivo${apreciado ? " dispositivo-apreciado" : ""}" style="margin-left:${Math.min(row.depth, 4) * 1.4}em">${rubrica}<span class="rotulo">${rotulo}</span><span class="texto" style="text-align:${alinhamento}">${runsHtml(row.node)}</span></div>`;
    })
    .join("\n");
  const vazio = opcoes.somenteApreciados ? "(Nenhum dispositivo apreciado pela comissão.)" : "(A minuta ainda não possui dispositivos.)";
  return `<main class="documento">
<header class="cabecalho">
<p class="instituicao">Igreja Batista Olaria</p>
<p class="comissao">Comissão de Reforma do Estatuto Social</p>
<h1>Minuta do Estatuto Social</h1>
<p class="meta">Versão ${meta.versao} · gerada em ${escapeHtml(formatarDataHora(meta.data))} · ESDRAS</p>
<p class="aviso">Documento de trabalho — minuta em elaboração; não é a versão final.</p>
${marcas ? legendaHtml() : ""}
</header>
${opcoes.sumario ? sumarioHtml(rows) : ""}
<article class="minuta">${linhas || `<p>${vazio}</p>`}</article>
<p class="rodape">ESDRAS · versão ${meta.versao} · ${escapeHtml(formatarDataHora(meta.data))}</p>
</main>`;
}

export function paraHtml(draft: Draft, meta: MetaDocumento, opcoes: OpcoesExportacao = {}): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Minuta do Estatuto Social — versão ${meta.versao}</title>
<style>${ESTILO_DOCUMENTO}</style>
</head>
<body>
${corpoDocumento(draft, meta, opcoes)}
</body>
</html>`;
}

export function paraMarkdown(draft: Draft, meta: MetaDocumento, opcoes: OpcoesExportacao = {}): string {
  const marcas = opcoes.marcas !== false;
  const rows = flattenDraft({ id: draft.id, nodes: conteudoVisivel(draft, opcoes) });
  const linhas: string[] = [
    "# Minuta do Estatuto Social",
    "",
    "**Igreja Batista Olaria** · Comissão de Reforma do Estatuto Social",
    "",
    `Versão ${meta.versao} · gerada em ${formatarDataHora(meta.data)} · ESDRAS`,
    "",
    "> Documento de trabalho — minuta em elaboração; não é a versão final.",
    "",
  ];
  if (marcas) {
    const legenda = (["aprovado", "em_analise", "pendente"] as NovaMesaStatus[])
      .map((status) => `${SIMBOLOS[status]} ${NOVAMESA_STATUS_LABELS[status]}`)
      .join(" · ");
    linhas.push(`**Legenda:** ${legenda}`, "");
  }
  if (opcoes.sumario) {
    const itens = rows.filter((row) => row.node.type === "chapter" || row.node.type === "section");
    if (itens.length) {
      linhas.push("## Sumário", "");
      for (const row of itens) {
        const rotulo = labelFor(row.node, row.siblings, row.articleNumber, row.chapterNumber).trim();
        const titulo = row.node.text ? ` — ${escapeMd(row.node.text)}` : "";
        linhas.push(`${"  ".repeat(Math.min(row.depth, 3))}- ${escapeMd(rotulo)}${titulo}`);
      }
      linhas.push("");
    }
  }
  for (const row of rows) {
    const status = statusOf(row.node);
    const marca = marcas && (!estrutura(row.node) || status !== "pendente") ? `${SIMBOLOS[status]} ` : "";
    const rotulo = labelFor(row.node, row.siblings, row.articleNumber, row.chapterNumber).trim();
    if (row.node.type === "chapter") {
      linhas.push("", `## ${marca}${escapeMd(rotulo)}${row.node.text ? ` — ${escapeMd(row.node.text)}` : ""}`, "");
    } else if (row.node.type === "section" || row.node.type === "subsection") {
      linhas.push("", `### ${marca}${escapeMd(rotulo)}${row.node.text ? ` — ${escapeMd(row.node.text)}` : ""}`, "");
    } else if (row.node.type === "free") {
      linhas.push("", `${marca}${runsMarkdown(row.node)}`, "");
    } else {
      linhas.push(`${"  ".repeat(Math.max(0, row.depth - 1))}${marca}**${escapeMd(rotulo)}** ${runsMarkdown(row.node)}`);
    }
  }
  if (!rows.length) linhas.push(opcoes.somenteApreciados ? "(Nenhum dispositivo apreciado pela comissão.)" : "(A minuta ainda não possui dispositivos.)");
  linhas.push("", "---", `ESDRAS · versão ${meta.versao} · ${formatarDataHora(meta.data)}`);
  return linhas.join("\n");
}
