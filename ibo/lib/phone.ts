/**
 * Normalização de telefone e link do WhatsApp. Módulo puro (sem banco).
 * Formato aceito: "(69) 99999-9999", "+55 69 99999-9999", "69 99999 9999" etc.
 */

/** Remove tudo que não é dígito. */
export function somenteDigitos(phone: string | null | undefined): string {
  return (phone || "").replace(/\D/g, "");
}

/**
 * Normaliza para o padrão internacional brasileiro: 55 + DDD + número.
 * Se já começa com "55" e tem 12-13 dígitos, mantém; senão acrescenta 55.
 * Retorna "" se inválido (menos de 10 ou mais de 13 dígitos).
 */
export function normalizarTelefone(phone: string | null | undefined): string {
  const d = somenteDigitos(phone);
  if (!d) return "";
  let v = d;
  if (v.length === 10 || v.length === 11) v = "55" + v; // 8/9 dígitos + DDD
  if (v.length < 12 || v.length > 13) return "";
  return v;
}

/** Telefone em formato brasileiro para exibição: (69) 99999-9999. */
export function formatarTelefone(phone: string | null | undefined): string {
  const v = normalizarTelefone(phone);
  if (!v) return phone || "";
  const sem55 = v.startsWith("55") ? v.slice(2) : v;
  if (sem55.length === 10) return `(${sem55.slice(0, 2)}) ${sem55.slice(2, 6)}-${sem55.slice(6)}`;
  return `(${sem55.slice(0, 2)}) ${sem55.slice(2, 7)}-${sem55.slice(7)}`;
}

/** Link wa.me para conversa direta (sem mensagem pré-definida). */
export function whatsappLink(phone: string | null | undefined): string | null {
  const v = normalizarTelefone(phone);
  return v ? `https://wa.me/${v}` : null;
}

/** O telefone é válido para gerar link? */
export function telefoneValido(phone: string | null | undefined): boolean {
  return normalizarTelefone(phone) !== "";
}
