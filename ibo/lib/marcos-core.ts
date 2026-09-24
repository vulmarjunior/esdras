/**
 * Comparação entre marcos integrais e o estado atual da minuta (RF-09).
 * Módulo puro, sem banco — usado pela ação de comparação e pelos testes.
 */
export interface MarcoProvision {
  id: string;
  parent_id: string | null;
  type: string;
  numero: string | null;
  titulo: string | null;
  ordem: number;
  ordem_pai: number;
  origem: string;
  origem_ref_id: string | null;
  sem_origem: number;
  alteracao_tipo: string;
  status: string;
  texto_vigente: string;
  proposta_inicial: string;
  redacao_trabalho: string;
  justificativa: string;
  redacao_consolidada: string;
  posicao_sugerida: string | null;
  deleted_at: string | null;
  deleted_by: number | null;
  acordo_version: number | null;
  acordo_em: string | null;
  acordo_por: number | null;
}

export interface MarcoPlacement {
  provision_id: string;
  parent_id: string | null;
  numero: string | null;
  titulo: string | null;
  ordem_pai: number;
}

export interface MarcoCorrespondencia {
  provision_id: string;
  vigente_id: string | null;
  tipo: string;
  observacao: string | null;
}

export interface EstadoMarco {
  provisions: MarcoProvision[];
  placements: MarcoPlacement[];
  correspondencias: MarcoCorrespondencia[];
}

export type DiferencaTipo = "adicionado" | "retirado" | "restaurado" | "texto" | "posicao" | "status" | "correspondencia";

export interface DiferencaMarco {
  tipo: DiferencaTipo;
  provision_id: string;
  detalhe: string;
}

function chaveCorrespondencia(item: MarcoCorrespondencia): string {
  return `${item.provision_id}|${item.vigente_id ?? ""}|${item.tipo}`;
}

function descreverPosicao(placements: MarcoPlacement[]): Map<string, string> {
  return new Map(
    placements.map((placement) => [
      placement.provision_id,
      `${placement.parent_id ?? "raiz"}#${placement.ordem_pai}`,
    ]),
  );
}

/**
 * Compara um estado anterior (marco) com o atual, dispositivo a dispositivo.
 * A ordem do resultado é estável: adicionados, retirados, restaurados, depois
 * alterações de texto, posição, status e correspondências.
 */
export function compararEstados(anterior: EstadoMarco, atual: EstadoMarco): DiferencaMarco[] {
  const diferencas: DiferencaMarco[] = [];
  const anteriores = new Map(anterior.provisions.map((p) => [p.id, p]));
  const atuais = new Map(atual.provisions.map((p) => [p.id, p]));
  const posicoesAnteriores = descreverPosicao(anterior.placements);
  const posicoesAtuais = descreverPosicao(atual.placements);

  for (const [id, p] of atuais) {
    const antes = anteriores.get(id);
    if (!antes) {
      diferencas.push({
        tipo: "adicionado",
        provision_id: id,
        detalhe: `Criado depois do marco${p.deleted_at ? " (já retirado da minuta)" : ""}.`,
      });
      continue;
    }
    if (!antes.deleted_at && p.deleted_at) {
      diferencas.push({ tipo: "retirado", provision_id: id, detalhe: "Retirado da minuta depois do marco (reversível)." });
    } else if (antes.deleted_at && !p.deleted_at) {
      diferencas.push({ tipo: "restaurado", provision_id: id, detalhe: "Restaurado na minuta depois do marco." });
    }
    if (antes.redacao_trabalho !== p.redacao_trabalho) {
      diferencas.push({ tipo: "texto", provision_id: id, detalhe: "Redação de trabalho alterada." });
    }
    if (antes.status !== p.status || antes.alteracao_tipo !== p.alteracao_tipo) {
      diferencas.push({
        tipo: "status",
        provision_id: id,
        detalhe: `Marcadores alterados: status ${antes.status} → ${p.status}; alteração ${antes.alteracao_tipo} → ${p.alteracao_tipo}.`,
      });
    }
    const posicaoAntes = posicoesAnteriores.get(id);
    const posicaoAtual = posicoesAtuais.get(id);
    if (posicaoAntes !== posicaoAtual) {
      diferencas.push({
        tipo: "posicao",
        provision_id: id,
        detalhe: `Posição alterada: ${posicaoAntes ?? "sem posição"} → ${posicaoAtual ?? "sem posição"}.`,
      });
    }
  }

  for (const id of anteriores.keys()) {
    if (!atuais.has(id)) {
      diferencas.push({ tipo: "retirado", provision_id: id, detalhe: "Presente no marco e ausente no estado atual." });
    }
  }

  const correspondenciasAnteriores = new Set(anterior.correspondencias.map(chaveCorrespondencia));
  const correspondenciasAtuais = new Set(atual.correspondencias.map(chaveCorrespondencia));
  for (const item of atual.correspondencias) {
    if (!correspondenciasAnteriores.has(chaveCorrespondencia(item))) {
      diferencas.push({
        tipo: "correspondencia",
        provision_id: item.provision_id,
        detalhe: `Vínculo adicionado depois do marco (${item.tipo}).`,
      });
    }
  }
  for (const item of anterior.correspondencias) {
    if (!correspondenciasAtuais.has(chaveCorrespondencia(item))) {
      diferencas.push({
        tipo: "correspondencia",
        provision_id: item.provision_id,
        detalhe: `Vínculo do marco não está mais registrado (${item.tipo}).`,
      });
    }
  }

  const ordem: Record<DiferencaTipo, number> = {
    adicionado: 0,
    retirado: 1,
    restaurado: 2,
    texto: 3,
    posicao: 4,
    status: 5,
    correspondencia: 6,
  };
  return diferencas.sort((a, b) => ordem[a.tipo] - ordem[b.tipo] || a.provision_id.localeCompare(b.provision_id));
}
