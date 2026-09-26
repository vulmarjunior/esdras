"use client";

import { useState } from "react";

export default function ExportarDocumento({ versao, dirty = false, origem = "editor" }: { versao: number; dirty?: boolean; origem?: "editor" | "visualizar" }) {
  const [open, setOpen] = useState(false);
  const [marcas, setMarcas] = useState(true);
  const [sumario, setSumario] = useState(false);
  const [apreciados, setApreciados] = useState(false);
  const query = new URLSearchParams({ marcas: marcas ? "1" : "0", sumario: sumario ? "1" : "0", apreciados: apreciados ? "1" : "0" });
  const imprimir = () => window.open(`/mesa-trabalho/imprimir?${query}&origem=${origem}&auto=1`, "_blank");
  return (
    <span className="relative inline-block">
      <button type="button" className="rounded border px-3 py-1" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        Exportar documento… <span className="text-xs text-muted-foreground">v{versao}</span>
      </button>
      {open && (
        <section className="absolute right-0 top-full z-50 mt-1 w-[min(360px,calc(100vw-32px))] space-y-2 rounded-lg border bg-background p-3 text-left shadow-xl" aria-label="Exportar documento">
          <strong className="block text-sm">Exportar a minuta</strong>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={marcas} onChange={(event) => setMarcas(event.target.checked)} />
            Marcas de apreciação e legenda
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={sumario} onChange={(event) => setSumario(event.target.checked)} />
            Incluir sumário
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={apreciados} onChange={(event) => setApreciados(event.target.checked)} />
            Somente dispositivos apreciados
          </label>
          {dirty && <p className="text-xs text-amber-700">Há alterações não salvas; a exportação usa a versão salva (v{versao}).</p>}
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" className="rounded border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-semibold" onClick={imprimir}>
              Imprimir / PDF
            </button>
            <a className="rounded border px-3 py-2 text-sm" href={`/api/export/nova-mesa?formato=html&${query}`}>
              Baixar HTML
            </a>
            <a className="rounded border px-3 py-2 text-sm" href={`/api/export/nova-mesa?formato=md&${query}`}>
              Baixar Markdown
            </a>
          </div>
        </section>
      )}
    </span>
  );
}
