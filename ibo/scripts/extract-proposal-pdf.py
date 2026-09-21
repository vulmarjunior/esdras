#!/usr/bin/env python3
"""Extract the three-column proposal table into a reviewable JSON document.

This is intentionally a staging tool: it never writes to Supabase or changes the
seed.  The source PDF uses merged table cells, so extraction is done by table
column position rather than by reading the page as a single text stream.
"""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
from pathlib import Path

import pdfplumber


HEADER = ("redacao atual", "sugestao", "justificativa")


def clean(value: str | None) -> str:
    if not value:
        return ""
    value = value.replace("\u00ad", "")
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()


def key(value: str) -> str:
    value = unicodedata.normalize("NFKD", value)
    value = "".join(c for c in value if not unicodedata.combining(c))
    value = value.lower().replace("�", "")
    return re.sub(r"[^a-z0-9]+", " ", value).strip()


def merged_columns(row: list[str | None]) -> tuple[str, str, str]:
    # pdfplumber returns nine cells for the three merged table columns.
    # The meaningful cells are consistently positions 0, 3 and 6.
    if len(row) >= 7:
        return tuple(clean(row[i]) for i in (0, 3, 6))  # type: ignore[return-value]
    padded = list(row) + [None] * (7 - len(row))
    return tuple(clean(padded[i]) for i in (0, 3, 6))  # type: ignore[return-value]


def looks_like_header(values: tuple[str, str, str]) -> bool:
    normalized = tuple(key(v) for v in values)
    return normalized == HEADER or any(v in HEADER for v in normalized)


def looks_like_content(values: tuple[str, str, str]) -> bool:
    return any(values)


def extract(source: Path) -> dict:
    records: list[dict] = []
    with pdfplumber.open(source) as pdf:
        for page_number, page in enumerate(pdf.pages, start=1):
            for row_number, row in enumerate(page.extract_tables()[0] if page.extract_tables() else [], start=1):
                current, suggestion, justification = merged_columns(row)
                values = (current, suggestion, justification)
                if not looks_like_content(values) or looks_like_header(values):
                    continue
                records.append(
                    {
                        "page": page_number,
                        "row": row_number,
                        "redacaoAtual": current,
                        "sugestao": suggestion,
                        "justificativa": justification,
                        "chaveAtual": key(current),
                    }
                )
    return {
        "source": source.name,
        "pages": len(pdf.pages),
        "columns": ["redacaoAtual", "sugestao", "justificativa"],
        "records": records,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    result = extract(args.source)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(result['records'])} registros extraídos de {result['pages']} páginas")
    print(f"saída: {args.output}")


if __name__ == "__main__":
    main()
