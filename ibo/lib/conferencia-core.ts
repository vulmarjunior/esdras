/**
 * Conferência da minuta (RF-10): separa alertas automáticos de questões de
 * conteúdo. Módulo puro — recebe a árvore e os dados já carregados.
 */
import { normalizarNumero } from "./numeracao";
import { detectarMencoes } from "./referencias-core";

export type AchadoTipo =
  | "provisorio_vazio"
  | "numeracao_divergente"
  | "correspondencia_nao_examinada"
  | "correspondencia_ausente"
  | "remissao_a_revisar"
  | "pendencia_aberta"
  | "justificativa_ausente"
  | "supressao";

export type AchadoGravidade = "alerta" | "atencao" | "info";

export interface AchadoConferencia {
  tipo: AchadoTipo;
  gravidade: AchadoGravidade;
  provision_id: string | null;
  label: string;
  detalhe: string;
  /** Número do artigo mencionado, quando o achado é uma remissão. */
  numero?: number;
}

export interface NoConferencia {
  id: string;
  type: string;
  titulo: string | null;
  alteracao_tipo: string;
  status: string;
  texto_vigente: string;
  proposta_inicial: string;
  redacao_trabalho: string;
  justificativa: string;
  sem_origem: number | boolean;
  origem_ref_id: string | null;
  children: NoConferencia[];
}

export interface CorrespondenciaConferencia {
  provision_id: string;
  tipo: string;
  vigente_id: string | null;
}

export interface PendenciaConferencia {
  provision_id: string | null;
  status: string;
  descricao: string;
}

export interface OpcoesConferencia {
  numerosDerivados: Map<string, string>;
  numerosArmazenados: Map<string, string | null | undefined>;
  correspondencias: CorrespondenciaConferencia[];
  pendencias: PendenciaConferencia[];
  labels: Map<string, string>;
}

const ESTRUTURAIS = new Set(["capitulo", "secao"]);

export function conferirMinuta(arvore: NoConferencia[], opcoes: OpcoesConferencia): AchadoConferencia[] {
  const achados: AchadoConferencia[] = [];
  const corrPorDispositivo = new Map<string, CorrespondenciaConferencia[]>();
  for (const item of opcoes.correspondencias) {
    const lista = corrPorDispositivo.get(item.provision_id) ?? [];
    lista.push(item);
    corrPorDispositivo.set(item.provision_id, lista);
  }
  const label = (id: string) => opcoes.labels.get(id) ?? id;

  const numerosArtigos = new Set<string>();
  const coletarArtigos = (nodes: NoConferencia[]) => {
    for (const node of nodes) {
      if (node.type === "artigo" && node.alteracao_tipo !== "revogado") {
        const numero = opcoes.numerosDerivados.get(node.id);
        if (numero) numerosArtigos.add(normalizarNumero(numero));
      }
      coletarArtigos(node.children);
    }
  };
  coletarArtigos(arvore);

  const visitar = (node: NoConferencia) => {
    if (node.alteracao_tipo === "revogado") {
      achados.push({
        tipo: "supressao",
        gravidade: "info",
        provision_id: node.id,
        label: label(node.id),
        detalhe: "Supressão proposta de regra vigente (revogado no texto final).",
      });
      for (const child of node.children) visitar(child);
      return;
    }

    const derivado = opcoes.numerosDerivados.get(node.id);
    const armazenado = opcoes.numerosArmazenados.get(node.id);
    if (derivado && normalizarNumero(armazenado) !== normalizarNumero(derivado)) {
      achados.push({
        tipo: "numeracao_divergente",
        gravidade: "alerta",
        provision_id: node.id,
        label: label(node.id),
        detalhe: `Número exibido (${armazenado ?? "sem número"}) difere da ordem atual (${derivado}). Aplicar numeração em Renumeração.`,
      });
    }

    if (ESTRUTURAIS.has(node.type)) {
      if (!node.titulo?.trim()) {
        achados.push({
          tipo: "provisorio_vazio",
          gravidade: "atencao",
          provision_id: node.id,
          label: label(node.id),
          detalhe: "Capítulo/seção sem título — nó estrutural provisório.",
        });
      }
    } else {
      const texto = node.redacao_trabalho || node.proposta_inicial || node.texto_vigente || "";
      if (!texto.trim()) {
        achados.push({
          tipo: "provisorio_vazio",
          gravidade: "atencao",
          provision_id: node.id,
          label: label(node.id),
          detalhe: "Dispositivo provisório sem redação.",
        });
      } else {
        if (!node.justificativa.trim()) {
          achados.push({
            tipo: "justificativa_ausente",
            gravidade: "atencao",
            provision_id: node.id,
            label: label(node.id),
            detalhe: "Redação sem justificativa registrada.",
          });
        }
        for (const mencao of detectarMencoes(texto)) {
          if (!numerosArtigos.has(String(mencao.numero))) {
            achados.push({
              tipo: "remissao_a_revisar",
              gravidade: "atencao",
              provision_id: node.id,
              label: label(node.id),
              detalhe: `Remissão a Art. ${mencao.numero} sem alvo na numeração atual: “${mencao.trecho}”.`,
              numero: mencao.numero,
            });
          }
        }
        const links = corrPorDispositivo.get(node.id) ?? [];
        if (links.some((link) => link.tipo === "nao_examinado")) {
          achados.push({
            tipo: "correspondencia_nao_examinada",
            gravidade: "atencao",
            provision_id: node.id,
            label: label(node.id),
            detalhe: "Correspondência registrada como não examinada.",
          });
        } else if (
          links.length === 0 &&
          !node.sem_origem &&
          !node.origem_ref_id &&
          !node.texto_vigente.trim() &&
          node.redacao_trabalho.trim()
        ) {
          achados.push({
            tipo: "correspondencia_ausente",
            gravidade: "atencao",
            provision_id: node.id,
            label: label(node.id),
            detalhe: "Há redação de trabalho sem correspondência declarada — possível acréscimo não examinado.",
          });
        }
      }
    }
    for (const child of node.children) visitar(child);
  };

  for (const node of arvore) visitar(node);

  for (const pendencia of opcoes.pendencias) {
    if (pendencia.status !== "aberta") continue;
    achados.push({
      tipo: "pendencia_aberta",
      gravidade: "alerta",
      provision_id: pendencia.provision_id,
      label: pendencia.provision_id ? label(pendencia.provision_id) : "Geral",
      detalhe: `Pendência aberta: ${pendencia.descricao}`,
    });
  }

  const ordem: Record<AchadoGravidade, number> = { alerta: 0, atencao: 1, info: 2 };
  return achados.sort((a, b) => ordem[a.gravidade] - ordem[b.gravidade] || a.label.localeCompare(b.label, "pt-BR"));
}
