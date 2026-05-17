# Sourcery — Problem Definition (BuildFest Phase 1)

## Problem statement

Small and mid-size consumer-product brands (apparel, beauty, home goods, food, accessories) lose **60–90 days per SKU** on supplier sourcing. The work is fragmented across:

- Marketplace search (Alibaba, Global Sources, Made-in-China, IndiaMART)
- Trade-show contacts and word-of-mouth
- Email RFQs sent to 30–50 suppliers
- Sample requests, lab tests, certification verification
- Spreadsheet comparisons across price, lead time, MOQ, quality, certifications, country risk

Sourcing managers either don't exist (the founder does it) or are overwhelmed. The result: brands choose suboptimal suppliers, miss launch windows, carry margin loss, and have no visibility into supply-chain risk.

## Why this requires AI (not a rules engine)

1. **Unstructured supplier data.** Supplier profiles, certifications, and capability descriptions are free text in many languages. Pattern-matching alone misses meaning.
2. **Multi-criteria reasoning.** Selecting a supplier is a trade-off across price, lead time, MOQ, quality, on-time rate, country risk, certifications, and buyer-specific preferences. A weighted-sum spreadsheet cannot explain *why* a recommendation is made.
3. **Natural-language sourcing intent.** Buyers describe products in domain language ("280 GSM oversized hoodie, GOTS, MOQ 300, lead under 45 days"). The system must parse this and match it against supplier capabilities.
4. **Localized expertise.** South-Asian sourcing differs structurally from East-Asian sourcing — country risk, certifications, MOQ norms, communication conventions all differ. A model can encode this; a rules table fights it.
5. **Explainability.** Buyers will not act on a recommendation without reasoning. AI-generated, data-grounded explanations are required.

## Target users

- DTC brands scaling from $1M → $50M GMV
- Amazon and Shopify sellers launching new SKUs
- Retailers private-labeling
- Sourcing agencies augmenting their teams
- Bangladeshi entrepreneurs sourcing for export or domestic distribution (Bangladesh Mode)

## Measurable impact

| Metric | Baseline | Target with Sourcery |
|---|---|---|
| Time-to-shortlist (per SKU) | 60–90 days | < 1 day |
| Suppliers compared per SKU | 5–10 | 50+ |
| Decision confidence (1–5) | 2.5 | 4.0+ |
| Cost per supplier discovery | $2–5K (analyst time) | < $50 (AI cost) |
| Supplier diversity score | low (single country) | balanced (3+ countries) |

## Track alignment

This project addresses **BuildFest Track 4 — E-Commerce / AI-Driven Marketplace Optimization** by directly attacking SME sourcing inefficiency, supplier comparison, and supply-chain decision intelligence.
