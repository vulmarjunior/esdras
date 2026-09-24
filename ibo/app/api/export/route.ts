import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getDb, all } from "@/lib/db";
import { provisionLabel, getProposalTree, getNumerosArmazenados, type TreeNode } from "@/lib/data";
import { ALTERACAO_TYPE_LABELS, PENDING_CATEGORY_LABELS, REFERENCE_TYPE_LABELS } from "@/lib/labels";
import { rotuloCorrespondencia } from "@/lib/correspondencias";
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

function flatten(nodes: TreeNode[]): TreeNode[] {
  const out: TreeNode[] = [];
  const visitar = (lista: TreeNode[]) => {
    for (const n of lista) {
      out.push(n);
      visitar(n.children);
    }
  };
  visitar(nodes);
  return out;
}

/** Artigos da proposta (exclui revogados), na ordem da proposta. */
function artigosDaProposta(tree: TreeNode[]): TreeNode[] {
  return flatten(tree).filter((n) => n.type === "artigo" && n.alteracao_tipo !== "revogado");
}

export async function GET(req: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  const type = req.nextUrl.searchParams.get("type") || "consolidado";
  getDb();

  if (type === "consolidado") {
    const tree = await getProposalTree();
    const lines: string[] = ["ESTATUTO CONSOLIDADO", "Igreja Batista Olaria", "=".repeat(60), ""];
    const marca = (origem: string) => (origem === "novo" ? " (novo)" : "");
    const emit = (n: TreeNode) => {
      if (n.alteracao_tipo === "revogado") return;
      const approved = n.status === "aprovado";
      const hasApproved = (node: TreeNode): boolean =>
        node.alteracao_tipo !== "revogado" && (node.status === "aprovado" || node.children.some(hasApproved));
      if (!approved && !n.children.some(hasApproved)) return;
      const label = provisionLabel(n) + marca(n.origem);
      const redacao = approved
        ? n.redacao_trabalho || n.redacao_consolidada || n.texto_vigente
        : "";
      if (n.type === "capitulo") {
        lines.push("", label.toUpperCase() + (n.titulo ? ` — ${n.titulo}` : ""), "-".repeat(40), "");
      } else if (n.type === "secao") {
        lines.push("", label.toUpperCase() + (n.titulo ? ` — ${n.titulo}` : ""), "");
      } else if (n.type === "artigo") {
        lines.push(`${label} — ${htmlToText(redacao)}`);
      } else if (n.type === "paragrafo") {
        lines.push(`    ${label.toLowerCase()}: ${htmlToText(redacao)}`);
      } else if (n.type === "inciso") {
        lines.push(`        ${n.numero}) ${htmlToText(redacao)}`);
      } else {
        lines.push(`${label}: ${htmlToText(redacao)}`);
      }
      for (const c of n.children) emit(c);
    };
    for (const chapter of tree) emit(chapter);
    return download(lines.join("\n"), "estatuto-consolidado.txt");
  }

  if (type === "comparativo") {
    const tree = await getProposalTree();
    const vigentes = await getNumerosArmazenados("vigente");
    const textos = new Map(
      (await all<{ id: string; texto_vigente: string; proposta_inicial: string; redacao_trabalho: string; redacao_consolidada: string }>(
        "SELECT id, texto_vigente, proposta_inicial, redacao_trabalho, redacao_consolidada FROM provisions"
      )).map((p) => [p.id, p])
    );
    const lines: string[] = ["QUADRO COMPARATIVO — Estatuto", "=".repeat(60), ""];
    for (const n of artigosDaProposta(tree)) {
      const t = textos.get(n.id);
      const vigente = htmlToText(t?.texto_vigente || "") || "(não existe)";
      const nova =
        htmlToText(t?.redacao_trabalho || t?.redacao_consolidada || t?.proposta_inicial || t?.texto_vigente || "") ||
        "(sem alteração)";
      const vigenteNumero = vigentes.get(n.id);
      lines.push(`${provisionLabel(n).toUpperCase()} (vigente: ${vigenteNumero ? `Art. ${vigenteNumero}` : "novo"})`);
      lines.push(`  VIGENTE: ${vigente}`);
      lines.push(`  NOVA   : ${nova}`);
      lines.push("");
    }
    return download(lines.join("\n"), "quadro-comparativo.txt");
  }

  if (type === "correspondencias") {
    const tree = await getProposalTree();
    const vigentes = await getNumerosArmazenados("vigente");
    const corrRows = await all<{
      provision_id: string;
      vigente_id: string | null;
      tipo: string;
      vigente_type: string | null;
      vigente_numero: string | null;
      vigente_titulo: string | null;
    }>(`
      SELECT c.provision_id, c.vigente_id, c.tipo,
             v.type AS vigente_type, v.numero AS vigente_numero, v.titulo AS vigente_titulo
        FROM provision_correspondences c
        LEFT JOIN provisions v ON v.id = c.vigente_id
       ORDER BY c.id`);
    const porDispositivo = new Map<string, typeof corrRows>();
    for (const row of corrRows) {
      const lista = porDispositivo.get(row.provision_id) ?? [];
      lista.push(row);
      porDispositivo.set(row.provision_id, lista);
    }
    const lines: string[] = ["CORRESPONDÊNCIAS — MINUTA × ESTATUTO VIGENTE", "=".repeat(60), ""];
    const acrescimos: string[] = [];
    const supressoes: string[] = [];
    for (const n of flatten(tree)) {
      if (n.type === "capitulo" || n.type === "secao") continue;
      const label = provisionLabel(n);
      const era = vigentes.get(n.id);
      if (n.alteracao_tipo === "revogado") {
        supressoes.push(`${label}${era ? ` (vigente ${era})` : ""}`);
        continue;
      }
      const links = porDispositivo.get(n.id) ?? [];
      if (links.length === 0) {
        if (era || n.texto_vigente.trim()) {
          lines.push(`${label}${era ? ` (era ${era})` : ""} — correspondência automática, não examinada`);
        } else {
          acrescimos.push(label);
          lines.push(`${label} — acréscimo (sem correspondente declarado)`);
        }
        continue;
      }
      lines.push(`${label}${era ? ` (era ${era})` : ""}`);
      for (const link of links) {
        const destino = link.vigente_type
          ? provisionLabel({
              id: link.vigente_id ?? "",
              type: link.vigente_type,
              numero: link.vigente_numero,
              titulo: link.vigente_titulo,
            } as never)
          : "—";
        lines.push(`    ${rotuloCorrespondencia(link.tipo)}: ${destino}`);
      }
      if (links.some((link) => link.tipo === "acrescimo")) acrescimos.push(label);
    }
    lines.push("", `ACRÉSCIMOS (${acrescimos.length})`, "-".repeat(40), ...(acrescimos.length ? acrescimos : ["(nenhum)"]));
    lines.push("", `SUPRESSÕES PROPOSTAS (${supressoes.length})`, "-".repeat(40), ...(supressoes.length ? supressoes : ["(nenhuma)"]));
    return download(lines.join("\n"), "correspondencias.txt");
  }

  if (type === "reforma") {
    const tree = await getProposalTree();
    const dados = new Map(
      (await all<{ id: string; alteracao_tipo: string; justificativa: string }>(
        "SELECT id, alteracao_tipo, justificativa FROM provisions"
      )).map((p) => [p.id, p])
    );
    const lines: string[] = ["RELATÓRIO DA REFORMA", "=".repeat(60), ""];
    for (const n of artigosDaProposta(tree)) {
      const d = dados.get(n.id);
      lines.push(`${provisionLabel(n)} | ${ALTERACAO_TYPE_LABELS[d?.alteracao_tipo || ""] || d?.alteracao_tipo || ""}`);
      if (d?.justificativa) lines.push(`  Justificativa: ${htmlToText(d.justificativa)}`);
      lines.push("");
    }
    return download(lines.join("\n"), "relatorio-da-reforma.txt");
  }

  if (type === "fundamentacao") {
    const tree = await getProposalTree();
    const lines: string[] = ["RELATÓRIO DE FUNDAMENTAÇÃO", "=".repeat(60), ""];
    for (const n of artigosDaProposta(tree)) {
      lines.push(provisionLabel(n));
      for (const t of ["biblica", "doutrinaria", "juridica", "pastoral"] as const) {
        const refs = await all<{ texto: string }>("SELECT texto FROM references_tb WHERE provision_id=? AND tipo=?", [n.id, t]);
        if (refs.length) {
          lines.push(`  ${REFERENCE_TYPE_LABELS[t]}: ${refs.map((x) => x.texto).join("; ")}`);
        }
      }
      lines.push("");
    }
    return download(lines.join("\n"), "relatorio-de-fundamentacao.txt");
  }

  if (type === "historico") {
    const lines: string[] = ["REGISTRO DOCUMENTAL DA COMISSÃO", "=".repeat(60), ""];
    const meetings = await all<{ id: number; numero: number; data: string }>("SELECT id, numero, data FROM meetings ORDER BY data");
    lines.push("REUNIÕES:");
    for (const m of meetings) {
      const records = await all<{ descricao: string }>(
        "SELECT descricao FROM meeting_events WHERE meeting_id=? AND tipo='registro' ORDER BY hora, id",
        [m.id]
      );
      lines.push(`  Reunião ${m.numero} (${m.data}) — ${records.length} registro(s)`);
      for (const record of records) lines.push(`    - ${record.descricao}`);
    }
    const tree = await getProposalTree();
    const aprovados = artigosDaProposta(tree).filter((n) => n.status === "aprovado");
    if (aprovados.length) {
      lines.push("", `REDAÇÕES CONCLUÍDAS (${aprovados.length}): ${aprovados.map((a) => provisionLabel(a)).join(", ")}`);
    }
    const pendings = await all<{ categoria: string; descricao: string; status: string }>("SELECT categoria, descricao, status FROM pending_issues ORDER BY id");
    if (pendings.length) {
      lines.push("", "PENDÊNCIAS:");
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
      lines.push("", `===== ATA REUNIÃO Nº ${r.numero} (${r.data}) =====`, "");
      lines.push(r.conteudo || "");
      lines.push("", "=".repeat(60));
    }
    if (!lines.length) lines.push("Nenhuma ata finalizada.");
    return download(lines.join("\n"), "atas-finalizadas.txt");
  }

  return NextResponse.json({ error: "Tipo desconhecido." }, { status: 400 });
}
