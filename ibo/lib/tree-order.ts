import type { ProvisionType } from "./types";

/**
 * Precedência normativa entre tipos de dispositivo (LC 95): dentro de um mesmo
 * pai, dispositivos de tipo "superior" na hierarquia aparecem antes.
 * Ex.: em um artigo, incisos (3) precedem parágrafos (4) e alíneas (5).
 */
export const RANK_TIPO: Record<ProvisionType, number> = {
  capitulo: 0,
  secao: 1,
  artigo: 2,
  inciso: 3,
  paragrafo: 4,
  alinea: 5,
};

export interface IrmaoOrdenavel {
  type: ProvisionType;
  ordem_pai: number;
}

/**
 * Compara dois irmãos pela hierarquia normativa e, em caso de empate, pela
 * posição física (`ordem_pai`). Não ordena por número — originais e propostas
 * com numeração provisória permanecem na ordem em que o admin as dispôs.
 */
export function compararIrmaos(a: IrmaoOrdenavel, b: IrmaoOrdenavel): number {
  const ra = RANK_TIPO[a.type] ?? 99;
  const rb = RANK_TIPO[b.type] ?? 99;
  if (ra !== rb) return ra - rb;
  return a.ordem_pai - b.ordem_pai;
}

/** Ordena uma lista de irmãos por hierarquia normativa (não muta o array). */
export function ordenarIrmaos<T extends IrmaoOrdenavel>(irmaos: T[]): T[] {
  return [...irmaos].sort(compararIrmaos);
}