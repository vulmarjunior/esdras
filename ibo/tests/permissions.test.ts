import { describe, it, expect } from "vitest";
import { PERMISSOES, rolesCom, temPermissao, type Permissao } from "../lib/permissions";

describe("perfis (PRD §4 / AGENTS.md)", () => {
  const todas: Permissao[] = Object.keys(PERMISSOES) as Permissao[];

  it("admin tem todas as permissões", () => {
    for (const p of todas) expect(temPermissao("admin", p)).toBe(true);
  });

  it("coordenador não tem permissões exclusivas do admin", () => {
    expect(temPermissao("coordenador", "gerenciar_usuarios")).toBe(false);
    expect(temPermissao("coordenador", "corrigir_extracao")).toBe(false);
  });

  it("coordenador gerencia redação, status, dispositivos, reuniões e renumeração", () => {
    for (const p of [
      "editar_redacao",
      "editar_justificativa",
      "gerenciar_status",
      "classificar_alteracao",
      "gerenciar_dispositivos",
      "gerenciar_sugestoes",
      "vincular_dispositivos",
      "gerenciar_reunioes",
      "renumerar",
    ] as Permissao[]) {
      expect(temPermissao("coordenador", p)).toBe(true);
    }
  });

  it("membro apenas contribui e revisa atas", () => {
    expect(temPermissao("membro", "contribuir")).toBe(true);
    expect(temPermissao("membro", "revisar_ata")).toBe(true);
    for (const p of todas.filter((x) => x !== "contribuir" && x !== "revisar_ata")) {
      expect(temPermissao("membro", p)).toBe(false);
    }
  });

  it("todos os perfis podem contribuir e revisar ata", () => {
    for (const role of ["admin", "coordenador", "membro"] as const) {
      expect(temPermissao(role, "contribuir")).toBe(true);
      expect(temPermissao(role, "revisar_ata")).toBe(true);
    }
  });

  it("rolesCom retorna cópia e não expõe o array interno", () => {
    const roles = rolesCom("contribuir");
    roles.push("admin");
    expect(rolesCom("contribuir")).toEqual(["coordenador", "admin", "membro"]);
  });

  it("rolesCom é compatível com requireRole(...roles)", () => {
    expect(rolesCom("gerenciar_usuarios")).toEqual(["admin"]);
    expect(rolesCom("editar_redacao")).toEqual(["coordenador", "admin"]);
    expect(rolesCom("contribuir")).toEqual(["coordenador", "admin", "membro"]);
  });
});
