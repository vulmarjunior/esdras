export type Role = "admin" | "coordenador" | "membro";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  phone: string | null;
  must_change_password: number;
  created_at: string;
}

export type ProvisionType = "capitulo" | "secao" | "artigo" | "paragrafo" | "inciso" | "alinea";
export type ProvisionStatus = "nao_iniciado" | "em_analise" | "em_discussao" | "redacao_definida" | "aprovado" | "reaberto";

export interface Provision {
  id: string;
  parent_id: string | null;
  project_id: string;
  type: ProvisionType;
  numero: string | null;
  titulo: string | null;
  ordem: number;
  origem: "original" | "novo";
  alteracao_tipo: string;
  status: ProvisionStatus;
  texto_vigente: string;
  proposta_inicial: string;
  redacao_trabalho: string;
  justificativa: string;
  redacao_consolidada: string;
  posicao_sugerida: string | null;
  version: number;
  updated_at: string;
  updated_by: number | null;
}

export interface Suggestion {
  id: number;
  provision_id: string;
  author_id: number;
  author_name?: string;
  texto: string;
  justificativa: string | null;
  onde_esta: string | null;
  status: string;
  created_at: string;
}

export interface Comment {
  id: number;
  author_id: number;
  author_name?: string;
  provision_id: string | null;
  suggestion_id: number | null;
  pending_id: number | null;
  content: string;
  created_at: string;
}

export interface PendingIssue {
  id: number;
  provision_id: string | null;
  author_id: number;
  author_name?: string;
  categoria: string;
  descricao: string;
  status: string;
  created_at: string;
}

export interface PersonalNote {
  id: number;
  provision_id: string;
  user_id: number;
  content: string;
  updated_at: string;
}

export interface Meeting {
  id: number;
  numero: number;
  data: string;
  horario: string | null;
  local: string | null;
  pauta: string | null;
  coordenador_id: number | null;
  secretario_id: number | null;
  status: "planejada" | "em_andamento" | "encerrada";
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export interface MeetingDecision {
  id: number;
  code: string;
  meeting_id: number;
  provision_id: string | null;
  provision_ref?: string | null;
  tipo: string;
  texto: string;
  user_id: number | null;
  user_name?: string;
  created_at: string;
}
