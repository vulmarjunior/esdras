"use client";

import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BookOpen, ChevronDown, ChevronRight, FileUp, Loader2, Trash2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog, type ConfirmDialogState } from "@/components/confirm-dialog";
import { createBook, deleteBook, replaceSections, updateBook } from "@/app/actions/literatura";
import { parseMarkdown, sugerirResumo } from "@/lib/literatura/parse";
import { parseEpub } from "@/lib/literatura/epub";
import type { LivroBiblioteca, SecaoImportada } from "@/lib/literatura/types";
import { cn } from "@/lib/utils";

export interface LivroAdmin extends LivroBiblioteca {
  secoes_count: number;
}

const inputCls = "h-9 w-full rounded-md border bg-background px-3 text-sm";
const areaCls = "w-full rounded-md border bg-background px-3 py-2 text-sm";

interface FormLivro {
  titulo: string;
  autor: string;
  ano: string;
  fonte: string;
  resumo: string;
}

const FORM_VAZIO: FormLivro = { titulo: "", autor: "", ano: "", fonte: "", resumo: "" };

export function LibraryAdmin({ livros }: { livros: LivroAdmin[] }) {
  const [reimportando, setReimportando] = useState<LivroAdmin | null>(null);

  return (
    <div className="space-y-6">
      <ImportCard
        livro={reimportando}
        onCancelar={() => setReimportando(null)}
        onConcluir={() => setReimportando(null)}
      />
      <BooksCard livros={livros} onReimportar={setReimportando} />
    </div>
  );
}

function ImportCard({
  livro,
  onCancelar,
  onConcluir,
}: {
  livro: LivroAdmin | null;
  onCancelar: () => void;
  onConcluir: () => void;
}) {
  const router = useRouter();
  const arquivoRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormLivro>(FORM_VAZIO);
  const [secoes, setSecoes] = useState<SecaoImportada[] | null>(null);
  const [colado, setColado] = useState("");
  const [aberta, setAberta] = useState<number | null>(null);
  const [pending, setPending] = useState(false);

  function limpar() {
    setForm(FORM_VAZIO);
    setSecoes(null);
    setColado("");
    setAberta(null);
    if (arquivoRef.current) arquivoRef.current.value = "";
  }

  async function lerArquivo(file: File) {
    const nome = file.name.toLowerCase();
    try {
      if (nome.endsWith(".epub")) {
        const { meta, secoes: importadas } = parseEpub(new Uint8Array(await file.arrayBuffer()));
        setForm((f) => ({
          ...f,
          titulo: f.titulo || meta.titulo,
          autor: f.autor || meta.autor,
          ano: f.ano || (meta.ano ? String(meta.ano) : ""),
        }));
        setSecoes(importadas);
      } else if (nome.endsWith(".md") || nome.endsWith(".txt")) {
        const importadas = parseMarkdown(await file.text());
        setForm((f) => ({ ...f, titulo: f.titulo || file.name.replace(/\.(md|txt)$/i, "") }));
        setSecoes(importadas);
      } else {
        toast.error("Formato não suportado. Use .md, .txt ou .epub.");
        return;
      }
      toast.success("Arquivo analisado. Revise as seções antes de salvar.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível ler o arquivo.");
    }
  }

  function analisarTexto() {
    if (!colado.trim()) return toast.error("Cole o texto do livro primeiro.");
    setSecoes(parseMarkdown(colado));
    toast.success("Texto analisado. Revise as seções antes de salvar.");
  }

  function editarTitulo(i: number, valor: string) {
    setSecoes((s) => s?.map((secao, j) => (j === i ? { ...secao, titulo: valor } : secao)) ?? null);
  }

  function excluir(i: number) {
    setSecoes((s) => s?.filter((_, j) => j !== i) ?? null);
  }

  function fundir(i: number) {
    setSecoes((s) => {
      if (!s || i <= 0) return s;
      const anterior = s[i - 1];
      const atual = s[i];
      const conteudo = `${anterior.conteudo}\n\n${atual.titulo}\n\n${atual.conteudo}`.trim();
      return s.map((secao, j) => (j === i - 1 ? { ...secao, conteudo } : secao)).filter((_, j) => j !== i);
    });
  }

  async function salvar() {
    if (!secoes || secoes.length === 0) return toast.error("Nenhuma seção para salvar.");
    if (!form.titulo.trim()) return toast.error("Informe o título do livro.");
    setPending(true);
    const dados = {
      titulo: form.titulo,
      autor: form.autor,
      ano: form.ano ? Number(form.ano) : null,
      fonte: form.fonte,
      resumo: form.resumo,
    };
    const res = livro ? await replaceSections(livro.id, secoes) : await createBook({ ...dados, secoes });
    setPending(false);
    if (res.error) return toast.error(res.error);
    toast.success(res.message || "Biblioteca atualizada.");
    limpar();
    onConcluir();
    router.refresh();
  }

  const totalChars = secoes?.reduce((acc, s) => acc + s.conteudo.length, 0) ?? 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {livro ? `Reimportar seções — ${livro.titulo}` : "Importar livro"}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Aceita <strong>.md</strong>, <strong>.txt</strong> e <strong>.epub</strong>. A análise roda no seu navegador;
          revise as seções (renomear, fundir, excluir) antes de salvar.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <input
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            placeholder="Título do livro *"
            className={cn(inputCls, "lg:col-span-2")}
          />
          <input
            value={form.autor}
            onChange={(e) => setForm({ ...form, autor: e.target.value })}
            placeholder="Autor"
            className={inputCls}
          />
          <input
            value={form.ano}
            onChange={(e) => setForm({ ...form, ano: e.target.value.replace(/\D/g, "").slice(0, 4) })}
            placeholder="Ano"
            inputMode="numeric"
            className={inputCls}
          />
          <input
            value={form.fonte}
            onChange={(e) => setForm({ ...form, fonte: e.target.value })}
            placeholder="Fonte/editora (opcional)"
            className={cn(inputCls, "sm:col-span-2 lg:col-span-4")}
          />
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Arquivo</label>
            <input
              ref={arquivoRef}
              type="file"
              accept=".md,.txt,.epub"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void lerArquivo(file);
              }}
              className="block w-full text-sm file:mr-3 file:rounded-md file:border file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium"
            />
            <FieldHint>ou cole o texto:</FieldHint>
            <textarea
              rows={3}
              value={colado}
              onChange={(e) => setColado(e.target.value)}
              placeholder="Cole aqui o texto (Markdown ou texto puro)..."
              className={areaCls}
            />
            <Button type="button" size="sm" variant="outline" onClick={analisarTexto} disabled={!colado.trim()}>
              <FileUp className="mr-1.5 h-4 w-4" /> Analisar texto colado
            </Button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Resumo (contexto da IA)</label>
            <textarea
              rows={5}
              value={form.resumo}
              onChange={(e) => setForm({ ...form, resumo: e.target.value })}
              placeholder="Breve descrição do livro, usada pela IA para contextualizar a consulta."
              className={areaCls}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!secoes?.length}
              onClick={() => setForm((f) => ({ ...f, resumo: sugerirResumo(secoes || []) }))}
            >
              <Wand2 className="mr-1.5 h-4 w-4" /> Gerar do texto
            </Button>
          </div>
        </div>

        {secoes && (
          <div className="space-y-2 rounded-xl border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">
                Prévia: {secoes.length} seções · {(totalChars / 1000).toFixed(0)} mil caracteres
              </p>
              <Button type="button" size="sm" variant="ghost" onClick={limpar}>
                Descartar análise
              </Button>
            </div>
            <ul className="max-h-96 space-y-1 overflow-y-auto pr-1">
              {secoes.map((secao, i) => (
                <li key={i} className="rounded-lg border">
                  <div className="flex items-center gap-1 px-2 py-1.5">
                    <button
                      type="button"
                      onClick={() => setAberta(aberta === i ? null : i)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                      title={aberta === i ? "Recolher" : "Ver conteúdo"}
                    >
                      {aberta === i ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    <input
                      value={secao.titulo}
                      onChange={(e) => editarTitulo(i, e.target.value)}
                      className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm"
                    />
                    <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                      {secao.conteudo.length} car.
                    </span>
                    <button
                      type="button"
                      onClick={() => fundir(i)}
                      disabled={i === 0}
                      className="shrink-0 rounded-md border px-2 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-40"
                      title="Fundir com a seção anterior"
                    >
                      fundir
                    </button>
                    <button
                      type="button"
                      onClick={() => excluir(i)}
                      className="shrink-0 rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
                      title="Excluir seção"
                    >
                      excluir
                    </button>
                  </div>
                  {aberta === i && (
                    <div className="whitespace-pre-wrap border-t px-3 py-2 text-sm leading-relaxed text-muted-foreground">
                      {secao.conteudo.slice(0, 3000)}
                      {secao.conteudo.length > 3000 ? "…" : ""}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={salvar} disabled={pending || !secoes?.length}>
            {pending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {livro ? "Substituir seções do livro" : "Salvar livro na biblioteca"}
          </Button>
          {livro && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                limpar();
                onCancelar();
              }}
            >
              Cancelar reimportação
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function FieldHint({ children }: { children: ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}

function BooksCard({ livros, onReimportar }: { livros: LivroAdmin[]; onReimportar: (l: LivroAdmin) => void }) {
  if (livros.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          Nenhum livro na biblioteca ainda. Importe o primeiro acima.
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Livros na biblioteca ({livros.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {livros.map((livro) => (
            <BookRow key={livro.id} livro={livro} onReimportar={onReimportar} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function BookRow({ livro, onReimportar }: { livro: LivroAdmin; onReimportar: (l: LivroAdmin) => void }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState<FormLivro>({
    titulo: livro.titulo,
    autor: livro.autor || "",
    ano: livro.ano ? String(livro.ano) : "",
    fonte: livro.fonte || "",
    resumo: livro.resumo || "",
  });
  const [pending, setPending] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmDialogState | null>(null);

  async function salvar() {
    setPending(true);
    const res = await updateBook(livro.id, {
      titulo: form.titulo,
      autor: form.autor,
      ano: form.ano ? Number(form.ano) : null,
      fonte: form.fonte,
      resumo: form.resumo,
    });
    setPending(false);
    if (res.error) return toast.error(res.error);
    setEditando(false);
    toast.success(res.message || "Livro atualizado.");
    router.refresh();
  }

  async function remover() {
    setPending(true);
    try {
      const res = await deleteBook(livro.id);
      if (res.error) return toast.error(res.error);
      setConfirmState(null);
      toast.success("Livro removido.");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (editando) {
    return (
      <li className="space-y-2 rounded-lg border p-3">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} className={cn(inputCls, "lg:col-span-2")} placeholder="Título" />
          <input value={form.autor} onChange={(e) => setForm({ ...form, autor: e.target.value })} className={inputCls} placeholder="Autor" />
          <input value={form.ano} onChange={(e) => setForm({ ...form, ano: e.target.value.replace(/\D/g, "").slice(0, 4) })} className={inputCls} placeholder="Ano" inputMode="numeric" />
          <input value={form.fonte} onChange={(e) => setForm({ ...form, fonte: e.target.value })} className={cn(inputCls, "sm:col-span-2 lg:col-span-4")} placeholder="Fonte/editora" />
        </div>
        <textarea rows={3} value={form.resumo} onChange={(e) => setForm({ ...form, resumo: e.target.value })} className={areaCls} placeholder="Resumo para a IA" />
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={salvar} disabled={pending}>Salvar</Button>
          <Button size="sm" variant="ghost" onClick={() => setEditando(false)}>Cancelar</Button>
        </div>
      </li>
    );
  }

  return (
    <li className="rounded-lg border px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
            <BookOpen className="h-4 w-4 shrink-0 text-primary" />
            {livro.titulo}
            {livro.ano && <span className="font-normal text-muted-foreground">({livro.ano})</span>}
            <Badge variant="outline">{livro.secoes_count} seções</Badge>
          </p>
          <p className="text-xs text-muted-foreground">
            {livro.autor || "Autor não informado"}
            {livro.resumo ? ` · ${livro.resumo.slice(0, 90)}${livro.resumo.length > 90 ? "…" : ""}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/literatura/${livro.id}`}
            className="flex h-8 items-center rounded-md border px-3 text-xs font-medium transition-colors hover:bg-muted"
          >
            Ler
          </Link>
          <Button size="sm" variant="outline" onClick={() => setEditando(true)}>Metadados</Button>
          <Button size="sm" variant="outline" onClick={() => onReimportar(livro)}>Reimportar</Button>
          <Button
            size="sm"
            variant="outline"
            className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
            onClick={() =>
              setConfirmState({
                title: `Excluir ${livro.titulo}`,
                description: `O livro e suas ${livro.secoes_count} seções serão removidos da biblioteca. Esta ação não pode ser desfeita.`,
                confirmLabel: "Excluir livro",
              })
            }
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <ConfirmDialog state={confirmState} pending={pending} onConfirm={remover} onClose={() => setConfirmState(null)} />
    </li>
  );
}
