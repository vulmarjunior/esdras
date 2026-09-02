export interface ConflitoResultado {
  conflito: boolean;
  mensagem?: string;
}

/**
 * PRD §41 — controle de concorrência por versão. Compara a versão que o editor
 * tinha ao abrir com a versão atual gravada; se divergir, o salvamento deve ser
 * recusado para evitar sobrescrita silenciosa.
 */
export function avaliarConflito(versaoEsperada: number, versaoAtual: number): ConflitoResultado {
  if (versaoAtual !== versaoEsperada) {
    return {
      conflito: true,
      mensagem:
        "Este dispositivo foi alterado desde que você iniciou a edição. Revise a versão mais recente antes de salvar.",
    };
  }
  return { conflito: false };
}
