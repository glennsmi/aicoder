## Implementation Plan: CSV Upload + Tokens-only v2 Analytics

### 1) Files to Add / Update
- Add: `frontend/src/components/CSVDragDrop.tsx` – drag-and-drop zone + parser orchestrator.
- Update: `frontend/src/components/CSVImport.tsx` – surface a tabbed interface: Paste | Upload.
- Update: `frontend/src/pages/CursorCostsPage.tsx` – wire new upload callbacks; compute Token-based summary.
- Update: `frontend/src/components/CursorCostsChart.tsx` and `CursorUsageChart.tsx` – rename labels to Tokens, change aggregation to sum tokens, keep cost totals.
 - Update: `frontend/src/components/CursorCostsChart.tsx` and `CursorUsageChart.tsx` – rename labels to Tokens, change aggregation to sum tokens, keep cost totals, and ensure metric toggle shows Tokens vs Costs.
- Update: `shared/src/types` and `schemas` – introduce `CursorUsageV2` (tokens-only) and migrate all consumers to it.
- Update: `frontend/src/lib/firestore.ts` (and enhanced variant) – ensure save path handles tokens fields and dedupe strategy.
- Update: tests in `frontend/src/test` – add parser tests, upload UI tests, chart labeling tests.

### 2) Type & Schema Strategy (breaking v2)
- Define `CursorUsageV2`:
  - id: string
  - date: string
  - timestamp: number
  - model: string
  - tokens: number
  - costUsd?: number | null
  - raw?: Record<string, unknown>
- Remove requests from code paths. All aggregations operate on `tokens`.

### 3) Parsing Pipeline
- Header normalization: toLowerCase + trim + replace(/\s+/g,' ').
- Required headers: includes("date"), includes("model"), includes("tokens"). Optional: includes("cost").
- Value cleaning:
  - tokens: `Number(String(val).replaceAll(',',''))`.
  - costUsd: strip `$` and non-numeric except dot/minus; `parseFloat`.
  - date: `new Date(val)`; validate with `!isNaN(date.getTime())`.
- Row id: `${dateISOString}-${model}-${index}`.
- Return array of normalized objects and a summary: accepted, skipped, errors.

### 4) UX Details
- Drag-and-drop area with states: idle, hover, parsing, error.
- Accepts multiple files at once and sequential drops. Show per-file progress and overall summary.
- Show result banner: e.g., "Imported 4 files • 5,432 rows • 37 skipped (invalid) • 812 deduped".
- Keep existing Clear, Download CSV, and chart behaviors.
 - Upon success: update table rows, recompute totals, refresh chart data and filters to tokens.

### 5) Analytics Changes
- Replace copy: Requests -> Tokens in:
  - Stats cards
  - Chart axis labels, tooltips, legends
  - Table headers where applicable
- Computations:
  - `totalTokens = sum(tokens)`
  - `totalCostUsd = sum(costUsd when present)`; if absent, display cost as N/A or compute later if we add per-model pricing.
- Aggregation: same as today but summing tokens.

### 6) Persistence & Dedup
- For authenticated users, reuse `saveUsageData` pipeline updated for v2 type.
- Dedupe/merge across multiple CSVs: key `${timestamp}-${model}-${tokens}-${costUsd??0}` or stable hash. Keep the newest row on collision and count deduped rows for reporting.
- Store `raw` row payload minimally for provenance.

### 7) Backward Compatibility Handling
- Not applicable. v2 removes requests entirely.

### 8) Testing
- Unit tests: header normalization, number parsing, date parsing, error rows, dedup key stability.
- Component tests: drag-and-drop interactions, multi-file acceptance, per-file and overall summaries, dedup counts displayed.
- Chart tests: bars rendered with tokens, legend labels, tooltip content.

### 9) Rollout
- Ship behind a minor feature flag if needed: detect presence of `CSVDragDrop` and enable in UI by default.
- Monitor console warnings for unknown headers and row rejections.

### 10) Tasks Breakdown
1. Define `CursorUsageV2` type and shared schema; remove requests from codebase.
2. New `CSVDragDrop` component with multi-file support and parsing pipeline.
3. Integrate into `CSVImport` as Paste | Upload tabs; wire to `CursorCostsPage`.
4. Update charts, labels, and summaries to tokens-only.
5. Update persistence and dedupe logic for v2 and multi-file stitching.
6. Add tests for parser, merge/dedup, and UI.

### 11) Open Questions
- Confirm exact header names from Cursor export: `Tokens` and `Cost ($)` consistent?
- Prefer `costUsd` from CSV when present—OK to leave cost empty if not present?
- Max file size we should support per drop? Any need for worker-based parsing now?


