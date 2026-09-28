"use client";

import { useRef, useState } from "react";
import { flattenDraft, labelFor, type Draft } from "@/lib/nova-mesa-poc/model";
import { importarMinuta, resumirDiff, type ResultadoImportacao } from "@/lib/nova-mesa-poc/importar";
import { importarNovaMesaDraft } from "@/app/actions/nova-mesa-draft";

const NOMES: Record<string, string> = {
  chapter: "capítulos", section: "seções", subsection: "subseções", article: "artigos",
  paragraph: "parágrafos", inciso: "incisos", alinea: "alíneas", free: "textos livres",
};

function rotulos(draft: Draft): Map<string, string> {
  const mapa = new Map<string, string>();
  for (const row of flattenDraft(draft)) {
    mapa.set(row.node.id, labelFor(row.node, row.siblings, row.articleNumber, row.chapterNumber).trim() || row.node.type);
  }
  return mapa;
}

const amostra = (ids: string[], mapa: Map<string, string>): string => {
  const nomes = ids.slice(0, 8).map((id) => mapa.get(id) ?? id).join(", ");
  return ids.length > 8 ? `${nomes} … (+${ids.length - 8})` : nomes;
};

export default function ImportarDocumento({ versao, dirty = false, draft, onImportado }: {
  versao: number; dirty?: boolean; draft: Draft; onImportado: (novaVersao: number) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [dados, setDados] = useState<unknown>(null);
  const [previa, setPrevia] = useState<ResultadoImportacao | null>(null);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fechar = () => {
    setOpen(false); setNome(""); setDados(null); setPrevia(null); setErro(""); setMensagem("");
  };
  const escolher = async (file: File | undefined) => {
    if (!file) return;
    setErro(""); setMensagem(""); setPrevia(null); setDados(null); setNome(file.name);
    try {
      const texto = await file.text();
      const conteudo: unknown = JSON.parse(texto);
      setDados(conteudo);
      setPrevia(importarMinuta(conteudo, draft));
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível ler o arquivo.");
    }
  };
  const confirmar = async () => {
    if (dados === null || !previa) return;
    if (!window.confirm(`Substituir a minuta atual pela importada? Um marco de segurança da versão ${versao} será criado automaticamente.`)) return;
    setEnviando(true); setErro(""); setMensagem("");
    try {
      const resultado = await importarNovaMesaDraft(dados, versao);
      if (resultado.ok) {
        setMensagem(`Minuta importada como versão ${resultado.version}.`);
        setDados(null); setPrevia(null); setNome("");
        await onImportado(resultado.version);
      } else if ("conflict" in resultado) {
        setErro(`Conflito: outra sessão alterou a minuta (versão atual ${resultado.version}). Exporte uma cópia JSON e recarregue antes de importar.`);
      } else {
        setErro(resultado.error);
      }
    } catch {
      setErro("Falha ao importar. A minuta salva não foi alterada.");
    } finally {
      setEnviando(false);
    }
  };

  const rotulosAtuais = previa ? rotulos(draft) : new Map<string, string>();
  const rotulosNovos = previa ? rotulos(previa.draft) : new Map<string, string>();

  return (
    <span className="relative inline-block">
      <button type="button" className="rounded border px-3 py-1" aria-expanded={open} onClick={() => (open ? fechar() : setOpen(true))}>
        Importar JSON…
      </button>
      {open && (
        <section className="absolute right-0 top-full z-50 mt-1 max-h-[75vh] w-[min(520px,calc(100vw-32px))] space-y-3 overflow-y-auto rounded-lg border bg-background p-3 text-left shadow-xl" aria-label="Importar minuta">
          <strong className="block text-sm">Importar minuta de um arquivo JSON</strong>
          <p className="text-xs text-muted-foreground">Aceita o arquivo consolidado (com aprovações e pontos de revisão) ou a cópia JSON exportada pela Mesa. A importação substitui a minuta atual; o marco de segurança preserva a versão {versao} no histórico.</p>
          {dirty && <p className="text-xs text-amber-700">Há alterações locais não salvas; a importação descarta essas alterações e usa a versão salva (v{versao}).</p>}
          <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" aria-label="Selecionar arquivo JSON da minuta"
            onChange={(event) => { void escolher(event.target.files?.[0]); event.target.value = ""; }} />
          <div className="flex flex-wrap gap-2">
            <button type="button" className="rounded border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-semibold" onClick={() => fileRef.current?.click()}>
              Escolher arquivo…
            </button>
            {nome && <span className="self-center text-xs text-muted-foreground">{nome}</span>}
          </div>
          {erro && <p role="alert" className="text-sm text-red-700">{erro}</p>}
          {mensagem && <p role="status" className="text-sm text-emerald-700">{mensagem}</p>}
          {previa && (
            <div className="space-y-2 rounded border p-2 text-xs">
              <p className="font-semibold">Prévia · formato {previa.formato}</p>
              <p>{previa.estatisticas.total} dispositivos · {previa.estatisticas.apreciados} apreciados · {previa.estatisticas.pontosRevisao} pontos para revisão</p>
              <p className="text-muted-foreground">
                {Object.entries(previa.estatisticas.porTipo).map(([tipo, quantidade]) => `${quantidade} ${NOMES[tipo] ?? tipo}`).join(" · ")}
              </p>
              <p className="font-medium">{resumirDiff(previa.diff)}</p>
              <ul className="space-y-0.5 text-muted-foreground">
                {previa.diff.novos.length > 0 && <li><strong className="text-foreground">Novos:</strong> {amostra(previa.diff.novos, rotulosNovos)}</li>}
                {previa.diff.removidos.length > 0 && <li><strong className="text-foreground">Removidos:</strong> {amostra(previa.diff.removidos, rotulosAtuais)}</li>}
                {previa.diff.textoAlterado.length > 0 && <li><strong className="text-foreground">Texto alterado:</strong> {amostra(previa.diff.textoAlterado, rotulosNovos)}</li>}
                {previa.diff.statusAlterado.length > 0 && <li><strong className="text-foreground">Apreciação alterada:</strong> {amostra(previa.diff.statusAlterado, rotulosNovos)}</li>}
                {previa.diff.revisaoAlterada.length > 0 && <li><strong className="text-foreground">Alertas alterados:</strong> {amostra(previa.diff.revisaoAlterada, rotulosNovos)}</li>}
              </ul>
              {previa.avisos.length > 0 && <ul className="list-disc pl-4 text-amber-700">{previa.avisos.map((aviso) => <li key={aviso}>{aviso}</li>)}</ul>}
              <button type="button" disabled={enviando} className="rounded border border-primary/40 bg-primary/10 px-3 py-2 font-semibold disabled:opacity-50" onClick={() => { void confirmar(); }}>
                {enviando ? "Importando…" : `Substituir a minuta atual (v${versao})`}
              </button>
            </div>
          )}
          <div className="flex justify-end">
            <button type="button" className="rounded border px-3 py-1 text-sm" onClick={fechar}>Fechar</button>
          </div>
        </section>
      )}
    </span>
  );
}