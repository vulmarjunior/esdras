import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { get } from "@/lib/db";
import { paraHtml, paraMarkdown, type OpcoesExportacao } from "@/lib/nova-mesa-poc/exportar";
import { validateDraft } from "@/lib/nova-mesa-poc/validate";
import { documentoOuPadrao, type DocumentoConfig } from "@/lib/nova-mesa-poc/documentos";
import type { Draft } from "@/lib/nova-mesa-poc/model";

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

export async function GET(req: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  const params = req.nextUrl.searchParams;
  let documento: DocumentoConfig;
  try {
    documento = documentoOuPadrao(params.get("doc"));
  } catch {
    return NextResponse.json({ error: "Documento desconhecido." }, { status: 400 });
  }
  const formato = params.get("formato") === "md" ? "md" : "html";
  const opcoes: OpcoesExportacao = {
    marcas: params.get("marcas") !== "0",
    sumario: params.get("sumario") === "1",
    somenteApreciados: params.get("apreciados") === "1",
  };
  const row = await get<{ content: Draft; version: number }>(
    "SELECT content, version FROM nova_mesa_drafts WHERE id = ?",
    [documento.id]
  );
  const draft = row ? validateDraft(row.content, documento) : ({ id: documento.id, nodes: [] } as Draft);
  const meta = { versao: row?.version ?? 0, data: new Date() };
  const conteudo = formato === "md" ? paraMarkdown(draft, meta, opcoes, documento) : paraHtml(draft, meta, opcoes, documento);
  return new NextResponse(conteudo, {
    headers: {
      "Content-Type": formato === "md" ? "text/markdown; charset=utf-8" : "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${documento.arquivo}-v${meta.versao}.${formato}"`,
    },
  });
}
