import { type Draft, type DraftNode, type NodeType, type NovaMesaStatus } from "./model";
import { validateDraft } from "./validate";

export const DRAFT_ID = "estatuto-ibo-2026";

export type EstatisticasImportacao = {
  total: number;
  porTipo: Partial<Record<NodeType, number>>;
  apreciados: number;
  emAnalise: number;
  pendentes: number;
  pontosRevisao: number;
};

export type DiffImportacao = {
  novos: string[];
  removidos: string[];
  textoAlterado: string[];
  statusAlterado: string[];
  revisaoAlterada: string[];
};

export type ResultadoImportacao = {
  draft: Draft;
  formato: "nativo" | "consolidado";
  avisos: string[];
  estatisticas: EstatisticasImportacao;
  diff: DiffImportacao;
};

/** Chaves aceitas no formato da minuta; as demais são descartadas com aviso. */
const CONHECIDAS = new Set(["id", "type", "text", "texto", "children", "runs", "alignment", "status", "approved", "revisao", "revisao_pendente", "vinculos"]);
/** Metadados de exportação reconhecidos e deliberadamente ignorados. */
const METADADOS = new Set(["origem", "aprovado_no_esdras", "numero", "ordem", "titulo"]);
const LIMITE_TEXTO = 1_000_000;
const LIMITE_PROFUNDIDADE = 20;

export function estatisticasDaMinuta(draft: Draft): EstatisticasImportacao {
  const estatisticas: EstatisticasImportacao = { total: 0, porTipo: {}, apreciados: 0, emAnalise: 0, pendentes: 0, pontosRevisao: 0 };
  const visit = (nodes: DraftNode[]) => {
    for (const node of nodes) {
      estatisticas.total++;
      estatisticas.porTipo[node.type] = (estatisticas.porTipo[node.type] ?? 0) + 1;
      const status = node.status === "aprovado" || node.status === "em_analise" ? node.status : "pendente";
      if (status === "aprovado") estatisticas.apreciados++;
      else if (status === "em_analise") estatisticas.emAnalise++;
      else estatisticas.pendentes++;
      if (node.revisao?.trim()) estatisticas.pontosRevisao++;
      visit(node.children);
    }
  };
  visit(draft.nodes);
  return estatisticas;
}

const achatar = (draft: Draft | null): Map<string, DraftNode> => {
  const mapa = new Map<string, DraftNode>();
  const visit = (nodes: DraftNode[]) => {
    for (const node of nodes) {
      mapa.set(node.id, node);
      visit(node.children);
    }
  };
  if (draft) visit(draft.nodes);
  return mapa;
};

export function compararMinutas(base: Draft | null, novo: Draft): DiffImportacao {
  const antes = achatar(base), depois = achatar(novo);
  const diff: DiffImportacao = { novos: [], removidos: [], textoAlterado: [], statusAlterado: [], revisaoAlterada: [] };
  for (const [id, node] of depois) {
    const anterior = antes.get(id);
    if (!anterior) {
      diff.novos.push(id);
      continue;
    }
    if (anterior.text !== node.text) diff.textoAlterado.push(id);
    if ((anterior.status ?? "pendente") !== (node.status ?? "pendente")) diff.statusAlterado.push(id);
    if ((anterior.revisao ?? "") !== (node.revisao ?? "")) diff.revisaoAlterada.push(id);
  }
  for (const id of antes.keys()) if (!depois.has(id)) diff.removidos.push(id);
  return diff;
}

const ehObjeto = (valor: unknown): valor is Record<string, unknown> => !!valor && typeof valor === "object" && !Array.isArray(valor);

function normalizarNode(valor: unknown, base: Map<string, DraftNode>, avisos: Set<string>, profundidade: number): DraftNode {
  if (profundidade > LIMITE_PROFUNDIDADE) throw new Error("Estrutura excessivamente profunda.");
  if (!ehObjeto(valor)) throw new Error("Dispositivo inválido.");
  const bruto = valor;
  if (typeof bruto.id !== "string" || !bruto.id) throw new Error("Dispositivo sem identificador.");
  if (!Array.isArray(bruto.children)) throw new Error("Dispositivo sem lista de filhos.");
  if (bruto.approved !== undefined && typeof bruto.approved !== "boolean") throw new Error("Marcação de aprovação inválida.");
  const texto = typeof bruto.text === "string" ? bruto.text : typeof bruto.texto === "string" ? bruto.texto : "";
  const node: DraftNode = {
    id: bruto.id,
    type: bruto.type as NodeType,
    text: texto,
    children: bruto.children.map((filho) => normalizarNode(filho, base, avisos, profundidade + 1)),
  };
  if (Array.isArray(bruto.runs)) node.runs = bruto.runs as DraftNode["runs"];
  if (typeof bruto.alignment === "string") node.alignment = bruto.alignment as DraftNode["alignment"];
  else {
    const existente = base.get(node.id)?.alignment;
    if (existente) node.alignment = existente;
  }
  if (typeof bruto.status === "string") node.status = bruto.status as NovaMesaStatus;
  else if (bruto.approved === true) node.status = "aprovado";
  const revisao = typeof bruto.revisao === "string" ? bruto.revisao : typeof bruto.revisao_pendente === "string" ? bruto.revisao_pendente : "";
  if (revisao.trim()) node.revisao = revisao.trim();
  if (Array.isArray(bruto.vinculos)) {
    const vinculos = [...new Set(bruto.vinculos.filter((item): item is string => typeof item === "string" && !!item.trim()).map((item) => item.trim()))];
    if (vinculos.length) node.vinculos = vinculos;
  } else {
    const existentes = base.get(node.id)?.vinculos;
    if (existentes?.length) node.vinculos = [...existentes];
  }
  for (const chave of Object.keys(bruto)) {
    if (!CONHECIDAS.has(chave) && !METADADOS.has(chave)) avisos.add(chave);
  }
  return node;
}

const pareceConsolidado = (raiz: Record<string, unknown>): boolean => {
  if (raiz.id !== DRAFT_ID || raiz.fonte_esdras !== undefined || typeof raiz.titulo === "string") return true;
  const visit = (nodes: unknown[]): boolean => {
    for (const node of nodes) {
      if (!ehObjeto(node)) continue;
      if (node.approved !== undefined || node.revisao_pendente !== undefined || node.aprovado_no_esdras !== undefined || typeof node.texto === "string") return true;
      if (Array.isArray(node.children) && visit(node.children)) return true;
    }
    return false;
  };
  return visit(Array.isArray(raiz.nodes) ? raiz.nodes : []);
};

/** Normaliza um arquivo (consolidado ou nativo) para o formato da minuta do Esdras. */
export function importarMinuta(valor: unknown, base: Draft | null = null): ResultadoImportacao {
  let conteudo: unknown = valor;
  if (typeof conteudo === "string") {
    if (conteudo.length > LIMITE_TEXTO) throw new Error("Minuta excede o tamanho permitido.");
    try {
      conteudo = JSON.parse(conteudo);
    } catch {
      throw new Error("O arquivo não é um JSON válido.");
    }
  }
  if (!ehObjeto(conteudo)) throw new Error("Minuta inválida: esperado um objeto com 'nodes'.");
  if (!Array.isArray(conteudo.nodes)) throw new Error("Minuta inválida: a lista 'nodes' não foi encontrada.");
  const avisos = new Set<string>();
  const formato: ResultadoImportacao["formato"] = pareceConsolidado(conteudo) ? "consolidado" : "nativo";
  if (formato === "consolidado" && conteudo.id !== DRAFT_ID) avisos.add("Identificação do arquivo ajustada para " + DRAFT_ID + ".");
  if (conteudo.pontos_de_revisao !== undefined) avisos.add("A lista resumida 'pontos_de_revisao' do arquivo foi ignorada; os pontos entram por dispositivo.");
  const baseMapa = achatar(base);
  const draft = validateDraft({
    id: DRAFT_ID,
    nodes: conteudo.nodes.map((node) => normalizarNode(node, baseMapa, avisos, 1)),
  });
  return {
    draft,
    formato,
    avisos: [...avisos],
    estatisticas: estatisticasDaMinuta(draft),
    diff: compararMinutas(base, draft),
  };
}

/** Resumo legível do diff para a prévia da importação. */
export function resumirDiff(diff: DiffImportacao): string {
  const partes = [
    `${diff.novos.length} novo(s)`,
    `${diff.removidos.length} removido(s)`,
    `${diff.textoAlterado.length} com texto alterado`,
    `${diff.statusAlterado.length} com apreciação alterada`,
    `${diff.revisaoAlterada.length} com alerta alterado`,
  ];
  return partes.join(" · ");
}