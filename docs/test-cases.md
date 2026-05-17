# Sourcery — Manual Test Cases

A hands-on test plan for verifying every Sourcery feature works end-to-end. Run these in order — most depend on the previous one's state.

## 0. Setup

- App is deployed (or `pnpm dev` is running) and the Supabase project is connected.
- The seed migration ran successfully — the `public.suppliers` table has 80 rows.
- Open the deployed URL in a fresh browser tab.

---

## 1. Landing page

| # | Action | Expected |
|---|---|---|
| 1.1 | Visit `/` | Editorial cream/ink landing page renders. Hero headline visible. |
| 1.2 | Click any "Run a sourcing run" CTA | Navigates to `/app`. |
| 1.3 | Click "Sign in" in the top-right of the landing nav | Navigates to `/auth/login`. |

## 2. Auth flow

| # | Action | Expected |
|---|---|---|
| 2.1 | On `/auth/sign-up`, enter email + password (min 6 chars) twice | Redirects to `/auth/sign-up-success`. |
| 2.2 | Confirm the verification email | Click the magic link → lands on the app shell. |
| 2.3 | On `/auth/login`, sign in with the same credentials | Redirects to `/app/dashboard`. |
| 2.4 | Click "Sign out" in the app nav | Bounces back to `/`. Reloading any `/app/*` page now shows "Sign in" in the nav. |

## 3. Sourcing chat (Source tab)

| # | Action | Expected |
|---|---|---|
| 3.1 | Visit `/app` while signed in | Editorial chat UI loads with starter chips. |
| 3.2 | Click a starter chip | Query populates the textarea. |
| 3.3 | Type a custom query under 5 chars and try to submit | Submit button stays disabled. |
| 3.4 | Submit a real query (e.g. "GOTS organic cotton hoodies, MOQ 300") | "Multi-agent orchestrator running" banner appears with progressive agent steps. |
| 3.5 | After ~10–25s | 5–10 supplier cards render, each with a country, score, and "Why this supplier" accordion. |
| 3.6 | Expand a "Why" accordion | Discovery rationale, risk flags, score breakdown, and (in BD mode) Bangla translation appear. |
| 3.7 | Click "Open comparison" | Routes to `/app/compare` with the same shortlist. |
| 3.8 | Re-run the **exact same query** | Banner shows "cached" and response is instant. |

## 4. Comparison page (Compare tab)

| # | Action | Expected |
|---|---|---|
| 4.1 | After a sourcing run, visit `/app/compare` | Suppliers shown side-by-side with score, price, MOQ, lead time, on-time, risk. |
| 4.2 | Adjust the **target retail price** slider | Margin column recalculates live; suppliers may reorder by profit. |
| 4.3 | Adjust the **monthly volume** slider | Total revenue / total profit columns update. |
| 4.4 | Adjust the **fulfillment cost** slider | All-in landed cost per unit updates. |
| 4.5 | Click "Explain this ranking" | gpt-5-mini natural-language explanation streams in below the table. |

## 5. Simulation panel

| # | Action | Expected |
|---|---|---|
| 5.1 | On the comparison page, change "Currency: USD → BDT (-3%)" | Suppliers paid in BDT see prices fall ~3%; ranks may shift; deltas highlighted. |
| 5.2 | Toggle "Lead-time pressure: +10 days" | Suppliers with longer lead times drop in score; warning chips appear. |
| 5.3 | Click "Explain rank changes" | gpt-5-mini summary lists which suppliers moved up/down and why. |

## 6. Bangladesh Mode

| # | Action | Expected |
|---|---|---|
| 6.1 | Toggle the "Bangladesh Mode" switch in the nav | Orange left border appears across all `/app/*` pages. State persists across reloads. |
| 6.2 | Run the same query as in 3.4 | More Bangladeshi suppliers appear; their risk score is reduced ~20%; certifications include "BGMEA". |
| 6.3 | Expand a Bangladesh supplier's "Why" accordion | A Bangla translation block appears alongside the English one. |
| 6.4 | Click "Open Bargain Copilot" on a BD supplier card | Modal opens. |
| 6.5 | Inside the modal, click "Generate outreach" | gpt-5-mini produces a bilingual (EN + Bangla) cold outreach + counter-offer message. |
| 6.6 | Toggle BD Mode off | Orange border disappears; future queries return broader country diversity. |

## 7. Supplier detail page

| # | Action | Expected |
|---|---|---|
| 7.1 | Click a supplier name on `/app/compare` (or visit `/app/suppliers/{id}`) | Full supplier profile renders: scorecard tiles, certifications, description, BGMEA badge if relevant. |
| 7.2 | Click "Run a sourcing query for {subcategory}" | Routes to `/app?prefill=…` with the textarea pre-filled. |

## 8. Recent runs (Dashboard tab)

| # | Action | Expected |
|---|---|---|
| 8.1 | After running a few queries, visit `/app/dashboard` | Recent queries listed, newest first, with timestamps and shortlist counts. |
| 8.2 | Click "Re-run" on any item | Returns to `/app` with the textarea pre-filled. |
| 8.3 | (Signed in only) Inspect Supabase `saved_searches` table | New rows present, scoped to the signed-in user via RLS. |

## 9. Guardrails & failure modes

| # | Action | Expected |
|---|---|---|
| 9.1 | Submit a malformed query (e.g. only whitespace, 5 chars) | Submit disabled. |
| 9.2 | If the LLM returns invalid JSON | Server retries once with `RETRY GUIDANCE`; response still validates. |
| 9.3 | If retrieval returns 0 candidates | API returns 422 with a friendly "no matching suppliers" error. |
| 9.4 | Disconnect the Supabase env vars | API returns 500 with a clear error message; UI surfaces it without crashing. |

## 10. Automated eval

```sh
SOURCERY_BASE_URL=http://localhost:3000 node scripts/eval-agent.mjs
```

- Runs 5 canonical queries against `/api/source`.
- Verifies response schema, shortlist size, country diversity, and Bangladesh Mode reranking.
- Exits non-zero on any failure (CI-ready).
