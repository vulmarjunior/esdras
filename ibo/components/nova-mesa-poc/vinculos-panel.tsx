"use client";

import { useState } from "react";
import { normalizarTexto } from "@/lib/busca";
import { resumoCandidato, rotuloCandidato, type CandidatoVinculo, type SugestaoVinculo } from "@/lib/nova-mesa-poc/vinculos";

export default function VinculosPanel({ candidatos, erro, vinculos, sugestoes, podeEditar, dispositivoAtivo, onVincular, onRemover, onSugerirLote, onComparar }: {
  candidatos: CandidatoVinculo[] | null;
  erro: string;
  vinculos: string[];
  sugestoes: SugestaoVinculo[];
  podeEditar: boolean;
  dispositivoAtivo: boolean;
  onVincular: (id: string) => void;
  onRemover: (id: string) => void;
  onSugerirLote: () => void;
  onComparar: () => void;
}) {
  const [busca, setBusca] = useState("");
  const mapa = new Map((candidatos ?? []).map((c) => [c.id, c]));
  const termo = normalizarTexto(busca);
  const resultados = termo
    ? (candidatos ?? [])
        .filter((c) => normalizarTexto(rotuloCandidato(c) + " " + (c.titulo ?? "") + " " + c.vigente + " " + c.proposta).includes(termo))
        .slice(0, 8)
    : [];
  return (
    <div className="min-w-0 space-y-2 rounded-lg border border-sky-200 bg-sky-50/60 p-2 dark:border-sky-900 dark:bg-sky-950/20">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-xs font-semibold text-sky-800 dark:text-sky-300">Vínculos com o Estatuto</h4>
        {dispositivoAtivo && <button type="button" className="rounded border px-2 py-1 text-[11px]" title="Comparar a redação atual com o vigente e a proposta inicial" onClick={onComparar}>Comparar…</button>}
      </div>
      {erro && <p role="alert" className="text-[11px] text-red-700">{erro}</p>}
      {!candidatos && !erro && <p className="text-[11px] text-muted-foreground">Carregando Estatuto registrado…</p>}
      {candidatos && !dispositivoAtivo && (
        <p className="text-[11px] leading-snug text-muted-foreground">Selecione um dispositivo para vincular e comparar. A sugestão em toda a minuta pode ser feita a qualquer momento.</p>
      )}
      {candidatos && dispositivoAtivo && (
        <>
          {vinculos.length === 0 && (
            <p className="text-[11px] leading-snug text-muted-foreground">Sem correspondente registrado. Aceite uma sugestão ou busque no Estatuto abaixo.</p>
          )}
          <ul className="space-y-1">
            {vinculos.map((id) => {
              const candidato = mapa.get(id);
              return (
                <li key={id} className="flex items-start gap-1 rounded border bg-background p-1.5 text-[11px]">
                  <span className="min-w-0 flex-1">
                    <strong className="block">{candidato ? rotuloCandidato(candidato) : "Vínculo não encontrado"}</strong>
                    <span className="text-muted-foreground">{candidato ? resumoCandidato(candidato) : id}</span>
                  </span>
                  {podeEditar && <button type="button" className="rounded border px-1.5 py-0.5" title="Remover vínculo" onClick={() => onRemover(id)}>Remover</button>}
                </li>
              );
            })}
          </ul>
          {podeEditar && sugestoes.length > 0 && (
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground">Sugestões</p>
              {sugestoes.map((sugestao) => {
                const candidato = mapa.get(sugestao.id);
                if (!candidato) return null;
                return (
                  <div key={sugestao.id} className="flex items-start gap-1 rounded border border-dashed bg-background p-1.5 text-[11px]">
                    <span className="min-w-0 flex-1">
                      <strong className="block">{rotuloCandidato(candidato)} · {Math.round(sugestao.score * 100)}%</strong>
                      <span className="text-muted-foreground">{resumoCandidato(candidato)}</span>
                    </span>
                    <button type="button" className="rounded border border-sky-400 bg-sky-100 px-1.5 py-0.5 font-semibold text-sky-900" onClick={() => onVincular(sugestao.id)}>Vincular</button>
                  </div>
                );
              })}
            </div>
          )}
          {podeEditar && (
            <div className="space-y-1">
              <input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar no Estatuto (artigo, número, texto)" aria-label="Buscar dispositivo do Estatuto"
                className="w-full rounded border bg-background px-2 py-1 text-[11px]" />
              {resultados.map((candidato) => (
                <button key={candidato.id} type="button" className="block w-full rounded border bg-background px-2 py-1 text-left text-[11px]"
                  onClick={() => { onVincular(candidato.id); setBusca(""); }}>
                  <strong>{rotuloCandidato(candidato)}</strong> <span className="text-muted-foreground">{resumoCandidato(candidato)}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
      {podeEditar && candidatos && (
        <button type="button" className="w-full rounded border border-sky-400 bg-sky-100 px-2 py-1.5 text-[11px] font-semibold text-sky-900" title="Calcula a melhor correspondência para os dispositivos ainda sem vínculo" onClick={onSugerirLote}>
          Sugerir vínculos em toda a minuta…
        </button>
      )}
    </div>
  );
}