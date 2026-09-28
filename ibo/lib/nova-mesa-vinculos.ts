import { all } from "./db";
import { htmlToText, isHtml } from "./rich-text";
import type { CandidatoVinculo } from "./nova-mesa-poc/vinculos";

const textoPuro = (valor: string): string => (isHtml(valor) ? htmlToText(valor) : valor).trim();

/** Dispositivos ativos do Estatuto registrado disponíveis para vínculo (acesso server-side). */
export async function carregarCandidatosVinculo(): Promise<CandidatoVinculo[]> {
  const rows = await all<{
    id: string;
    type: string;
    numero: string | null;
    titulo: string | null;
    texto_vigente: string;
    proposta_inicial: string;
  }>("SELECT id, type, numero, titulo, texto_vigente, proposta_inicial FROM provisions WHERE deleted_at IS NULL ORDER BY ordem, ordem_pai");
  return rows.map((row) => ({
    id: row.id,
    type: row.type as CandidatoVinculo["type"],
    numero: row.numero,
    titulo: row.titulo,
    vigente: textoPuro(row.texto_vigente),
    proposta: textoPuro(row.proposta_inicial),
  }));
}