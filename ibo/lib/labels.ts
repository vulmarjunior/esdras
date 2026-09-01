export const STATUS_LABELS: Record<string, string> = {
  nao_iniciado: "Não iniciado",
  em_analise: "Em análise",
  em_discussao: "Em discussão",
  redacao_definida: "Redação definida",
  aprovado: "Aprovado",
  reaberto: "Reaberto",
};

export const STATUS_VARIANTS: Record<string, string> = {
  nao_iniciado: "secondary",
  em_analise: "outline",
  em_discussao: "default",
  redacao_definida: "secondary",
  aprovado: "default",
  reaberto: "destructive",
};

export const SUGGESTION_STATUS_LABELS: Record<string, string> = {
  aberta: "Aberta",
  em_discussao: "Em discussão",
  aceita: "Aceita",
  aceita_parcialmente: "Aceita parcialmente",
  rejeitada: "Rejeitada",
  retirada: "Retirada",
};

export const SUGGESTION_STATUS_VARIANTS: Record<string, string> = {
  aberta: "default",
  em_discussao: "outline",
  aceita: "default",
  aceita_parcialmente: "secondary",
  rejeitada: "destructive",
  retirada: "secondary",
};

export const PENDING_CATEGORY_LABELS: Record<string, string> = {
  juridica: "Jurídica",
  biblica: "Bíblica",
  doutrinaria: "Doutrinária",
  eclesiologica: "Eclesiológica",
  administrativa: "Administrativa",
  redacao: "Redação",
  referencia_cruzada: "Referência cruzada",
  outra: "Outra",
};

export const PROVISION_TYPE_LABELS: Record<string, string> = {
  capitulo: "Capítulo",
  secao: "Seção",
  artigo: "Artigo",
  paragrafo: "Parágrafo",
  inciso: "Inciso",
  alinea: "Alínea",
};

export const ALTERACAO_TYPE_LABELS: Record<string, string> = {
  nao_avaliado: "Não avaliado",
  mantido: "Mantido sem alteração",
  alteracao_redacional: "Alteração redacional",
  alteracao_material: "Alteração material",
  novo: "Novo dispositivo",
  revogado: "Revogado",
  desmembrado: "Desmembrado",
  incorporado: "Incorporado a outro",
  reorganizado: "Reorganizado",
};

export const ORIGIN_LABELS: Record<string, string> = {
  original: "Original",
  proposta_inicial: "Proposta inicial",
  novo: "Novo",
};

export const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  coordenador: "Coordenador / Relator",
  membro: "Membro da Comissão",
};

export const REFERENCE_TYPE_LABELS: Record<string, string> = {
  biblica: "Bíblica",
  doutrinaria: "Doutrinária",
  juridica: "Jurídica",
  pastoral: "Administrativa / Pastoral",
};
