from __future__ import annotations

import json
import re
from collections import defaultdict
from copy import deepcopy
from pathlib import Path

import pandas as pd


ROOT = Path(r"D:\sourcery project")
DATA_DIR = ROOT / "outputs" / "supplier-dataset"
JSON_PATH = DATA_DIR / "sourcery_supplier_dataset_actual_names.json"
CSV_PATH = DATA_DIR / "sourcery_supplier_dataset_actual_names.csv"
XLSX_PATH = DATA_DIR / "sourcery_supplier_dataset_final.xlsx"
CLEANUP_REPORT_PATH = DATA_DIR / "sourcery_supplier_dataset_cleanup_report.json"

CATEGORY_ALIASES = {
    "apparel": "Apparel",
    "clothing": "Apparel",
    "garment": "Apparel",
    "garments": "Apparel",
    "beauty": "Beauty",
    "cosmetics": "Beauty",
    "cosmetic": "Beauty",
    "skincare": "Beauty",
    "home": "Home goods",
    "home goods": "Home goods",
    "home textiles": "Home goods",
    "bags & accessories": "Bags & accessories",
    "bag & accessories": "Bags & accessories",
    "bags": "Bags & accessories",
    "bag": "Bags & accessories",
    "food": "Food & beverage",
    "foods": "Food & beverage",
    "food & beverage": "Food & beverage",
    "beverage": "Food & beverage",
    "beverages": "Food & beverage",
    "tea": "Food & beverage",
    "spices": "Food & beverage",
    "packaging": "Packaging",
    "electronics": "Electronics",
    "electronic": "Electronics",
    "textiles": "Textiles",
    "textile": "Textiles",
    "footwear": "Footwear",
    "shoes": "Footwear",
    "industrial": "Industrial",
    "accessories": "Bags & accessories",
}


def load_rows() -> list[dict]:
    raw = JSON_PATH.read_text(encoding="utf-8-sig")
    rows = json.loads(raw)
    if not isinstance(rows, list):
        raise ValueError("Dataset JSON is not a list")
    return rows


def normalize_space(value: object) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def normalize_name(value: object) -> str:
    cleaned = normalize_space(value)
    replacements = [
        (r"\bCo\s+Co\.\b", "Co."),
        (r"\bCo\.\s+Co\.\b", "Co."),
        (r"\bCo\.?\s+Co\.?\b", "Co."),
        (r"\bLtd\.?\s+Ltd\.?\b", "Ltd."),
        (r"\bGroup\s+Group\b", "Group"),
        (r"\bIndustries\s+Industries\b", "Industries"),
        (r"\bWorks\s+Works\b", "Works"),
        (r"\bExports\s+Exports\b", "Exports"),
        (r"\bSupply Co\.\s+Supply Co\.\b", "Supply Co."),
    ]
    for pattern, replacement in replacements:
        previous = None
        while previous != cleaned:
            previous = cleaned
            cleaned = re.sub(pattern, replacement, cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\.{2,}", ".", cleaned)
    return cleaned.replace(" ,", ",").strip(" -")


def normalize_category(value: object) -> str:
    text = normalize_space(value).lower()
    return CATEGORY_ALIASES.get(text, normalize_space(value))


def normalize_field_list(value: object) -> str:
    if isinstance(value, list):
        parts = [normalize_space(item) for item in value]
    else:
        parts = [normalize_space(item) for item in str(value or "").split(",")]

    deduped: list[str] = []
    seen: set[str] = set()
    for part in parts:
        key = part.lower()
        if not part or key in seen:
            continue
        seen.add(key)
        deduped.append(part)
    return ", ".join(deduped)


def numeric_or_none(value: object) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if number == number else None


def row_identity_key(row: dict) -> str:
    return "|".join(
        [
            normalize_name(row.get("name")).lower(),
            normalize_space(row.get("country")).lower(),
            normalize_space(row.get("city")).lower(),
            normalize_category(row.get("category")).lower(),
            normalize_space(row.get("subcategory")).lower(),
        ]
    )


def row_quality_score(row: dict) -> tuple:
    products = normalize_field_list(row.get("products"))
    certifications = normalize_field_list(row.get("certifications"))
    metadata = normalize_space(row.get("metadata_json"))

    return (
        1 if normalize_space(row.get("source_tier")).lower() == "real_priority" else 0,
        len(normalize_space(row.get("description"))),
        len([item for item in products.split(", ") if item]),
        len([item for item in certifications.split(", ") if item]),
        1 if normalize_space(row.get("source_url")) else 0,
        1 if normalize_space(row.get("verified_at")) else 0,
        1 if normalize_space(row.get("risk_notes")) else 0,
        1 if numeric_or_none(row.get("quality_rating")) is not None else 0,
        1 if numeric_or_none(row.get("on_time_rate")) is not None else 0,
        1 if numeric_or_none(row.get("rating")) is not None else 0,
        len(metadata),
    )


def clean_row(row: dict) -> tuple[dict, dict]:
    cleaned = deepcopy(row)
    changes: dict[str, dict[str, str]] = {}

    field_normalizers = {
        "name": normalize_name,
        "country": normalize_space,
        "city": normalize_space,
        "category": normalize_category,
        "subcategory": normalize_space,
        "description": normalize_space,
        "products": normalize_field_list,
        "certifications": normalize_field_list,
    }

    for field, normalizer in field_normalizers.items():
        before = row.get(field)
        after = normalizer(before)
        if isinstance(before, list):
            before_text = normalize_field_list(before)
        else:
            before_text = normalize_space(before)
        if after != before_text:
            changes[field] = {"before": before_text, "after": after}
        cleaned[field] = after

    return cleaned, changes


def write_outputs(rows: list[dict]) -> None:
    JSON_PATH.write_text(json.dumps(rows, indent=2, ensure_ascii=False), encoding="utf-8")
    dataframe = pd.DataFrame(rows)
    dataframe.to_csv(CSV_PATH, index=False, encoding="utf-8")
    dataframe.to_excel(XLSX_PATH, index=False)


def main() -> None:
    original_rows = load_rows()
    cleaned_rows: list[dict] = []
    duplicate_groups: dict[str, list[dict]] = defaultdict(list)
    name_fixes: list[dict] = []
    category_fixes: list[dict] = []

    for row in original_rows:
        cleaned, changes = clean_row(row)
        cleaned_rows.append(cleaned)
        duplicate_groups[row_identity_key(cleaned)].append(cleaned)

        if "name" in changes:
            name_fixes.append(
                {
                    "supplier_id": cleaned.get("supplier_id") or cleaned.get("id"),
                    "before": changes["name"]["before"],
                    "after": changes["name"]["after"],
                }
            )
        if "category" in changes:
            category_fixes.append(
                {
                    "supplier_id": cleaned.get("supplier_id") or cleaned.get("id"),
                    "before": changes["category"]["before"],
                    "after": changes["category"]["after"],
                }
            )

    deduped_rows: list[dict] = []
    duplicate_examples: list[dict] = []
    removed_rows = 0

    for key, group in duplicate_groups.items():
        if len(group) == 1:
            deduped_rows.append(group[0])
            continue

        sorted_group = sorted(group, key=row_quality_score, reverse=True)
        winner = sorted_group[0]
        deduped_rows.append(winner)
        removed_rows += len(group) - 1

        duplicate_examples.append(
            {
                "key": key,
                "count_before": len(group),
                "kept_supplier_id": winner.get("supplier_id") or winner.get("id"),
                "removed_supplier_ids": [
                    row.get("supplier_id") or row.get("id")
                    for row in sorted_group[1:]
                ],
            }
        )

    deduped_rows.sort(
        key=lambda row: (
            normalize_space(row.get("source_tier")).lower() != "real_priority",
            normalize_category(row.get("category")).lower(),
            normalize_space(row.get("subcategory")).lower(),
            normalize_space(row.get("country")).lower(),
            normalize_name(row.get("name")).lower(),
        )
    )

    write_outputs(deduped_rows)

    report = {
        "generatedAt": pd.Timestamp.utcnow().isoformat(),
        "datasetPath": str(JSON_PATH),
        "rowsBefore": len(original_rows),
        "rowsAfter": len(deduped_rows),
        "rowsRemoved": removed_rows,
        "duplicateGroupsCollapsed": len(duplicate_examples),
        "nameFixes": {
            "count": len(name_fixes),
            "examples": name_fixes[:20],
        },
        "categoryFixes": {
            "count": len(category_fixes),
            "examples": category_fixes[:20],
        },
        "duplicateExamples": duplicate_examples[:20],
    }

    CLEANUP_REPORT_PATH.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
