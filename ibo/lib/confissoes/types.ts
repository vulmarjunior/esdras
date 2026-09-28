export interface ItemConfissao {
  titulo: string;
  conteudo: string;
}

export interface Confissao {
  id: string;
  nome: string;
  ano: number | null;
  origem: string;
  resumo: string;
  /** Agrupamento na consulta (padrão: "Documentos doutrinários"). */
  grupo?: string;
  itens: ItemConfissao[];
}