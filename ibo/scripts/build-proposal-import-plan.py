#!/usr/bin/env python3
"""Build a conservative review plan from PDF extraction and current seed data."""

from __future__ import annotations

import argparse
import difflib
import json
import re
import unicodedata
from pathlib import Path


def norm(value: str) -> str:
    value = unicodedata.normalize("NFKD", value or "")
    value = "".join(c for c in value if not unicodedata.combining(c))
    value = value.lower().replace("�", "")
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def body(value: str) -> str:
    # Labels are useful for review but should not determine identity.
    value = re.sub(r"^\s*(art\.?\s*\d+[º°ª]?|par[aá]grafo\s+[^-:]+|[IVXLCDM]+)\s*[-—–:.]?\s*", "", value, flags=re.I)
    return norm(value)


def flatten(node: dict, parent: str | None = None) -> list[dict]:
    row = {
        "id": node.get("id"),
        "parentId": parent,
        "tipo": node.get("type"),
        "numero": node.get("numero"),
        "textoVigente": node.get("textoVigente", ""),
        "chave": body(node.get("textoVigente", "")),
    }
    result = [row]
    for child in node.get("filhos", []):
        result.extend(flatten(child, node.get("id")))
    return result


def load_seed(seed_dir: Path) -> list[dict]:
    rows: list[dict] = []
    for path in sorted(seed_dir.glob("*.json")):
        rows.extend(flatten(json.loads(path.read_text(encoding="utf-8"))))
    return rows


def load_current_json(path: Path) -> list[dict]:
    rows: list[dict] = []
    for node in json.loads(path.read_text(encoding="utf-8")):
        rows.append({
            "id": node.get("id"),
            "parentId": node.get("parent_id"),
            "tipo": node.get("type"),
            "numero": node.get("numero"),
            "textoVigente": node.get("texto_vigente", ""),
            "chave": body(node.get("texto_vigente", "")),
        })
    return rows


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("extraction", type=Path)
    parser.add_argument("seed_dir", type=Path, nargs="?", help="diretório lib/seed-data (alternativa a --current-json)")
    parser.add_argument("--current-json", type=Path, help="exportação somente-leitura de provisions do Supabase")
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    extraction = json.loads(args.extraction.read_text(encoding="utf-8"))
    if bool(args.seed_dir) == bool(args.current_json):
        parser.error("informe seed_dir ou --current-json")
    current = load_current_json(args.current_json) if args.current_json else load_seed(args.seed_dir)
    by_key: dict[str, list[dict]] = {}
    for row in current:
        if row["chave"]:
            by_key.setdefault(row["chave"], []).append(row)

    plan = []
    for record in extraction["records"]:
        source_key = body(record["redacaoAtual"])
        exact = by_key.get(source_key, [])
        candidates = []
        if not exact and source_key:
            for row in current:
                score = difflib.SequenceMatcher(None, source_key, row["chave"]).ratio()
                if score >= 0.86:
                    candidates.append((score, row))
            candidates.sort(key=lambda item: item[0], reverse=True)

        if len(exact) == 1:
            match, confidence, action = exact[0], 1.0, "atualizar_existente"
        elif len(candidates) == 1 or (candidates and candidates[0][0] >= 0.94 and (len(candidates) == 1 or candidates[0][0] - candidates[1][0] >= 0.04)):
            confidence, match, action = candidates[0][0], candidates[0][1], "revisar_similaridade"
        else:
            confidence, match, action = 0.0, None, "revisar_sem_correspondencia"

        plan.append({
            "page": record["page"],
            "row": record["row"],
            "acao": action,
            "confianca": round(confidence, 3),
            "dispositivoId": match["id"] if match else None,
            "tipoAtual": match["tipo"] if match else None,
            "numeroAtual": match["numero"] if match else None,
            "redacaoAtual": record["redacaoAtual"],
            "sugestao": record["sugestao"],
            "justificativa": record["justificativa"],
            "origemSeNovo": "novo" if not match else None,
        })

    summary = {
        "source": extraction["source"],
        "records": len(plan),
        "summary": {action: sum(1 for row in plan if row["acao"] == action) for action in sorted({row["acao"] for row in plan})},
        "rules": {
            "noStructuralMutation": True,
            "newOrigin": "novo",
            "proposedRenumberingIsTextOnly": True,
            "manualValuesMustBePreserved": True,
        },
        "items": plan,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary["summary"], ensure_ascii=False))
    print(f"saída: {args.output}")


if __name__ == "__main__":
    main()
