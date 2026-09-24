import { describe, expect, it } from "vitest";
import { normalizeProposalNomenclature } from "../lib/legal-nomenclature";
import { provisionLabel } from "../lib/provision-label";

describe("nomenclatura jurídica", () => {
  it("normaliza marcadores de artigo e parágrafo", () => {
    expect(normalizeProposalNomenclature("Artigo 12. Parágrafo 1º. Conforme o artigo 8."))
      .toBe("Art. 12. § 1º. Conforme o art. 8º.");
    expect(normalizeProposalNomenclature("Parágrafo primeiro - texto"))
      .toBe("§ 1º texto");
    expect(normalizeProposalNomenclature("Parágrafo único. Texto"))
      .toBe("Parágrafo único. Texto");
    expect(normalizeProposalNomenclature("Art. 2º- Texto"))
      .toBe("Art. 2º Texto");
  });

  it("exibe rótulos legais na árvore", () => {
    const base = { id: "x", parent_id: null, project_id: "p", titulo: null, ordem: 0, ordem_pai: 0, origem: "original" as const, origem_ref_id: null, sem_origem: 0, deleted_at: null, deleted_by: null, acordo_version: null, acordo_em: null, acordo_por: null, alteracao_tipo: "nao_avaliado", status: "nao_iniciado" as const, texto_vigente: "", proposta_inicial: "", redacao_trabalho: "", justificativa: "", redacao_consolidada: "", posicao_sugerida: null, version: 0, updated_at: "", updated_by: null };
    expect(provisionLabel({ ...base, type: "artigo", numero: "5" })).toBe("Art. 5º");
    expect(provisionLabel({ ...base, type: "paragrafo", numero: "1º" })).toBe("§ 1º");
    expect(provisionLabel({ ...base, type: "paragrafo", numero: "Único" })).toBe("Parágrafo único");
    expect(provisionLabel({ ...base, type: "alinea", numero: "a" })).toBe("a)");
  });
});
