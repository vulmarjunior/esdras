"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ApprovedBadge, NovoBadge, StatusBadge } from "@/components/status-badge";
import { RichTextContent } from "@/components/rich-text-content";
import { normalizarNumero } from "@/lib/numeracao";
import { STATUS_LABELS } from "@/lib/labels";
import { Search } from "lucide-react";

export interface ItemEstatuto {
  id: string;
  type: string;
  numero: string | null;
  numeroVigente: string | null;
  titulo: string | null;
  status: string;
  origem: string;
  alteracaoTipo: string;
  texto: string;
  depth: number;
  chapterId: string;
  chapterLabel: string;
  chapterTitulo: string | null;
  chapterNumeroVigente: string | null;
}

const STATUS_OPCOES = ["nao_iniciado", "em_analise", "em_discussao", "redacao_definida", "aprovado", "reaberto"];

function rotulo(item: ItemEstatuto): string {
  const n = item.numero;
  if (!n) return item.type === "artigo" ? "NOVO ARTIGO" : item.id;
  switch (item.type) {
    case "capitulo":
      return `Capítulo ${n}`;
    case "secao":
      return `Seção ${n}`;
    case "artigo":
      return `Art. ${/^\d+$/.test(n) ? (Number(n) < 10 ? `${n}º` : n) : n}`;
    case "paragrafo":
      return n.toLowerCase() === "único" ? "Parágrafo único" : `§ ${n}`;
    case "inciso":
      return `${n}`;
    case "alinea":
      return n.replace(/\)?$/, ")");
    default:
      return item.id;
  }
}

/** Estatuto em construção: todos os dispositivos na ordem/numeração da proposta. */
export function EstatutoView({
  itens,
  modo,
}: {
  itens: ItemEstatuto[];
  modo: "construcao" | "aprovados";
}) {
  const [capitulo, setCapitulo] = useState("");
  const [status, setStatus] = useState("");
  const [busca, setBusca] = useState("");
  const [ocultarRevogados, setOcultarRevogados] = useState(false);
  const [soComTexto, setSoComTexto] = useState(modo === "aprovados");

  const capitulos = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const i of itens) if (i.type === "capitulo") mapa.set(i.id, `${rotulo(i)}${i.titulo ? ` — ${i.titulo}` : ""}`);
    return [...mapa.entries()];
  }, [itens]);

  const contadores = useMemo(() => {
    const c = { total: 0, aprovados: 0, andamento: 0, naoIniciados: 0, revogados: 0, novos: 0 };
    for (const i of itens) {
      if (i.type !== "artigo") continue;
      if (i.alteracaoTipo === "revogado") {
        c.revogados++;
        continue;
      }
      c.total++;
      if (i.status === "aprovado") c.aprovados++;
      else if (i.status === "nao_iniciado") c.naoIniciados++;
      else c.andamento++;
      if (i.origem === "novo") c.novos++;
    }
    return c;
  }, [itens]);

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return itens.filter((i) => {
      if (modo === "aprovados" && i.status !== "aprovado" && i.type !== "capitulo" && i.type !== "secao") return false;
      if (capitulo && i.chapterId !== capitulo) return false;
      if (status && i.type !== "capitulo" && i.type !== "secao" && i.status !== status) return false;
      if (ocultarRevogados && i.alteracaoTipo === "revogado") return false;
      if (soComTexto && i.type !== "capitulo" && i.type !== "secao" && !i.texto.trim()) return false;
      if (t && !`${rotulo(i)} ${i.titulo ?? ""} ${i.texto}`.toLowerCase().includes(t)) return false;
      return true;
    });
  }, [itens, modo, capitulo, status, ocultarRevogados, soComTexto, busca]);

  const grupos = useMemo(() => {
    const mapa = new Map<string, ItemEstatuto[]>();
    for (const i of filtrados) {
      const lista = mapa.get(i.chapterId) ?? [];
      lista.push(i);
      mapa.set(i.chapterId, lista);
    }
    const entradas = [...mapa.entries()];
    if (modo === "aprovados") return entradas.filter(([, lista]) => lista.some((i) => i.type !== "capitulo" && i.type !== "secao"));
    return entradas;
  }, [filtrados, modo]);

  const vazio = modo === "aprovados" ? contadores.aprovados === 0 : contadores.total === 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-4">
        <label className="space-y-1 text-sm">
          Buscar
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Ex.: assembleia ou Art. 12"
              className="h-10 w-full rounded-md border bg-background pl-9 pr-3"
            />
          </div>
        </label>
        <label className="space-y-1 text-sm">
          Capítulo
          <select value={capitulo} onChange={(e) => setCapitulo(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3">
            <option value="">Todos os capítulos</option>
            {capitulos.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3">
            <option value="">Todos os status</option>
            {STATUS_OPCOES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s] ?? s}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col justify-end gap-1.5 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={ocultarRevogados} onChange={(e) => setOcultarRevogados(e.target.checked)} />
            Ocultar revogados
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={soComTexto} onChange={(e) => setSoComTexto(e.target.checked)} />
            Somente com texto
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="outline" className="border-primary/40 text-primary">
          {contadores.total} artigos
        </Badge>
        <Badge variant="outline">{contadores.aprovados} com redação concluída</Badge>
        <Badge variant="outline">{contadores.andamento} em andamento</Badge>
        <Badge variant="outline">{contadores.naoIniciados} não iniciados</Badge>
        {contadores.novos > 0 && (
          <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300">
            {contadores.novos} novos
          </Badge>
        )}
        {contadores.revogados > 0 && (
          <Badge variant="outline" className="border-red-300 text-red-700 dark:border-red-800 dark:text-red-300">
            {contadores.revogados} revogados
          </Badge>
        )}
        <span className="text-xs text-muted-foreground">
          {filtrados.length} dispositivo(s) exibido(s) ·{" "}
          <Link href="/renumeracao" className="text-primary hover:underline">
            conferir numeração
          </Link>
        </span>
      </div>

      {vazio ? (
        <p className="text-sm text-muted-foreground">
          {modo === "aprovados"
            ? "Nenhuma redação foi concluída ainda. Conclua as redações na Mesa de Trabalho para compor a proposta final."
            : "Nenhum dispositivo na proposta."}
        </p>
      ) : grupos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum dispositivo encontrado com os filtros atuais.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          {grupos.map(([chapterId, lista]) => {
            const cap = lista.find((i) => i.type === "capitulo") ?? lista[0];
            const conteudo = lista.filter((i) => i.type !== "capitulo");
            const eraChip =
              cap.numero && cap.chapterNumeroVigente && normalizarNumero(cap.numero) !== normalizarNumero(cap.chapterNumeroVigente);
            return (
              <section key={chapterId} className="border-b last:border-b-0">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-4 py-2.5">
                  <h3 className="flex flex-wrap items-center gap-2 font-heading text-sm font-semibold">
                    <Link href={`/dispositivo/${cap.id}`} className="transition-opacity hover:opacity-80">
                      {rotulo(cap)}
                      {cap.titulo ? ` — ${cap.titulo}` : ""}
                    </Link>
                    {eraChip && (
                      <span className="rounded-full border border-amber-300/70 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                        era {cap.chapterNumeroVigente}
                      </span>
                    )}
                    {cap.origem === "novo" && <NovoBadge />}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {conteudo.filter((i) => i.type === "artigo" && i.status === "aprovado").length}/
                    {conteudo.filter((i) => i.type === "artigo").length} redações concluídas
                  </span>
                </div>
                {conteudo.length === 0 ? (
                  <p className="px-4 py-3 text-sm italic text-muted-foreground">Sem dispositivos exibidos neste capítulo.</p>
                ) : (
                  <ul className="divide-y">
                    {conteudo.map((item) => (
                      <ItemRow key={item.id} item={item} />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ItemRow({ item }: { item: ItemEstatuto }) {
  const revogado = item.alteracaoTipo === "revogado";
  const era =
    item.numero && item.numeroVigente && normalizarNumero(item.numero) !== normalizarNumero(item.numeroVigente)
      ? item.numeroVigente
      : null;
  const semTexto = !item.texto.trim();
  return (
    <li>
      <Link
        href={`/dispositivo/${item.id}`}
        className="group flex items-start gap-3 px-4 py-2 transition-colors hover:bg-muted/50"
        style={{ paddingLeft: `${16 + item.depth * 20}px` }}
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2 text-sm">
            <span className={cn("font-medium group-hover:text-primary", revogado && "text-muted-foreground line-through")}>
              {rotulo(item)}
            </span>
            {era && (
              <span className="rounded-full border border-amber-300/70 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                era {era}
              </span>
            )}
            {item.titulo && <span className="truncate text-muted-foreground">— {item.titulo}</span>}
            {item.origem === "novo" && <NovoBadge />}
            {revogado && (
              <span className="rounded-full border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">revogado</span>
            )}
          </span>
          {revogado ? (
            <span className="mt-0.5 block text-sm italic text-muted-foreground">
              Dispositivo retirado da proposta — o texto vigente permanece na tela do dispositivo.
            </span>
          ) : item.type === "secao" ? null : semTexto ? (
            <span className="mt-0.5 block text-sm italic text-muted-foreground">Redação ainda não cadastrada.</span>
          ) : (
            <span className="mt-0.5 block">
              <RichTextContent text={item.texto} className="text-sm leading-relaxed text-muted-foreground" />
            </span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {item.status === "aprovado" && <ApprovedBadge className="h-5 px-2 text-[11px]" />}
          <StatusBadge status={item.status} />
        </span>
      </Link>
    </li>
  );
}
