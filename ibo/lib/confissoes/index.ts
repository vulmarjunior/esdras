import type { Confissao } from "./types";
import { LONDRES_1689 } from "./londres-1689";
import { NEW_HAMPSHIRE_1833 } from "./new-hampshire-1833";
import { FE_MENSAGEM_2000 } from "./fe-mensagem-2000";
import { CBB_DECLARACAO } from "./cbb-declaracao";
import { PRINCIPIOS_BATISTAS } from "./principios-batistas";
import { PACTO_IGREJAS } from "./pacto-igrejas";

/** Ordem de exibição na biblioteca doutrinária. */
export const CONFISSOES: Confissao[] = [
  LONDRES_1689,
  NEW_HAMPSHIRE_1833,
  FE_MENSAGEM_2000,
  CBB_DECLARACAO,
  PRINCIPIOS_BATISTAS,
  PACTO_IGREJAS,
];

export const CONFISSAO_BY_ID: Record<string, Confissao> = Object.fromEntries(
  CONFISSOES.map((c) => [c.id, c])
);

export type { Confissao, ItemConfissao } from "./types";