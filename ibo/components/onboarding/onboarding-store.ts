const PREFIXO = "esdras:onboarding";

function chave(uid: number, area: string): string {
  return `${PREFIXO}:${uid}:${area}`;
}

/** Lê uma flag booleana de onboarding por usuário (safe para SSR). */
export function lerFlag(uid: number, area: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(chave(uid, area)) === "1";
}

export function gravarFlag(uid: number, area: string, valor: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(chave(uid, area), valor ? "1" : "0");
}

/** IDs dos passos do "Primeiros passos" já concluídos pelo usuário. */
export function lerPassosFeitos(uid: number): string[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(chave(uid, "passos"));
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function gravarPasso(uid: number, id: string, feito: boolean): void {
  const lista = new Set(lerPassosFeitos(uid));
  if (feito) lista.add(id);
  else lista.delete(id);
  localStorage.setItem(chave(uid, "passos"), JSON.stringify([...lista]));
}