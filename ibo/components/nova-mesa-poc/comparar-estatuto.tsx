"use client";

import { ComparedText } from "@/components/review/compared-text";
import { diffWords } from "@/lib/review-core";
import { rotuloCandidato, textoProposta, textoVigente, type CandidatoVinculo } from "@/lib/nova-mesa-poc/vinculos";

function Bloco({ titulo, fonte, atual, destacar }: { titulo: string; fonte: string; atual: string; destacar: boolean }) {
  if (!fonte.trim()) return null;
  const [antes, depois] = diffWords(fonte, atual);
  return (
    <section className="min-w-0 space-y-1 rounded-lg border p-2">
      <h5 className="text-xs font-semibold">{titulo}</h5>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="min-w-0 rounded border bg-muted/40 p-2">
          <p className="mb-1 text-[11px] font-semibold text-muted-foreground">{titulo} (fonte)</p>
          <ComparedText parts={antes} side="before" highlight={destacar} />
        </div>
        <div className="min-w-0 rounded border p-2">
          <p className="mb-1 text-[11px] font-semibold text-muted-foreground">Redação atual</p>
          <ComparedText parts={depois} side="after" highlight={destacar} />
        </div>
      </div>
    </section>
  );
}

/** Consulta pareada do dispositivo: vigente e proposta inicial × redação atual, com diff. */
export default function CompararEstatuto({ redacaoAtual, candidatos, destacar = true }: {
  redacaoAtual: string;
  candidatos: CandidatoVinculo[];
  destacar?: boolean;
}) {
  if (candidatos.length === 0) {
    return <p className="text-xs text-muted-foreground">Sem correspondente no Estatuto registrado para comparar.</p>;
  }
  return (
    <div className="min-w-0 space-y-4">
      {candidatos.map((candidato) => (
        <article key={candidato.id} className="min-w-0 space-y-2">
          <h4 className="text-sm font-semibold">{rotuloCandidato(candidato)}</h4>
          <Bloco titulo="Estatuto vigente" fonte={textoVigente(candidato)} atual={redacaoAtual} destacar={destacar} />
          <Bloco titulo="Proposta inicial" fonte={textoProposta(candidato)} atual={redacaoAtual} destacar={destacar} />
        </article>
      ))}
    </div>
  );
}