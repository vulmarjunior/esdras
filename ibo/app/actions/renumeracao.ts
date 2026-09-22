"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { all, run, transaction, now, get } from "@/lib/db";
import { getNumeraveisOrdenados } from "@/lib/renumeracao";
import { normalizarNumero } from "@/lib/numeracao";
import { ordenarPorNumeroDocumento, type IrmaoNumerado } from "@/lib/renumeracao-core";
import { rolesCom } from "@/lib/permissions";
import { publishRealtime } from "@/lib/realtime";

async function audit(userId: number, user_name: string, action: string, entity: string, entity_id: string, detail?: string) {
  await run(
    "INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, detail) VALUES (?, ?, ?, ?, ?, ?)",
    [userId, user_name, action, entity, entity_id, detail || ""]
  );
}

export type RenumeracaoState = { ok?: boolean; error?: string; message?: string };

/**
 * Reordena os artigos de cada pai (capítulo/seção/raiz) pela numeração do
 * documento original da proposta, materializando a ordem pretendida. Não cruza
 * capítulos, não altera textos e não toca na estrutura vigente.
 */
export async function ordenarPorNumeroDocumentoAction(): Promise<RenumeracaoState> {
  const user = await requireRole(...rolesCom("renumerar"));

  const rows = await all<{ id: string; parent_id: string | null; ordem_pai: number; numero: string | null }>(`
    SELECT p.id,
           CASE WHEN pp.id IS NULL THEN p.parent_id ELSE pp.parent_id END AS parent_id,
           CASE WHEN pp.id IS NULL THEN p.ordem_pai ELSE pp.ordem_pai END AS ordem_pai,
           CASE WHEN pp.id IS NULL THEN p.numero ELSE pp.numero END AS numero
      FROM provisions p
      LEFT JOIN provision_placements pp
        ON pp.provision_id = p.id AND pp.version_key = 'proposta'
     WHERE p.type = 'artigo'
  `);

  const grupos = new Map<string, IrmaoNumerado[]>();
  for (const r of rows) {
    const chave = r.parent_id ?? "__raiz__";
    const lista = grupos.get(chave) ?? [];
    lista.push({ id: r.id, numero: r.numero, ordem: r.ordem_pai });
    grupos.set(chave, lista);
  }

  let movidos = 0;
  const detalhes: string[] = [];
  await transaction(async () => {
    for (const lista of grupos.values()) {
      const ordenada = ordenarPorNumeroDocumento(lista);
      const ordemAtual = new Map(lista.map((x) => [x.id, x.ordem]));
      for (let i = 0; i < ordenada.length; i++) {
        const item = ordenada[i];
        if (ordemAtual.get(item.id) === i) continue;
        await run(
          "UPDATE provision_placements SET ordem_pai = ?, updated_at = ?, updated_by = ? WHERE version_key = 'proposta' AND provision_id = ?",
          [i, now(), user.id, item.id]
        );
        detalhes.push(`${item.numero || item.id}: posição ${(ordemAtual.get(item.id) ?? 0) + 1} → ${i + 1}`);
        movidos++;
      }
    }
    await audit(
      user.id,
      user.name,
      "Ordenou a proposta pela numeração do documento original",
      "project",
      "projeto-ibo",
      detalhes.length ? detalhes.join("\n") : "Ordem já correspondia à numeração do documento."
    );
  });

  revalidatePath("/");
  revalidatePath("/renumeracao");
  revalidatePath("/revisao");
  await publishRealtime({ entity: "project", id: "projeto-ibo", action: "reordenacao_documento" });
  return {
    ok: true,
    message:
      movidos === 0
        ? "A ordem já correspondia à numeração do documento original."
        : `${movidos} artigo(s) reposicionado(s) pela numeração do documento. Confira e aplique a numeração quando quiser.`,
  };
}

/**
 * PRD §17 — aplica a numeração de trabalho (artigos e capítulos) conforme a
 * ordem da árvore proposta. A estrutura vigente e seus números históricos
 * permanecem intactos. Artigos com redação concluída que mudam de número geram uma
 * pendência automática de revisão das referências.
 */
export async function applyRenumeracao(): Promise<RenumeracaoState> {
  const user = await requireRole(...rolesCom("renumerar"));

  const numeraveis = await getNumeraveisOrdenados("proposta");

  let alterados = 0;
  let pendencias = 0;
  const detalhes: string[] = [];
  await transaction(async () => {
    for (const n of numeraveis) {
      if (normalizarNumero(n.numeroArmazenado) === normalizarNumero(n.derivado)) continue;
      await run(
        "UPDATE provision_placements SET numero = ?, updated_at = ?, updated_by = ? WHERE version_key = 'proposta' AND provision_id = ?",
        [n.derivado, now(), user.id, n.id]
      );
      detalhes.push(`${n.label}: ${n.numeroArmazenado || "—"} → ${n.derivado}`);
      alterados++;

      if (n.type === "artigo") {
        const prov = await get<{ status: string }>("SELECT status FROM provisions WHERE id = ?", [n.id]);
        if (prov?.status === "aprovado") {
          const descricao = `Revisar referências após renumeração: ${n.label} (era ${n.numeroArmazenado || "sem número"})`;
          const existente = await get<{ id: number }>(
            "SELECT id FROM pending_issues WHERE provision_id = ? AND categoria = 'referencia_cruzada' AND descricao = ? AND status = 'aberta'",
            [n.id, descricao]
          );
          if (!existente) {
            await run(
              "INSERT INTO pending_issues (provision_id, author_id, categoria, descricao, status) VALUES (?, ?, 'referencia_cruzada', ?, 'aberta')",
              [n.id, user.id, descricao]
            );
            pendencias++;
          }
        }
      }
    }
    await audit(
      user.id,
      user.name,
      "Renumeração final aplicada",
      "project",
      "projeto-ibo",
      detalhes.length ? detalhes.join("\n") : "Nenhuma alteração de número necessária (ordem já sequencial)."
    );
  });
  revalidatePath("/");
  revalidatePath("/renumeracao");
  revalidatePath("/consolidado");
  revalidatePath("/pendentes");
  await publishRealtime({ entity: "project", id: "projeto-ibo", action: "renumeracao" });
  return {
    ok: true,
    message:
      alterados === 0
        ? "Nenhum número precisou mudar — a numeração já está sequencial na ordem atual."
        : `Renumeração aplicada: ${alterados} dispositivo(s) atualizado(s)${pendencias ? ` e ${pendencias} pendência(s) de revisão criada(s)` : ""}. Registrado em auditoria.`,
  };
}
