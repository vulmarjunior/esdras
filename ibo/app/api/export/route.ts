import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getDb, all } from "@/lib/db";
import { provisionLabel } from "@/lib/data";
import { ALTERACAO_TYPE_LABELS, PENDING_CATEGORY_LABELS, REFERENCE_TYPE_LABELS } from "@/lib/labels";
import { htmlToText } from "@/lib/rich-text";

const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET || "esdras-dev-secret-nao-use-em-producao"
);

async function isAuthed(): Promise<boolean> {
  const c = await cookies();
  const token = c.get("esdras_session")?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

function download(text: string, filename: string) {
  return new NextResponse(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function GET(req: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "NÃ£o autenticado." }, { status: 401 });
  }
  const type = req.nextUrl.searchParams.get("type") || "consolidado";
  getDb();

  if (type === "consolidado") {
    const rows = await all<{ id: string; type: string; numero: string | null; titulo: string | null; redacao: string }>(`
      SELECT p.id, p.type, p.numero, p.titulo,
        COALESCE(NULLIF(p.redacao_consolidada, ''), NULLIF(p.redacao_trabalho, ''), p.texto_vigente) AS redacao
      FROM provisions p
      WHERE p.status = 'aprovado'
      ORDER BY p.ordem_pai`);
    const lines: string[] = ["ESTATUTO CONSOLIDADO", "Igreja Batista Olaria", "=".repeat(60), ""];
    for (const r of rows) {
      const label = provisionLabel(r as never);
      if (r.type === "capitulo") {
        lines.push("", label.toUpperCase() + (r.titulo ? ` â€” ${r.titulo}` : ""), "-".repeat(40), "");
      } else if (r.type === "artigo") {
        lines.push(`${label} â€” ${htmlToText(r.redacao)}`);
      } else if (r.type === "paragrafo") {
        lines.push(`    ${label.toLowerCase()}: ${htmlToText(r.redacao)}`);
      } else if (r.type === "inciso") {
        lines.push(`        ${r.numero}) ${htmlToText(r.redacao)}`);
      } else {
        lines.push(`${label}: ${htmlToText(r.redacao)}`);
      }
    }
    return download(lines.join("\n"), "estatuto-consolidado.txt");
  }

  if (type === "comparativo") {
    const rows = await all<{ id: string; numero: string | null; vigente: string; nova: string; tipo: string }>(`
      SELECT id, numero, type, texto_vigente AS vigente,
        COALESCE(NULLIF(redacao_consolidada, ''), NULLIF(redacao_trabalho, ''), NULLIF(proposta_inicial, ''), texto_vigente) AS nova
      FROM provisions WHERE type = 'artigo' ORDER BY ordem_pai`);
    const lines: string[] = ["QUADRO COMPARATIVO â€” Estatuto", "=".repeat(60), ""];
    for (const r of rows) {
      lines.push(`ART. ${r.numero}`);
      lines.push(`  VIGENTE: ${htmlToText(r.vigente) || "(nÃ£o existe)"}`);
      lines.push(`  NOVA   : ${htmlToText(r.nova) || "(sem alteraÃ§Ã£o)"}`);
      lines.push("");
    }
    return download(lines.join("\n"), "quadro-comparativo.txt");
  }

  if (type === "reforma") {
    const rows = await all<{ numero: string | null; alteracao: string; justificativa: string }>(`
      SELECT numero, alteracao_tipo AS alteracao, justificativa
      FROM provisions WHERE type = 'artigo' ORDER BY ordem_pai`);
    const lines: string[] = ["RELATÃ“RIO DA REFORMA", "=".repeat(60), ""];
    for (const r of rows) {
      lines.push(`Art. ${r.numero} | ${ALTERACAO_TYPE_LABELS[r.alteracao] || r.alteracao}`);
      if (r.justificativa) lines.push(`  Justificativa: ${htmlToText(r.justificativa)}`);
      lines.push("");
    }
    return download(lines.join("\n"), "relatorio-da-reforma.txt");
  }

  if (type === "fundamentacao") {
    const rows = await all<{ id: string; numero: string | null }>("SELECT id, numero FROM provisions WHERE type='artigo' ORDER BY ordem_pai");
    const lines: string[] = ["RELATÃ“RIO DE FUNDAMENTAÃ‡ÃƒO", "=".repeat(60), ""];
    for (const r of rows) {
      lines.push(`Art. ${r.numero}`);
      for (const t of ["biblica", "doutrinaria", "juridica", "pastoral"] as const) {
        const refs = await all<{ texto: string }>("SELECT texto FROM references_tb WHERE provision_id=? AND tipo=?", [r.id, t]);
        if (refs.length) {
          lines.push(`  ${REFERENCE_TYPE_LABELS[t]}: ${refs.map((x) => x.texto).join("; ")}`);
        }
      }
      lines.push("");
    }
    return download(lines.join("\n"), "relatorio-de-fundamentacao.txt");
  }

  if (type === "historico") {
    const lines: string[] = ["REGISTRO DOCUMENTAL DA COMISSÃƒO", "=".repeat(60), ""];
    const meetings = await all<{ id: number; numero: number; data: string }>("SELECT id, numero, data FROM meetings ORDER BY data");
    lines.push("REUNIÃ•ES:");
    for (const m of meetings) {
      const dec = await all<{ code: string }>("SELECT code FROM meeting_decisions WHERE meeting_id=?", [m.id]);
      lines.push(`  ReuniÃ£o ${m.numero} (${m.data}) â€” ${dec.length} deliberaÃ§Ãµes`);
    }
    const decisions = await all<{ code: string; texto: string }>("SELECT code, texto FROM meeting_decisions ORDER BY id");
    if (decisions.length) {
      lines.push("", "DELIBERAÃ‡Ã•ES:");
      for (const d of decisions) lines.push(`  ${d.code} â€” ${d.texto}`);
    }
    const aprovados = await all<{ numero: string | null }>("SELECT numero FROM provisions WHERE status='aprovado' AND type='artigo' ORDER BY ordem");
    if (aprovados.length) {
      lines.push("", `ARTIGOS APROVADOS (${aprovados.length}): ${aprovados.map((a) => a.numero).join(", ")}`);
    }
    const pendings = await all<{ categoria: string; descricao: string; status: string }>("SELECT categoria, descricao, status FROM pending_issues ORDER BY id");
    if (pendings.length) {
      lines.push("", "PENDÃŠNCIAS:");
      for (const p of pendings) lines.push(`  [${PENDING_CATEGORY_LABELS[p.categoria]}] ${p.descricao} (${p.status})`);
    }
    return download(lines.join("\n"), "historico-da-comissao.txt");
  }

  if (type === "atas") {
    const rows = await all<{ meeting_id: number; numero: number; data: string; conteudo: string | null; status: string }>(`
      SELECT m.id AS meeting_id, m.numero, m.data, mn.conteudo, mn.status
      FROM meetings m JOIN minutes mn ON mn.meeting_id = m.id
      WHERE mn.status = 'aprovada' ORDER BY m.data`);
    const lines: string[] = [];
    for (const r of rows) {
      lines.push("", `===== ATA REUNIÃƒO NÂº ${r.numero} (${r.data}) =====`, "");
      lines.push(r.conteudo || "");
      lines.push("", "=".repeat(60));
    }
    if (!lines.length) lines.push("Nenhuma ata aprovada.");
    return download(lines.join("\n"), "atas-aprovadas.txt");
  }

  return NextResponse.json({ error: "Tipo desconhecido." }, { status: 400 });
}
