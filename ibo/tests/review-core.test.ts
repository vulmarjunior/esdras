import { describe, expect, it } from "vitest";
import { buildReview, diffWords, normalizeText, type ReviewNode } from "../lib/review-core";
import { originalPositions } from "../lib/review-original";

function node(overrides: Partial<ReviewNode> = {}): ReviewNode {
  return { id: "art-1", parent_id: "cap-1", project_id: "ibo", type: "artigo", numero: "1º", titulo: null, ordem: 0, ordem_pai: 0, origem: "original", origem_ref_id: null, sem_origem: 0, deleted_at: null, deleted_by: null, acordo_version: null, acordo_em: null, acordo_por: null, alteracao_tipo: "nao_avaliado", status: "nao_iniciado", texto_vigente: "Texto original.", proposta_inicial: "", redacao_trabalho: "", justificativa: "", redacao_consolidada: "", posicao_sugerida: null, version: 0, updated_at: "", updated_by: null, children: [], ...overrides };
}
describe("leitura comparativa", () => {
  it("ignora formatação e espaços, mas preserva diferenças de conteúdo", () => {
    expect(normalizeText("<p>Texto&nbsp; <b>original.</b></p>")).toBe("Texto original.");
    expect(buildReview([node({ redacao_trabalho: "<p>Texto original.</p>" })], originalPositions)[0].change).toBe("Não alterado");
    expect(buildReview([node({ redacao_trabalho: "Texto Original." })], originalPositions)[0].change).toBe("Alterado");
  });
  it("prioriza trabalho mesmo aprovado e usa proposta e vigente como alternativas", () => {
    const first = buildReview([node({ status: "aprovado", redacao_trabalho: "Atual", proposta_inicial: "Proposta", redacao_consolidada: "Congelada" })], originalPositions)[0];
    expect(first.after).toBe("Atual");
    expect(first.status).toBe("aprovado");
    expect(buildReview([node({ redacao_trabalho: "<p><br></p>", proposta_inicial: "Proposta" })], originalPositions)[0].after).toBe("Proposta");
    expect(buildReview([node()], originalPositions)[0].after).toBe("Texto original.");
  });
  it("identifica novos e revogados sem ocultar descendentes", () => {
    expect(buildReview([node({ origem: "novo", id: "novo-1", texto_vigente: "" })], originalPositions)[0].change).toBe("Novo");
    const rows = buildReview([node({ alteracao_tipo: "revogado", children: [node({ id: "filho" })] })], originalPositions);
    expect(rows[0].after).toBe("");
    expect(rows[0].before).toBe("Texto original.");
    expect(rows).toHaveLength(2);
  });
  it("tag 'novo' do operador não esconde o texto vigente nem muda a classificação histórica", () => {
    const row = buildReview([node({ origem: "novo" })], originalPositions)[0];
    expect(row.before).toBe("Texto original.");
    expect(row.change).toBe("Não alterado");
    expect(row.originalLabel).toBe("Art. 1º");
  });
  it("preserva número original por identidade e detecta mudança de capítulo", () => {
    const row = buildReview([node({ numero: "9º", parent_id: "cap-2" })], originalPositions)[0];
    expect(row.originalLabel).toBe("Art. 1º");
    expect(row.renumbered).toBe(true);
    expect(row.moved).toBe(true);
  });
  it("ordena pela posição e não trata inclusão como movimento dos originais", () => {
    const rows = buildReview([node({ id: "art-2", numero: "2º", ordem_pai: 2 }), node(), node({ id: "novo", origem: "novo", ordem_pai: 1 })], originalPositions);
    expect(rows.map(r => r.id)).toEqual(["art-1", "novo", "art-2"]);
    expect(rows.some(r => r.moved)).toBe(false);
    expect(buildReview([node({ ordem_pai: 2 }), node({ id: "art-2", ordem_pai: 0 })], originalPositions).every(r => r.moved)).toBe(true);
  });
  it("não inventa numeração original para identidade desconhecida", () => {
    expect(buildReview([node({ id: "desconhecido" })], originalPositions)[0].originalLabel).toBeNull();
  });
  it("destaca palavras inseridas e removidas preservando os dois textos", () => {
    const [left, right] = diffWords("A igreja antiga permanece.", "A igreja nova permanece.");
    expect(left.filter(p => p.changed).map(p => p.text).join("").trim()).toBe("antiga");
    expect(right.filter(p => p.changed).map(p => p.text).join("").trim()).toBe("nova");
    expect(left.map(p => p.text).join("")).toBe("A igreja antiga permanece.");
    expect(right.map(p => p.text).join("")).toBe("A igreja nova permanece.");
  });
});
