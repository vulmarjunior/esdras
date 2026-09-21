/**
 * Referências internas afetadas pela renumeração (server, sem IA).
 *
 * Monta o mapa vigente → proposta (documento) e documento → ordem atual e
 * lista as menções "Art. N" nos textos que precisam de revisão humana.
 */
import { all } from "@/lib/db";
import { provisionLabel } from "@/lib/data";
import { normalizarNumero } from "@/lib/numeracao";
import { detectarMencoes, numeroDoRotulo, type CampoReferencia } from "./referencias-core";

export { CAMPO_LABELS, type CampoReferencia } from "./referencias-core";

export interface ReferenciaAfetada {
  provisionId: string;
  provisionLabel: string;
  campo: CampoReferencia;
  numeroAntigo: number;
  numeroNovo: string;
  alvoLabel: string;
  trecho: string;
  origem: "vigente" | "documento";
}

interface Alvo {
  id: string;
  novo: string;
}

/**
 * Campos que apontam para a numeração vigente (redações da comissão e
 * justificativas). Ficam de fora de propósito:
 * - `texto_vigente`: documento histórico — as menções à numeração antiga
 *   devem permanecer como estão;
 * - `proposta_inicial`: texto importado do documento da proposta — a troca
 *   para a ordem atual só faz sentido depois de materializar a ordem.
 */
const CAMPOS_VIGENTE: CampoReferencia[] = ["redacao_trabalho", "redacao_consolidada", "justificativa"];

/** Mapa número vigente → dispositivo + número na proposta (documento). */
async function montarMapaVigenteParaProposta(): Promise<Map<number, Alvo>> {
  const provs = await all<{ id: string; numero: string | null }>(
    "SELECT id, numero FROM provisions WHERE type = 'artigo'"
  );
  const placements = await all<{ provision_id: string; numero: string | null }>(
    "SELECT provision_id, numero FROM provision_placements WHERE version_key = 'proposta'"
  );
  const porId = new Map(placements.map((p) => [p.provision_id, p.numero]));

  const vigenteParaProposta = new Map<number, Alvo>();
  for (const p of provs) {
    const n = numeroDoRotulo(p.numero);
    const proposta = porId.get(p.id);
    if (n === null || !proposta) continue;
    if (normalizarNumero(proposta) === normalizarNumero(p.numero)) continue;
    vigenteParaProposta.set(n, { id: p.id, novo: proposta });
  }
  return vigenteParaProposta;
}

function rotuloAlvo(id: string, numero: string | null | undefined): string {
  return provisionLabel({ id, type: "artigo", numero: numero ?? null } as never);
}

/** Lista todas as referências afetadas nos textos (todos os dispositivos). */
export async function getReferenciasAfetadas(): Promise<ReferenciaAfetada[]> {
  const vigenteParaProposta = await montarMapaVigenteParaProposta();
  if (vigenteParaProposta.size === 0) return [];

  const rows = await all<{
    id: string;
    numero: string | null;
    numero_proposta: string | null;
    texto_vigente: string;
    proposta_inicial: string;
    redacao_trabalho: string;
    redacao_consolidada: string;
    justificativa: string;
  }>(`
    SELECT p.id, p.numero, pp.numero AS numero_proposta,
           p.texto_vigente, p.proposta_inicial, p.redacao_trabalho, p.redacao_consolidada, p.justificativa
    FROM provisions p
    LEFT JOIN provision_placements pp ON pp.provision_id = p.id AND pp.version_key = 'proposta'`);

  const out: ReferenciaAfetada[] = [];
  for (const r of rows) {
    for (const campo of CAMPOS_VIGENTE) {
      const texto = r[campo] || "";
      if (!texto) continue;
      // Redações copiadas do documento da proposta já usam a numeração da
      // proposta (o primeiro "Art. N" é o próprio número do documento) — não
      // devem ser remapeadas pela numeração vigente.
      if (campo !== "justificativa") {
        const primeira = detectarMencoes(texto)[0];
        const numeroDocumento = numeroDoRotulo(r.numero_proposta);
        if (primeira && numeroDocumento !== null && primeira.numero === numeroDocumento) continue;
      }
      const vistos = new Set<number>();
      for (const m of detectarMencoes(texto)) {
        if (vistos.has(m.numero)) continue;
        const alvo = vigenteParaProposta.get(m.numero);
        if (!alvo) continue;
        vistos.add(m.numero);
        out.push({
          provisionId: r.id,
          provisionLabel: rotuloAlvo(r.id, r.numero),
          campo,
          numeroAntigo: m.numero,
          numeroNovo: alvo.novo,
          alvoLabel: rotuloAlvo(alvo.id, alvo.novo),
          trecho: m.trecho,
          origem: "vigente",
        });
      }
    }
  }
  return out;
}

/** Referências afetadas de um dispositivo (para o painel na tela de análise). */
export async function getReferenciasDoDispositivo(provisionId: string): Promise<ReferenciaAfetada[]> {
  const todas = await getReferenciasAfetadas();
  return todas.filter((r) => r.provisionId === provisionId);
}
