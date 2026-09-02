import type { ProvisionType } from "./types";

export const HIERARQUIA: Record<ProvisionType, ProvisionType[]> = {
  capitulo: ["secao", "artigo"],
  secao: ["artigo"],
  artigo: ["paragrafo", "inciso", "alinea"],
  paragrafo: ["inciso", "alinea"],
  inciso: ["alinea"],
  alinea: [],
};

/**
 * Um pai aceita um filho? `parentTipo === null` representa a raiz do documento:
 * qualquer tipo pode ficar na raiz (o Art. 27 do Estatuto registrado é artigo solto
 * na raiz, e capítulos são obrigatoriamente criados na raiz).
 */
export function podeMover(tipo: ProvisionType, parentTipo: ProvisionType | null): boolean {
  if (parentTipo === null) return true;
  return HIERARQUIA[parentTipo]?.includes(tipo) ?? false;
}

/**
 * Reordena uma lista de irmãos inserindo `movedId` após `afterId`
 * (ou no início se `afterId` for null). Se `afterId` não estiver na lista,
 * anexa `movedId` ao final (defensivo — a validação deve ocorrer antes).
 */
export function inserirApos(irmaos: string[], movedId: string, afterId: string | null): string[] {
  const rest = irmaos.filter((x) => x !== movedId);
  if (afterId === null) return [movedId, ...rest];
  const idx = rest.indexOf(afterId);
  if (idx === -1) return [...rest, movedId];
  const out = [...rest];
  out.splice(idx + 1, 0, movedId);
  return out;
}

/** Nó mínimo serializável para validações puras (sem banco). */
export interface NoEstrutural {
  id: string;
  type: ProvisionType;
  parent_id: string | null;
}

/**
 * Valida um movimento de dispositivo numa árvore plana (Map id → nó).
 * Retorna mensagem de erro ou null se o movimento for válido.
 */
export function validarMovimento(
  nos: Map<string, NoEstrutural>,
  movedId: string,
  newParentId: string | null,
  afterId: string | null
): string | null {
  const moved = nos.get(movedId);
  if (!moved) return "Dispositivo não encontrado.";
  if (newParentId === movedId) return "Um dispositivo não pode ser movido para dentro de si mesmo.";
  if (afterId === movedId) return "Um dispositivo não pode ser posicionado após si mesmo.";
  if (newParentId !== null && !nos.has(newParentId)) return "Dispositivo de destino não encontrado.";
  if (moved.type === "capitulo" && newParentId !== null) {
    return "Capítulos ficam na raiz do documento.";
  }
  if (newParentId !== null) {
    const parent = nos.get(newParentId)!;
    if (!podeMover(moved.type, parent.type)) {
      return `Não é possível mover ${moved.type} para dentro de ${parent.type}.`;
    }
    let cur: string | null = parent.parent_id;
    while (cur) {
      if (cur === movedId) return "Movimento inválido: o destino está dentro do próprio dispositivo.";
      cur = nos.get(cur)?.parent_id ?? null;
    }
  }
  if (afterId !== null) {
    const after = nos.get(afterId);
    if (!after) return "Dispositivo de referência não encontrado.";
    if (after.parent_id !== newParentId) return "O dispositivo de referência deve estar no mesmo destino.";
  }
  return null;
}

/** Posição (índice) que um id ocupa na lista. -1 se ausente. */
export function posicaoNaLista(lista: string[], id: string): number {
  return lista.indexOf(id);
}
