import type { ProvisionType } from "./types";

/**
 * Precedência normativa dentro de um mesmo pai, apenas para os níveis finos do
 * dispositivo (LC 95): num artigo, incisos precedem parágrafos e alíneas. Os
 * níveis estruturais (capítulo/seção/artigo) têm peso 0 — NÃO são reordenados
 * entre si: a ordem deles é a posição física (`ordem_pai`), preservando a
 * sequência do documento.
 */
const PESO_TIPO: Record<ProvisionType, number> = {
  capitulo: 0,
  secao: 0,
  artigo: 0,
  inciso: 1,
  paragrafo: 2,
  alinea: 3,
};

export interface IrmaoOrdenavel {
  type: ProvisionType;
  ordem_pai: number;
}

/**
 * Compara dois irmãos. Só interfere na ordem entre incisos/parágrafos/alíneas
 * (agrupando incisos antes de parágrafos); capitulos/seções/artigos mantêm a
 * posição física. Não ordena por número — originais e propostas com numeração
 * provisória permanecem na ordem em que o admin as dispôs.
 */
export function compararIrmaos(a: IrmaoOrdenavel, b: IrmaoOrdenavel): number {
  const pa = PESO_TIPO[a.type] ?? 0;
  const pb = PESO_TIPO[b.type] ?? 0;
  if (pa !== pb) return pa - pb;
  return a.ordem_pai - b.ordem_pai;
}

/** Ordena uma lista de irmãos por hierarquia normativa (não muta o array). */
export function ordenarIrmaos<T extends IrmaoOrdenavel>(irmaos: T[]): T[] {
  return [...irmaos].sort(compararIrmaos);
}