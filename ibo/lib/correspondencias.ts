/**
 * Correspondências múltiplas entre a minuta e o Estatuto registrado (RF-01/RF-05).
 * Módulo puro, sem banco — compartilhado por ações, UI e testes.
 */
export const CORRESPONDENCIA_TIPOS = [
  "nao_examinado",
  "relacionado",
  "acrescimo",
  "nao_aplicavel",
  "substituido",
  "desmembrado",
  "incorporado",
] as const;

export type CorrespondenciaTipo = (typeof CORRESPONDENCIA_TIPOS)[number];

export const CORRESPONDENCIA_LABELS: Record<CorrespondenciaTipo, string> = {
  nao_examinado: "Não examinado",
  relacionado: "Relacionado",
  acrescimo: "Acréscimo (sem correspondente)",
  nao_aplicavel: "Não aplicável",
  substituido: "Substitui o vigente",
  desmembrado: "Desmembrado do vigente",
  incorporado: "Incorporado ao vigente",
};

/** Tipos que exigem um dispositivo do Estatuto registrado vinculado. */
export const TIPOS_COM_VINCULO: CorrespondenciaTipo[] = [
  "nao_examinado",
  "relacionado",
  "substituido",
  "desmembrado",
  "incorporado",
];

/** Declarações do operador que dispensam dispositivo vinculado. */
export const TIPOS_DECLARACAO: CorrespondenciaTipo[] = ["acrescimo", "nao_aplicavel"];

export function tipoCorrespondenciaValido(tipo: string): tipo is CorrespondenciaTipo {
  return (CORRESPONDENCIA_TIPOS as readonly string[]).includes(tipo);
}

/**
 * Valida a combinação tipo × vínculo. Retorna mensagem de erro ou null.
 * Acréscimo e não aplicável são declarações sem dispositivo; os demais tipos
 * apontam obrigatoriamente para um dispositivo do Estatuto registrado.
 */
export function validarCorrespondencia(tipo: string, vigenteId: string | null): string | null {
  if (!tipoCorrespondenciaValido(tipo)) return "Tipo de correspondência inválido.";
  const exigeVinculo = TIPOS_COM_VINCULO.includes(tipo);
  if (exigeVinculo && !vigenteId) return "Este tipo exige um dispositivo do Estatuto registrado.";
  if (!exigeVinculo && vigenteId) return "Acréscimo e não aplicável não levam dispositivo vinculado.";
  return null;
}

export function rotuloCorrespondencia(tipo: string): string {
  return tipoCorrespondenciaValido(tipo) ? CORRESPONDENCIA_LABELS[tipo] : tipo;
}

/** Registro de correspondência como devolvido pelas ações/consultas. */
export interface CorrespondenciaRegistro {
  id: number;
  provision_id: string;
  vigente_id: string | null;
  tipo: string;
  observacao: string | null;
  created_at: string;
  vigente_label: string | null;
}
