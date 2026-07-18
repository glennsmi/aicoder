## Product Requirements Document (PRD)

### Project
CSV Upload + Tokens-only v2 Analytics for Cursor Costs

### Owner
Fueld AI • Cursor Costs Tracker

### Goals
- Enable users to import Cursor usage via CSV drag-and-drop (multi-file) and continue supporting paste.
- Standardize the dataset around tokens only (remove requests entirely), while preserving cost fields.
- Produce clear, accurate charts and analytics that reflect tokens and cost over time and by model.
 - Populate the data table immediately after upload; recompute totals and stats.
 - Chart filters (time range, aggregation, metric toggles) must reflect tokens, not requests.
- Backward compatibility with requests is not required. We will ship a v2 tokens-only data structure and UI.

### Non-Goals
- Building a full-blown token price calculator per provider/model beyond what CSV already includes.
- Historical data reprocessing in Firestore (we will not retro-transform old saved docs automatically).

### Personas
- Guest user: Wants quick insights without sign-in; imports a CSV and views analytics locally.
- Authenticated user: Wants permanent storage, deduplication, and longitudinal analytics. May mix paste and CSV imports.

### Input Sources
- Clipboard paste (existing)
- New: CSV upload via drag-and-drop or file picker (.csv only), supporting multiple files dropped at once or sequentially; files can overlap in date ranges and should be merged without duplicates.

### CSV Format (observed from Cursor export)
- Required columns (case-insensitive match):
  - Date: ISO-like or human readable date/time (e.g., 2025-08-28T09:29:13.056Z)
  - Model: e.g., auto, gpt-5, claude-3.5, etc.
  - Tokens: number (can be comma separated)
  - Cost ($): decimal; may include currency symbol or be plain numeric
- Optional columns that we will ingest (ignored for analytics but stored in raw for provenance):
  - User, Kind, Max Mode, Status, Requests (legacy), any unknown extras

### Data Model (v2 canonical fields)
- id: string (composed from date, model, and row index or hash)
- date: string (original)
- timestamp: number (milliseconds since epoch; derived)
- model: string
- tokens: number
- costUsd: number | null (prefer value from CSV if present)
- raw: object (optional; the original row for debugging/auditing)


### Validation & Parsing Rules
- Trim and normalize headers (lowercase, strip punctuation where sensible).
- Accept both comma- and tab-separated CSV.
- Numbers: remove thousands separators, handle decimal points, coerce empty to 0, reject NaN rows.
- Dates: attempt ISO parse first; fall back to `new Date(dateStr)` and reject invalid dates.
- Cost: strip `$` and other non-numeric characters except dot and minus.
- Deduplication key: `${timestamp}-${model}-${tokens}-${costUsd??0}` (or a stable hash of the normalized row). Merge across multiple CSV files, discarding duplicates and stitching overlapping 30-day windows. When logged-in, leverage existing dedup pipeline semantics adapted to tokens-only keys.

### UX Requirements
- Drag-and-drop zone inside the Import section with hover state and error messaging.
- File picker fallback button.
- Accept .csv only; allow multiple files at once or multiple sequential drops. Show per-file and overall import summaries.
- Show parsing progress, row counts, and a short summary (rows accepted, skipped with reasons).
- Preserve existing paste UI and allow users to switch between Paste and Upload.
 - After successful import, update: table rows, chart series, total tokens, total cost, and tokens-based legend/filters.

### Analytics & UI Updates
- Replace “Requests” with “Tokens” across labels, tooltips, legends, and summaries where the new flow is used.
- Charts:
  - Aggregate by hour/day (hourly is the finest granularity), summing tokens per model and overall.
  - Keep cost totals using `costUsd` if available.
- Stats cards: show total tokens; show total USD using `costUsd` sums; show models used.
- CSV download (existing): include tokens column; if cost available, include both USD and converted currency totals.

### Backward Compatibility
- Not applicable for v2. We will not maintain or render legacy requests-based data in v2.

### Error States
- Unsupported file type
- Empty file / zero valid rows
- Missing required columns (Date, Model, Tokens)
- All rows invalid due to parsing
- Mixed/variant headers: attempt tolerant mapping (e.g., `Token` vs `Tokens`); otherwise prompt user to re-export.

### Performance
- Parse in web worker in a later iteration if needed; initial version can parse in main thread with chunked processing for medium files (<10MB).

### Security & Privacy
- Files are processed client-side. No upload to server unless user is authenticated and explicitly saves parsed entries to Firestore.
- Respect existing auth flows and encryption at rest policies already in place for saved data.

### Success Metrics
- Time-to-first-visualization after CSV drop (<2s for 5k rows on modern laptop)
- Error rate on valid CSVs (<1%)
- User retention: increased share of authenticated users performing at least one CSV import and save.


