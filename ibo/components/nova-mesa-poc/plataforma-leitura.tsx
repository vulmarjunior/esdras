"use client";

import { useState } from "react";
import { readConsultationDocument } from "@/app/actions/nova-mesa-consulta";
import { NovaMesaStatusBadge, NovaMesaStatusMark, ReviewMark } from "@/components/status-badge";
import { NOVAMESA_STATUS_LABELS, REVISAO_LABEL } from "@/lib/labels";
import { flattenDraft, labelFor, revisaoOf, statusOf, vinculosOf, type Draft, type FlatRow } from "@/lib/nova-mesa-poc/model";
import { resumoCandidato, rotuloCandidato, type CandidatoVinculo } from "@/lib/nova-mesa-poc/vinculos";
import CompararEstatuto from "./comparar-estatuto";

const NOMES: Record<string, string> = {
  chapter: "Capítulo", section: "Seção", subsection: "Subseção", article: "Artigo",
  paragraph: "Parágrafo", inciso: "Inciso", alinea: "Alínea", free: "Texto livre",
};

const DOCUMENTOS = [
  { id: "statute:current", rotulo: "Estatuto vigente", titulo: "Abrir o texto original do Estatuto vigente" },
  { id: "statute:initial", rotulo: "Proposta inicial", titulo: "Abrir a primeira proposta da reforma" },
] as const;

export type DocumentoConsultavel = { id: string; nome: string; grupo: string; resumo: string };

function resumoDaMinuta(rows: FlatRow[]) {
  const resumo = { apreciados: 0, emAnalise: 0, pendentes: 0, revisoes: 0 };
  for (const row of rows) {
    const status = statusOf(row.node);
    if (status === "aprovado") resumo.apreciados++;
    else if (status === "em_analise") resumo.emAnalise++;
    else resumo.pendentes++;
    if (revisaoOf(row.node)) resumo.revisoes++;
  }
  return resumo;
}

function TituloDispositivo({ ativo }: { ativo: FlatRow }) {
  return (
    <p className="text-sm">
      <strong>{labelFor(ativo.node, ativo.siblings, ativo.articleNumber, ativo.chapterNumber).trim()}</strong> · {NOMES[ativo.node.type] ?? ativo.node.type}{" "}
      <span className="text-muted-foreground">({NOVAMESA_STATUS_LABELS[statusOf(ativo.node)]})</span>
    </p>
  );
}

function Correspondencias({ vinculados }: { vinculados: CandidatoVinculo[] }) {
  if (!vinculados.length) {
    return <p className="text-xs leading-snug text-muted-foreground">Sem correspondente registrado. A coordenação pode criar o vínculo na Mesa, em «Vínculos com o Estatuto».</p>;
  }
  return (
    <ul className="space-y-1">
      {vinculados.map((candidato) => (
        <li key={candidato.id} className="rounded border bg-background p-2 text-xs">
          <strong className="block">{rotuloCandidato(candidato)}</strong>
          <span className="text-muted-foreground">{resumoCandidato(candidato)}</span>
        </li>
      ))}
    </ul>
  );
}

export default function PlataformaLeitura({ draft, candidatos, documentos }: { draft: Draft; candidatos: CandidatoVinculo[]; documentos: DocumentoConsultavel[] }) {
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [destacar, setDestacar] = useState(true);
  const [sumarioAberto, setSumarioAberto] = useState(false);
  const [compararAberto, setCompararAberto] = useState(false);
  const [catalogoAberto, setCatalogoAberto] = useState(false);
  const [documento, setDocumento] = useState<{ id: string; title: string; text: string } | null>(null);
  const [documentoCarregando, setDocumentoCarregando] = useState(false);
  const [documentoErro, setDocumentoErro] = useState("");
  const [buscaDocumento, setBuscaDocumento] = useState("");
  const rows = flattenDraft(draft);
  const mapa = new Map(candidatos.map((candidato) => [candidato.id, candidato]));
  const resumo = resumoDaMinuta(rows);
  const capitulos = rows.filter((row) => row.node.type === "chapter");
  const ativo = selecionado ? rows.find((row) => row.node.id === selecionado) : undefined;
  const vinculados = ativo ? vinculosOf(ativo.node).map((id) => mapa.get(id)).filter((c): c is CandidatoVinculo => !!c) : [];
  const gruposDocumentos = documentos
    .reduce<{ grupo: string; itens: DocumentoConsultavel[] }[]>((acc, doc) => {
      const existente = acc.find((item) => item.grupo === doc.grupo);
      if (existente) existente.itens.push(doc);
      else acc.push({ grupo: doc.grupo, itens: [doc] });
      return acc;
    }, [])
    .sort((a, b) => (a.grupo === "Compromissos de membresia" ? -1 : b.grupo === "Compromissos de membresia" ? 1 : 0));

  const selecionar = (id: string) => {
    setSelecionado(id);
    document.getElementById("dispositivo-" + id)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const abrirDocumento = async (id: string) => {
    setDocumento(null); setDocumentoErro(""); setBuscaDocumento(""); setDocumentoCarregando(true);
    try {
      const resultado = await readConsultationDocument(id);
      setDocumento({ id, title: resultado.title, text: resultado.text });
    } catch {
      setDocumentoErro("Não foi possível abrir o documento. Entre na sua conta e tente novamente.");
    } finally {
      setDocumentoCarregando(false);
    }
  };
  const fecharDocumento = () => { setDocumento(null); setDocumentoErro(""); setBuscaDocumento(""); };

  return (
    <div className="min-w-0 space-y-2 pb-20 xl:pb-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        <button type="button" className="rounded border px-3 py-2" aria-expanded={sumarioAberto} onClick={() => setSumarioAberto((valor) => !valor)}>
          {sumarioAberto ? "Ocultar capítulos" : "Mostrar capítulos"}
        </button>
        {DOCUMENTOS.map((item) => (
          <button key={item.id} type="button" className="rounded border px-3 py-2" title={item.titulo} onClick={() => { void abrirDocumento(item.id); }}>
            {item.rotulo}
          </button>
        ))}
        <button type="button" className="rounded border px-3 py-2" title="Compromissos de membresia e documentos doutrinários" onClick={() => setCatalogoAberto(true)}>
          Documentos
        </button>
        <span className="text-xs text-muted-foreground">
          {resumo.apreciados} apreciados · {resumo.emAnalise} em análise · {resumo.pendentes} pendentes
          {resumo.revisoes > 0 ? " · " + resumo.revisoes + (resumo.revisoes > 1 ? " pontos para revisão" : " ponto para revisão") : ""}
        </span>
      </div>

      <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start">
        {sumarioAberto && (
          <nav aria-label="Sumário da minuta" className="min-w-0 rounded-xl border bg-card p-3 xl:sticky xl:top-16 xl:max-h-[calc(100vh-5rem)] xl:w-52 xl:shrink-0 xl:overflow-y-auto">
            <h2 className="mb-2 font-semibold">Estrutura</h2>
            <div className="max-h-64 overflow-auto xl:max-h-[75vh]">
              {capitulos.length === 0 ? <p className="text-sm text-muted-foreground">A minuta ainda não possui capítulos.</p> :
                capitulos.map((row) => {
                  const status = statusOf(row.node);
                  return <button type="button" key={row.node.id} onClick={() => selecionar(row.node.id)}
                    className={"block w-full rounded px-2 py-1.5 text-left text-sm leading-snug hover:bg-muted " + (selecionado === row.node.id ? "bg-muted font-medium" : "")}
                    title={labelFor(row.node, row.siblings, row.articleNumber, row.chapterNumber) + " " + row.node.text}>
                    <span className="inline-flex items-center gap-1.5 font-medium">{status !== "pendente" && <NovaMesaStatusMark status={status} compact />}{labelFor(row.node, row.siblings, row.articleNumber, row.chapterNumber).trim()}{revisaoOf(row.node) && <ReviewMark compact />}</span>
                    <span className="line-clamp-2 break-words text-muted-foreground"> {row.node.text}</span>
                  </button>;
                })}
            </div>
          </nav>
        )}

        <div className="min-w-0 flex-1">
          <article aria-label="Minuta em elaboração" className="mx-auto min-w-0 max-w-4xl rounded-xl border bg-white p-5 text-zinc-900 shadow-sm sm:p-8">
            <h2 className="mb-7 text-center text-xl font-semibold">MINUTA DO ESTATUTO SOCIAL</h2>
            {rows.length === 0 ? <p className="text-zinc-600">A minuta ainda não possui dispositivos.</p> : rows.map((row) => {
              const revisao = revisaoOf(row.node);
              const status = statusOf(row.node);
              return <div key={row.node.id} id={"dispositivo-" + row.node.id}
                role="button" tabIndex={0} aria-pressed={selecionado === row.node.id}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selecionar(row.node.id); } }}
                onClick={() => selecionar(row.node.id)}
                className={"cursor-pointer rounded-md border-l-4 py-1.5 transition-colors " + (selecionado === row.node.id ? "border-blue-500 bg-blue-50/70" : "border-transparent hover:bg-slate-50")}>
                <div className="my-2 min-w-0 whitespace-pre-wrap break-words leading-relaxed"
                  style={{ marginLeft: Math.min(row.depth, 4) * 16, textAlign: row.node.alignment ?? "left" }}>
                  <strong>{labelFor(row.node, row.siblings, row.articleNumber, row.chapterNumber)}</strong>{row.node.text}
                  {status !== "pendente" && <NovaMesaStatusBadge status={status} className="ml-2 align-middle" />}
                  {revisao && <ReviewMark className="ml-2 align-middle" />}
                </div>
                {revisao && <details className="mb-2 rounded border border-amber-300 bg-amber-50/70 p-3 text-sm text-amber-900" style={{ marginLeft: Math.min(row.depth, 4) * 16 + 16 }}>
                  <summary className="cursor-pointer font-semibold">{REVISAO_LABEL}</summary>
                  <p className="mt-1 whitespace-pre-wrap break-words">{revisao}</p>
                </details>}
              </div>;
            })}
          </article>
        </div>

        <aside aria-label="Consulta comparativa" className="hidden min-w-0 space-y-3 rounded-xl border bg-card p-3 xl:sticky xl:top-16 xl:block xl:max-h-[calc(100vh-5rem)] xl:w-[26rem] xl:shrink-0 xl:overflow-y-auto 2xl:w-[28rem]">
          <h2 className="font-semibold">Consulta comparativa</h2>
          {!ativo ? (
            <p className="text-sm text-muted-foreground">Clique em um dispositivo no documento (ou no sumário) para ver a redação atual, a correspondência no Estatuto e a comparação.</p>
          ) : (
            <>
              <TituloDispositivo ativo={ativo} />
              <section className="min-w-0 space-y-1 rounded-lg border p-2">
                <h4 className="text-xs font-semibold">Redação atual</h4>
                <p className="whitespace-pre-wrap break-words text-sm leading-7">{ativo.node.text || "(sem redação)"}</p>
              </section>
              <section className="min-w-0 space-y-1">
                <h4 className="text-xs font-semibold">Correspondência no Estatuto</h4>
                <Correspondencias vinculados={vinculados} />
              </section>
              <button type="button" className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
                onClick={() => setCompararAberto(true)}>
                Comparar com o Estatuto…
              </button>
            </>
          )}
        </aside>
      </div>

      {ativo && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-3 py-2 backdrop-blur xl:hidden">
          <button type="button" className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
            onClick={() => setCompararAberto(true)}>
            Consultar {labelFor(ativo.node, ativo.siblings, ativo.articleNumber, ativo.chapterNumber).trim()} — vigente e proposta inicial
          </button>
        </div>
      )}

      {compararAberto && ativo && (
        <div role="dialog" aria-modal="true" aria-label="Consulta comparativa" onClick={() => setCompararAberto(false)}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-2 sm:items-center">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-t-2xl border bg-background p-4 shadow-2xl sm:rounded-2xl"
            onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">Consulta comparativa</h2>
              <button type="button" className="rounded border px-3 py-1.5 text-sm" onClick={() => setCompararAberto(false)}>Fechar</button>
            </div>
            <TituloDispositivo ativo={ativo} />
            <label className="my-3 flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={destacar} onChange={(event) => setDestacar(event.target.checked)} />
              Destacar diferenças em relação à redação atual
            </label>
            <CompararEstatuto redacaoAtual={ativo.node.text} candidatos={vinculados} destacar={destacar} />
          </div>
        </div>
      )}

      {(documentoCarregando || documento || documentoErro) && (
        <div role="dialog" aria-modal="true" aria-label="Leitura do documento" onClick={fecharDocumento}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-2 sm:items-center">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl border bg-background p-4 shadow-2xl sm:rounded-2xl"
            onClick={(event) => event.stopPropagation()}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">{documento?.title ?? "Documento do Estatuto"}</h2>
              <button type="button" className="rounded border px-3 py-1.5 text-sm" onClick={fecharDocumento}>Fechar</button>
            </div>
            {documentoCarregando && <p role="status" className="text-sm text-muted-foreground">Carregando…</p>}
            {documentoErro && <p role="alert" className="text-sm text-red-700">{documentoErro}</p>}
            {documento && (
              <>
                <input value={buscaDocumento} onChange={(event) => setBuscaDocumento(event.target.value)} placeholder="Localizar trecho no documento" aria-label="Localizar no documento"
                  className="mb-2 w-full rounded border px-3 py-2 text-sm" />
                <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words rounded border bg-muted/30 p-4 font-serif text-sm leading-relaxed">
                  {buscaDocumento
                    ? documento.text.split("\n").filter((linha) => linha.toLocaleLowerCase().includes(buscaDocumento.toLocaleLowerCase())).join("\n") || "Nenhum trecho encontrado."
                    : documento.text}
                </pre>
              </>
            )}
          </div>
        </div>
      )}

      {catalogoAberto && (
        <div role="dialog" aria-modal="true" aria-label="Documentos para consulta" onClick={() => setCatalogoAberto(false)}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-2 sm:items-center">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl border bg-background p-4 shadow-2xl sm:rounded-2xl"
            onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">Documentos para consulta</h2>
              <button type="button" className="rounded border px-3 py-1.5 text-sm" onClick={() => setCatalogoAberto(false)}>Fechar</button>
            </div>
            <div className="space-y-4">
              {gruposDocumentos.map((grupo) => (
                <section key={grupo.grupo} className="space-y-1">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{grupo.grupo}</h3>
                  {grupo.itens.map((doc) => (
                    <button key={doc.id} type="button" className="block w-full rounded border bg-card p-3 text-left transition-colors hover:bg-muted"
                      onClick={() => { setCatalogoAberto(false); void abrirDocumento("confession:" + doc.id); }}>
                      <strong className="block text-sm">{doc.nome}</strong>
                      <span className="text-xs text-muted-foreground">{doc.resumo}</span>
                    </button>
                  ))}
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}