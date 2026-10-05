import { labelFor, roman, type DraftNode, type NodeType } from "./model";

/**
 * Configuração de um documento editável no motor da Mesa (nova minuta).
 * O banco já é multi-documento (nova_mesa_drafts.id TEXT); este registro
 * define rótulos, hierarquia permitida, exportação e recursos de cada um.
 */
export type DocumentoConfig = {
  id: string;
  nome: string;
  /** Título do documento (exportação e leitura ampla). */
  titulo: string;
  /** Cabeçalho exibido no próprio documento editável. */
  tituloEditor: string;
  /** Cabeçalho da plataforma de acompanhamento (somente leitura). */
  tituloVisualizacao: string;
  /** Título da barra do ambiente de edição. */
  tituloPainel: string;
  subtituloEditor: string;
  aviso: string;
  /** Prefixo do nome de arquivos exportados. */
  arquivo: string;
  /** Rota base do ambiente (editor, /visualizar e /imprimir). */
  rota: string;
  rotular: (node: DraftNode, siblings: DraftNode[], articleNumber: number, chapterNumber: number) => string;
  nomes: Record<NodeType, string>;
  tipos: NodeType[];
  /** Exibe o painel de vínculos e a comparação com o Estatuto registrado. */
  vinculos: boolean;
  /** Aceita o formato "consolidado" do Estatuto na importação JSON. */
  aceitarConsolidado: boolean;
  /** Inclui artigos/seções numeradas no sumário da exportação. */
  sumarioIncluiArtigos: boolean;
  /** Rótulo exibido em blocos livres (undefined esconde o aviso). */
  rotuloProvisorio?: string;
  /** Botões de consulta rápida (textos do Estatuto). */
  consultaBotoes: { id: string; label: string; title: string; tituloLeitura?: string }[];
};

export const NOMES_TIPO_DOCUMENTO: Record<NodeType, string> = {
  chapter: "Capítulo",
  section: "Seção",
  subsection: "Subseção",
  article: "Artigo",
  paragraph: "Parágrafo",
  inciso: "Inciso",
  alinea: "Alínea",
  free: "Texto livre",
};

export const ESTATUTO: DocumentoConfig = {
  id: "estatuto-ibo-2026",
  nome: "Estatuto",
  titulo: "Minuta do Estatuto Social",
  tituloEditor: "NOVO ESTATUTO · MINUTA EM ELABORAÇÃO",
  tituloVisualizacao: "MINUTA DO ESTATUTO SOCIAL",
  tituloPainel: "Mesa de Trabalho · Nova minuta",
  subtituloEditor: "Minuta em elaboração · Salvamento manual no servidor",
  aviso: "Documento de trabalho — minuta em elaboração; não é a versão final.",
  arquivo: "minuta-estatuto",
  rota: "/mesa-trabalho",
  rotular: (node, siblings, articleNumber, chapterNumber) => labelFor(node, siblings, articleNumber, chapterNumber),
  nomes: NOMES_TIPO_DOCUMENTO,
  tipos: ["chapter", "section", "subsection", "article", "paragraph", "inciso", "alinea", "free"],
  vinculos: true,
  aceitarConsolidado: true,
  sumarioIncluiArtigos: false,
  rotuloProvisorio: "Provisório · reservado",
  consultaBotoes: [
    { id: "statute:current", label: "Estatuto vigente", title: "Abrir o texto original do Estatuto vigente", tituloLeitura: "Estatuto vigente (versão histórica)" },
    { id: "statute:initial", label: "Proposta inicial", title: "Abrir a primeira proposta da reforma", tituloLeitura: "Proposta inicial (primeira versão da reforma)" },
  ],
};

export const COMPROMISSO_MEMBRESIA: DocumentoConfig = {
  id: "compromisso-membresia-2026",
  nome: "Compromisso de Membresia",
  titulo: "Compromisso de Membresia",
  tituloEditor: "COMPROMISSO DE MEMBRESIA · MINUTA EM ELABORAÇÃO",
  tituloVisualizacao: "COMPROMISSO DE MEMBRESIA",
  tituloPainel: "Compromisso de Membresia · Edição",
  subtituloEditor: "Documento em elaboração · Salvamento manual no servidor",
  aviso: "Documento de trabalho — texto em elaboração; não é a versão final.",
  arquivo: "compromisso-membresia",
  rota: "/compromisso",
  rotular: (node, siblings, articleNumber, chapterNumber) => {
    if (node.type === "free") return "";
    if (node.type === "chapter") return "CAPÍTULO " + roman(chapterNumber);
    if (node.type === "article") return articleNumber + ". ";
    return labelFor(node, siblings, articleNumber, chapterNumber);
  },
  nomes: { ...NOMES_TIPO_DOCUMENTO, article: "Seção numerada" },
  tipos: ["chapter", "article", "free"],
  vinculos: false,
  aceitarConsolidado: false,
  sumarioIncluiArtigos: true,
  consultaBotoes: [],
};

export const DOCUMENTOS: DocumentoConfig[] = [ESTATUTO, COMPROMISSO_MEMBRESIA];

export const DOCUMENTO_PADRAO = ESTATUTO.id;

/** Resolve um documento pelo id; lança em id desconhecido (validação server-side). */
export function documentoPorId(id: string | null | undefined): DocumentoConfig {
  const documento = DOCUMENTOS.find((item) => item.id === id);
  if (!documento) throw new Error("Documento desconhecido.");
  return documento;
}

/** Resolve um documento pelo id, caindo no Estatuto quando ausente (compatibilidade). */
export function documentoOuPadrao(id: string | null | undefined): DocumentoConfig {
  return id ? documentoPorId(id) : ESTATUTO;
}
