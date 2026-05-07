# Lovable Frontend Prompt

Build the frontend for **Sourcery**, an AI-assisted supplier sourcing platform for consumer product brands. Do not build a landing page. The first screen should be the usable sourcing workspace.

Use React + TypeScript. If you can choose the stack, prefer Vite + React + TypeScript + Tailwind + shadcn-style components. Do not create a backend, database, auth provider, Supabase client, or AI calls in the frontend. The backend already exists. Call only relative API routes from the browser:

- `GET /api/health`
- `GET /api/suppliers?limit=20&q=jute`
- `GET /api/suppliers/:id`
- `POST /api/source`
- `POST /api/bargain`
- `POST /api/simulate`

The product: buyers describe a product they want to source, then Sourcery finds relevant suppliers, explains why each supplier fits, shows operational risks, compares price/MOQ/lead-time/quality, drafts a negotiation message, and simulates margin/landed-cost scenarios. It has a special **Bangladesh Mode** that prioritizes Bangladesh and nearby South Asian suppliers for local/regional buyer needs.

Design direction: be creative with color, but make the interface feel like a serious sourcing intelligence tool, not a marketing site. It should be rich, dense, useful, and polished. Think procurement command center: searchable supplier database, AI sourcing run, comparison table, supplier detail drawer, risk signals, margin simulator, and negotiation assistant. The UI should feel fast and responsive, with clear loading, empty, error, and fallback states.

Required screens and sections:

1. **Sourcing Workspace**
   - Search box for buyer brief, e.g. “Find Bangladesh jute bag suppliers for export”.
   - Filters for category, region/country, Bangladesh Mode toggle, and top-K result count.
   - Run sourcing button.
   - Show metadata after each run: retrieval mode, AI provider, LLM mode, elapsed time, cached status, confidence.
   - If `llm_mode` is `deterministic_fallback`, present it honestly as “Verified retrieval + rules mode”, not as a failure.

2. **Supplier Results**
   - Supplier cards or rows with name, country/city, category, unit price, MOQ, lead time, quality rating, risk score, certifications, and BGMEA badge when true.
   - Include rank, fit score, explanation, key factors, and confidence.
   - Make suppliers easy to compare side by side.

3. **Risk & Comparison**
   - For selected suppliers, show risk flags and reasoning.
   - Include a comparison table with price, lead time, MOQ, on-time rate, quality rating, and risk score.
   - Provide a “shortlist” interaction so buyers can compare 2-4 suppliers.

4. **Supplier Detail Drawer/Page**
   - Show full supplier profile, products/subcategory, description, certifications, source/provenance, and operational metrics.
   - Include a button to draft a bargaining message using `POST /api/bargain`.
   - Display the Bengali negotiation draft in a clean message panel with copy button.

5. **Profit / Scenario Simulator**
   - Inputs: selling price, shipping cost per unit, customs rate, packaging cost, order quantity, supplier price delta, shipping delta, lead-time delta.
   - Call `POST /api/simulate`.
   - Show margin, landed cost, risk-adjusted comparison, and best/worst-case style output.

6. **System Health / Demo Readiness**
   - Small status area using `GET /api/health`.
   - Show Supabase status, AI generation provider, embedding provider, and free-provider state in a tasteful debug panel.
   - This is for judges/demo operators, not a giant user-facing explanation.

API response expectations:

- `/api/source` returns `{ suppliers, discovery, risk, comparison, meta }`.
- `meta.retrieval_mode` can be `"vector"`, `"full_text"`, or `"deterministic"`.
- `meta.llm_mode` can be `"ai"` or `"deterministic_fallback"`.
- `meta.ai_provider` can be `"ai_sdk"`, `"pollinations"`, or `"none"`.
- `/api/bargain` returns `{ message, meta }`.
- `/api/simulate` returns scenario/profit outputs for selected suppliers.

Interaction details:

- Use optimistic but honest loading states.
- Never expose secret keys or require users to paste API keys.
- Do not connect directly to Supabase from the frontend.
- Keep API functions centralized in one client file so the backend can be swapped without rewriting UI.
- Build the actual product workflow, not explanatory cards about what the product could do.
- Use icons, tabs, toggles, drawers, tables, badges, charts, and compact panels where they help the workflow.
- Make mobile usable, but optimize the main experience for laptop/desktop judging.

Tone of copy: concise, confident, buyer-focused. Avoid hype. Use labels like “Run sourcing”, “Shortlist”, “Compare”, “Draft bargain message”, “Risk review”, “Margin simulator”, “Bangladesh Mode”.

Important: do not invent fake backend routes. Use only the routes above and design around the metadata honestly. The backend can work without paid OpenAI keys: source uses reliable vector retrieval and deterministic ranking by default, and bargain messages can use a free AI provider when available.
