import type { Role } from "./types";

/**
 * Regras de perfil (PRD §4 / AGENTS.md). Módulo puro — usado nos server actions
 * e testável sem banco. `contribuir` e `revisar_ata` são abertos a todos os perfis
 * (qualquer membro da comissão).
 */
export type Permissao =
  | "gerenciar_usuarios"
  | "corrigir_extracao"
  | "editar_redacao"
  | "editar_justificativa"
  | "gerenciar_status"
  | "classificar_alteracao"
  | "gerenciar_dispositivos"
  | "gerenciar_sugestoes"
  | "contribuir"
  | "vincular_dispositivos"
  | "gerenciar_reunioes"
  | "renumerar"
  | "revisar_ata";

export const PERMISSOES: Record<Permissao, Role[]> = {
  gerenciar_usuarios: ["admin"],
  corrigir_extracao: ["admin"],
  editar_redacao: ["coordenador", "admin"],
  editar_justificativa: ["coordenador", "admin"],
  gerenciar_status: ["coordenador", "admin"],
  classificar_alteracao: ["coordenador", "admin"],
  gerenciar_dispositivos: ["coordenador", "admin"],
  gerenciar_sugestoes: ["coordenador", "admin"],
  contribuir: ["coordenador", "admin", "membro"],
  vincular_dispositivos: ["coordenador", "admin"],
  gerenciar_reunioes: ["coordenador", "admin"],
  renumerar: ["coordenador", "admin"],
  revisar_ata: ["coordenador", "admin", "membro"],
};

/** Roles autorizados para uma permissão (cópia defensiva). */
export function rolesCom(permissao: Permissao): Role[] {
  return [...PERMISSOES[permissao]];
}

/** Um perfil tem a permissão? */
export function temPermissao(role: Role, permissao: Permissao): boolean {
  return PERMISSOES[permissao].includes(role);
}
