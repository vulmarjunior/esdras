/**
 * Cache em memória dos rascunhos já confirmados pelo servidor (cliente).
 *
 * O autosave atualiza o banco, mas os dados do servidor só chegam de novo após
 * `router.refresh()`. Enquanto isso, um editor remontado (troca de dispositivo)
 * leria os props antigos e o texto salvo "desapareceria". Este cache devolve a
 * última versão confirmada para o mesmo dispositivo.
 */
interface RascunhoSalvo {
  texto: string;
  versao: number;
}

const cache = new Map<string, RascunhoSalvo>();

export function registrarRascunhoSalvo(provisionId: string, texto: string, versao: number): void {
  if (typeof window === "undefined") return;
  cache.set(provisionId, { texto, versao });
}

/**
 * Última versão confirmada para o dispositivo, quando for mais nova que a do
 * servidor. Versões do cache iguais ou anteriores à do servidor são descartadas.
 */
export function lerRascunhoSalvo(provisionId: string, versaoServidor: number): RascunhoSalvo | null {
  if (typeof window === "undefined") return null;
  const item = cache.get(provisionId);
  if (!item) return null;
  if (item.versao < versaoServidor) {
    cache.delete(provisionId);
    return null;
  }
  return item;
}
