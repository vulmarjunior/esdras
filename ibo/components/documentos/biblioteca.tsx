"use client";

import { useState } from "react";
import type { Confissao } from "@/lib/confissoes/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookMarked, ChevronDown, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function Biblioteca({ docs }: { docs: Confissao[] }) {
  const [aberta, setAberta] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [itemAberto, setItemAberto] = useState<string | null>(null);

  const t = busca.trim().toLowerCase();

  return (
    <div className="space-y-4">
      {docs.map((doc) => {
        const aberto = doc.id === aberta;
        const itens = t
          ? doc.itens.filter((i) => `${i.titulo} ${i.conteudo}`.toLowerCase().includes(t))
          : doc.itens;
        return (
          <Card key={doc.id} className="overflow-hidden">
            <button
              type="button"
              onClick={() => {
                setAberta(aberto ? null : doc.id);
                setItemAberto(null);
              }}
              className="w-full text-left"
            >
              <CardHeader className="gap-1">
                <div className="flex items-center gap-2">
                  {aberto ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <BookMarked className="h-4 w-4 shrink-0 text-primary" />
                  <CardTitle className="text-base">
                    {doc.nome}
                    {doc.ano && <span className="ml-1.5 font-normal text-muted-foreground">({doc.ano})</span>}
                  </CardTitle>
                </div>
                <p className="pl-10 text-sm leading-relaxed text-muted-foreground">{doc.resumo}</p>
              </CardHeader>
            </button>

            {aberto && (
              <CardContent className="space-y-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={busca}
                    onChange={(e) => {
                      setBusca(e.target.value);
                      setItemAberto(null);
                    }}
                    placeholder="Buscar no texto desta confissão..."
                    className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none ring-ring transition-shadow focus:ring-2"
                  />
                </div>

                {itens.length === 0 ? (
                  <p className="text-sm italic text-muted-foreground">Nenhuma seção encontrada para este filtro.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {itens.map((item) => {
                      const chave = `${doc.id}:${item.titulo}`;
                      const abertoItem = itemAberto === chave;
                      return (
                        <li key={chave} className="rounded-lg border">
                          <button
                            type="button"
                            onClick={() => setItemAberto(abertoItem ? null : chave)}
                            className={cn(
                              "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-muted",
                              abertoItem && "border-b rounded-b-none bg-muted/60"
                            )}
                          >
                            {abertoItem ? (
                              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            )}
                            {item.titulo}
                          </button>
                          {abertoItem && (
                            <div className="whitespace-pre-wrap px-3 py-3 text-sm leading-relaxed text-foreground">
                              {item.conteudo}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}