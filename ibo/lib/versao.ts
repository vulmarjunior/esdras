import { cookies } from "next/headers";
import type { VersaoTrabalho } from "./types";

/** Cookie com a versão de trabalho exibida (padrão: proposta). */
export const VERSAO_COOKIE = "esdras_versao";
export const VERSAO_PADRAO: VersaoTrabalho = "proposta";

export async function getVersaoTrabalho(): Promise<VersaoTrabalho> {
  const c = await cookies();
  return c.get(VERSAO_COOKIE)?.value === "vigente" ? "vigente" : VERSAO_PADRAO;
}
