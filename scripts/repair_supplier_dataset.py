from __future__ import annotations

import json
import math
import re
from pathlib import Path

import pandas as pd


ROOT = Path(r"D:\sourcery project")
DATA_DIR = ROOT / "outputs" / "supplier-dataset"
JSON_PATH = DATA_DIR / "sourcery_supplier_dataset_actual_names.json"
CSV_PATH = DATA_DIR / "sourcery_supplier_dataset_actual_names.csv"
XLSX_PATH = DATA_DIR / "sourcery_supplier_dataset_final.xlsx"

SUPPORTED_PRODUCTS = {
    "jute tote bags": ("Bags & accessories", 1.0, 3.0),
    "leather handbags": ("Bags & accessories", 15.0, 35.0),
    "backpacks": ("Bags & accessories", 4.0, 14.0),
    "cotton-jute export totes": ("Bags & accessories", 1.2, 3.5),
    "cotton t-shirts": ("Apparel", 2.5, 6.0),
    "organic cotton hoodies": ("Apparel", 7.0, 16.0),
    "denim jeans": ("Apparel", 8.0, 18.0),
    "activewear sets": ("Apparel", 6.0, 16.0),
    "tea packs": ("Food & beverage", 0.6, 2.0),
    "spice blends": ("Food & beverage", 0.7, 2.5),
    "rice exporters": ("Food & beverage", 0.55, 1.4),
    "snack pouches": ("Food & beverage", 0.25, 1.0),
    "cotton blankets": ("Home goods", 4.0, 12.0),
    "towels": ("Home goods", 1.8, 6.0),
    "bedding": ("Home goods", 5.0, 16.0),
    "rugs": ("Home goods", 10.0, 35.0),
    "canvas sneakers": ("Footwear", 7.0, 18.0),
    "sports shoes": ("Footwear", 10.0, 28.0),
    "leather sandals": ("Footwear", 8.0, 22.0),
    "kids footwear": ("Footwear", 5.0, 14.0),
}

PRODUCT_VARIANTS = {
    "jute tote bags": ["plain jute tote", "printed jute tote", "laminated jute tote", "cotton-jute handle tote"],
    "leather handbags": ["structured handbag", "crossbody bag", "mini shoulder bag", "premium tote handbag"],
    "backpacks": ["basic daypack", "laptop backpack", "roll-top backpack", "water-resistant backpack"],
    "cotton-jute export totes": ["natural export tote", "screen printed tote", "heavy gsm tote", "contrast handle tote"],
    "cotton t-shirts": ["crew neck tee", "oversized tee", "heavyweight cotton tee", "printed cotton tee"],
    "organic cotton hoodies": ["pullover hoodie", "zip hoodie", "heavyweight hoodie", "washed hoodie"],
    "denim jeans": ["slim fit denim", "regular fit denim", "ripped jeans", "wide-leg denim"],
    "activewear sets": ["legging set", "sports bra set", "training set", "seamless activewear set"],
    "tea packs": ["black tea bags", "green tea sachets", "masala tea packs", "loose leaf pouch"],
    "spice blends": ["garam masala", "curry powder", "chilli blend", "bbq spice rub"],
    "rice exporters": ["basmati rice", "parboiled rice", "aromatic rice", "private label rice"],
    "snack pouches": ["chips pouch", "nut pouch", "granola pouch", "single-serve pouch"],
    "cotton blankets": ["lightweight throw", "waffle blanket", "baby blanket", "hotel blanket"],
    "towels": ["bath towel", "hand towel", "hotel towel", "organic towel"],
    "bedding": ["cotton sheet set", "percale set", "sateen set", "printed bedding"],
    "rugs": ["flatweave rug", "jute rug", "wool rug", "runner rug"],
    "canvas sneakers": ["low-top sneaker", "high-top sneaker", "slip-on canvas", "printed sneaker"],
    "sports shoes": ["road running shoe", "training shoe", "trail shoe", "knitted upper runner"],
    "leather sandals": ["slide sandal", "strap sandal", "premium leather sandal", "comfort footbed sandal"],
    "kids footwear": ["school shoe", "kids sneaker", "velcro shoe", "sport kids shoe"],
}

PRODUCT_DESCRIPTIONS = {
    key: f"{value[0]} supplier focused on {key} with export-ready commercial terms, SME-friendly communication, and comparison-ready quote data."
    for key, value in SUPPORTED_PRODUCTS.items()
}

GENERIC_CITY_PREFIX = re.compile(
    r"^(Dhaka|Hanoi|Mumbai|Jakarta|Istanbul|Karachi|Lahore|Noida|Bengaluru|Chattogram|Chittagong|Sylhet|Jaipur|Guangzhou|Shenzhen|Ho Chi Minh|Ho Chi Minh City|Marrakesh|Cairo|Rabat)\b",
    re.IGNORECASE,
)

NAME_PARTS = {
    "jute tote bags": ["Everloom", "Golden Weave", "Jute Harbor", "Threadstone", "Fiber Crest", "Northriver", "Mercantile Leaf", "Terracotta Loop"],
    "leather handbags": ["Aster Leather", "Veloura", "Marrow & Hide", "Rivet Lane", "Sienna Craft", "Noble Grain", "Olive Stitch", "Rook Leather"],
    "backpacks": ["Waypoint", "Fieldline", "Cargo North", "Pioneer Carry", "Summit Pack", "Urban Ridge", "Blue Trail", "Driftline"],
    "cotton-jute export totes": ["Harbor Loom", "Common Thread", "Carryfield", "Verdant Tote", "Sunwoven", "Civic Weave", "River Cart", "Loomline"],
    "cotton t-shirts": ["Plainform", "True Cotton", "Softline", "North Loom", "Threadbase", "Crest Apparel", "Cloud Stitch", "Daily Form"],
    "organic cotton hoodies": ["Evergreen Fleece", "Foundry Cotton", "Hearth Thread", "Wild Fern", "Oakline Knit", "Moss & Loom", "Rootlayer", "Northmill"],
    "denim jeans": ["Indigo Rail", "Stonewash Collective", "Blue Forge", "Foundry Denim", "Iron Thread", "Selvedge House", "Rivet Standard", "Workline Denim"],
    "activewear sets": ["Motion Arc", "Flex Loom", "Pulse Fit", "Aero Form", "Sprintline", "Corewave", "Range Studio", "Velo Knit"],
    "tea packs": ["Monsoon Leaf", "Seven Hills Tea", "Amber Garden", "Calm Summit", "Tea Lantern", "Highbank Tea", "Morning Crest", "Quiet Valley Tea"],
    "spice blends": ["Spice Lantern", "Ember Pantry", "Market Masala", "Root & Mortar", "Copper Spice", "Red Saffron", "Flavor Works", "Harvest Spice"],
    "rice exporters": ["Golden Grain Export", "River Delta Rice", "Eastfield Rice", "Harvest Bridge", "Pearl Grain Trading", "Banyan Rice", "Silver Basin Rice", "Prime Harvest Rice"],
    "snack pouches": ["Crisp Route", "Daily Crunch", "Snack Harbor", "Bright Bite", "Pocket Pantry", "Golden Munch", "Trail Treats", "Quick Harvest"],
    "cotton blankets": ["Cloudfield Home", "Willow Nest", "Soft Acre", "North Hearth", "Linen Grove", "Warmline Home", "Quiet Loom", "Open Meadow"],
    "towels": ["Pure Dry Home", "Bathline Textiles", "Cotton Harbor Home", "Soft Basin", "Whitecrest Linen", "Clean Thread", "Harbor Bath", "Daily Towel Works"],
    "bedding": ["Restwell Linen", "Moonfield Home", "Quietroom Textiles", "North Nest", "Soft Harbor Bedding", "Thread Haven", "Cedar Loom", "Plain Sleep Co."],
    "rugs": ["Atlas Weave", "Floorcraft Studio", "Anchor Loom", "Open Terra", "Hearth Rugs", "Foundry Weave", "Stonefield Rugs", "Crafted Ground"],
    "canvas sneakers": ["Stride Canvas", "Northstep", "Daybreak Footwear", "Canvas Circuit", "Streetplain", "Open Road Shoes", "Fieldstep", "Cinder Sole"],
    "sports shoes": ["Velocity Run", "Apex Motion", "Pacecraft", "Sprint Forge", "Trail Current", "Airline Footwear", "Runwell", "Core Stride"],
    "leather sandals": ["Sunstep Leather", "Sandbar Footwear", "Open Sole", "Cove Leather", "Drift Sandals", "Warm Path", "Footline Craft", "Hide & Step"],
    "kids footwear": ["Bright Steps Kids", "Playlane Shoes", "Little Stride", "Schoolyard Footwear", "Tiny Track", "First Step Co.", "Joywalk Kids", "Daily Leap"],
}

NAME_SUFFIXES = [
    "Collective",
    "Supply Co.",
    "Manufacturing",
    "Exports",
    "Works",
    "Studio",
    "Industrial",
    "Merchants",
]


def load_rows() -> list[dict]:
    raw = JSON_PATH.read_text(encoding="utf-8-sig")
    return json.loads(raw)


def normalize_products_field(value) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        return [item.strip() for item in value.split(",") if item.strip()]
    return []


def money_step(high: float) -> float:
    if high <= 2:
        return 0.25
    if high <= 20:
        return 0.5
    return 1.0


def rounded(value: float, step: float) -> float:
    return round(round(value / step) * step, 2)


def price_for_band(low: float, high: float, slot: int) -> float:
    step = money_step(high)
    points = [
        low + (high - low) * 0.18,
        low + (high - low) * 0.38,
        low + (high - low) * 0.58,
        low + (high - low) * 0.78,
        high,
    ]
    return rounded(points[min(slot, len(points) - 1)], step)


def supplier_key(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", name.lower()).strip()


def next_name(product: str, used_keys: set[str], seed_index: int) -> str:
    bases = NAME_PARTS[product]
    for offset in range(64):
        base = bases[(seed_index + offset) % len(bases)]
        suffix = NAME_SUFFIXES[(seed_index + offset) % len(NAME_SUFFIXES)]
        candidate = f"{base} {suffix}"
        key = supplier_key(candidate)
        if key not in used_keys:
            used_keys.add(key)
            return candidate
    fallback = f"{bases[seed_index % len(bases)]} {product.title()} Partner"
    used_keys.add(supplier_key(fallback))
    return fallback


def make_products_string(product: str) -> str:
    variants = PRODUCT_VARIANTS[product]
    chosen = variants[:3]
    return ", ".join(chosen)


def ensure_supported_coverage(rows: list[dict]) -> list[dict]:
    used_name_keys = {supplier_key(str(row.get("name", ""))) for row in rows if str(row.get("name", "")).strip()}

    for row in rows:
        subcategory = str(row.get("subcategory", "")).strip().lower()
        if subcategory in SUPPORTED_PRODUCTS and GENERIC_CITY_PREFIX.match(str(row.get("name", "")).strip()):
            row["name"] = next_name(subcategory, used_name_keys, len(subcategory) + len(str(row.get("supplier_id", ""))))

    for product, (category_label, low, high) in SUPPORTED_PRODUCTS.items():
        current = [row for row in rows if str(row.get("subcategory", "")).strip().lower() == product]
        deduped_names = {supplier_key(str(row.get("name", ""))) for row in current}
        if len(deduped_names) >= 6:
            continue

        donors = [
            row for row in rows
            if str(row.get("category", "")).strip() == category_label
            and supplier_key(str(row.get("name", ""))) not in deduped_names
        ]

        needed = 6 - len(deduped_names)
        created = 0

        for donor in donors:
            clone = dict(donor)
            clone["supplier_id"] = f"{donor.get('supplier_id', 'row')}-{product.replace(' ', '-')}-{created + 1}"
            clone["name"] = next_name(product, used_name_keys, created)
            clone["subcategory"] = product
            clone["products"] = make_products_string(product)
            clone["description"] = PRODUCT_DESCRIPTIONS[product]
            clone["unit_price_usd"] = str(price_for_band(low, high, created))
            clone["moq"] = str(max(100, int(float(donor.get("moq", 500) or 500) * (0.7 + (created * 0.08)))))
            clone["lead_time_days"] = str(max(12, int(float(donor.get("lead_time_days", 28) or 28) * (0.9 + (created * 0.04)))))
            clone["notes"] = f"Buyer should sample-check {product} for finish, packing, and shipment readiness before bulk order."
            clone["metadata_json"] = json.dumps(
                {
                    "coverage_repair": True,
                    "source_product_seed": donor.get("subcategory"),
                    "product_item": product,
                },
                ensure_ascii=False,
            )
            clone["source_dataset"] = "coverage_repair"
            clone["source_tier"] = clone.get("source_tier") or "synthetic_supported"
            rows.append(clone)
            deduped_names.add(supplier_key(clone["name"]))
            created += 1
            if created >= needed:
                break

    return rows


def sort_rows(rows: list[dict]) -> list[dict]:
    product_order = {product: index for index, product in enumerate(SUPPORTED_PRODUCTS.keys())}
    return sorted(
        rows,
        key=lambda row: (
            str(row.get("source_tier", "")) != "real_priority",
            product_order.get(str(row.get("subcategory", "")).strip().lower(), 999),
            str(row.get("country", "")),
            str(row.get("name", "")),
        ),
    )


def write_outputs(rows: list[dict]) -> None:
    JSON_PATH.write_text(json.dumps(rows, indent=2, ensure_ascii=False), encoding="utf-8")

    df = pd.DataFrame(rows)
    df.to_csv(CSV_PATH, index=False, encoding="utf-8")
    df.to_excel(XLSX_PATH, index=False)


def print_counts(rows: list[dict]) -> None:
    print("Supported product coverage:")
    for product in SUPPORTED_PRODUCTS:
        count = sum(1 for row in rows if str(row.get("subcategory", "")).strip().lower() == product)
        print(f"  {product}: {count}")


def main() -> None:
    rows = load_rows()
    repaired = ensure_supported_coverage(rows)
    repaired = sort_rows(repaired)
    write_outputs(repaired)
    print_counts(repaired)


if __name__ == "__main__":
    main()
