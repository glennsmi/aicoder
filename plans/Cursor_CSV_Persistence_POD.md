# Unified Usage Events Storage (POD)

**Date:** 2026-02-03  
**Owner:** AICoder.Guru  
**Status:** Draft for review  

## Context / Problem

We need a **single unified, maximal-retention usage event format** that can store:

- Cursor CSV “tokens usage” rows (each row is a single event)
- OpenAI usage data (e.g. GPT-* / Codex), including cached tokens when available
- Gemini usage data (tokens and any cache-related token accounting when available)
- Future providers (Anthropic, GitHub Copilot, etc.) without schema churn

Today, the tokens-only CSV upload flow parses Cursor export CSVs into `CursorUsageV2` rows and displays them immediately, but **does not persist them**.

- In `frontend/src/pages/CursorCostsPage.tsx`, `handleTokensImport()` currently only sets `tempDataV2` and explicitly contains a TODO to “save tokens-only rows”.
- As a result, authenticated users **cannot build longitudinal history** across multiple uploads/time periods, and org/team dashboards cannot reliably aggregate CSV-derived usage.

Separately, the existing Firestore persistence helpers (`frontend/src/lib/firestore.ts`, `frontend/src/lib/enhancedFirestore.ts`) implement **append-only imports** with an overlap window, which **rejects historical uploads** (older time periods) by design. That conflicts with the desired workflow: upload multiple files covering multiple time ranges, with overlap, deduplicate, and “stitch” into one timeline.

## Goals

- **One unified event schema** across CSV + all provider APIs, maximizing retention now to enable richer analysis later.
- **Event granularity preserved**: each Cursor CSV row is stored as exactly one event.
- **Persist usage for authenticated users** so history survives refresh/device changes.
- **Support multi-file + multi-period uploads** (e.g., monthly exports), including overlap.
- **Deduplicate + stitch** overlapping periods into a single consistent time series per user.
- **Every event labeled** with `userId`, `organizationId`, and `teamId` (single team today) to make aggregation straightforward.
- **Idempotent ingestion** so re-uploading the same file(s) or re-running sync jobs is safe.
- **Maximal raw retention**: store provider payloads and unmapped fields so we can backfill/derive later.

## Non-Goals (for this POD)

- BigQuery export/warehouse (nice-to-have future).

## Proposed Approach (Summary)

### Key design choice
Treat every record we ingest (CSV row, API record, etc.) as an immutable **UsageEvent** and store it as a Firestore document with a **deterministic document ID** derived from a canonical “event identity”.

This makes “stitching” across periods trivial:
- “Stitching” = union of events across all uploads, ordered by timestamp.
- “Deduping” = events with the same deterministic ID collapse to a single doc.

### One optimal system (no phased design)
We implement a single ingestion + storage model that supports multiple ingestion sources (CSV upload, API sync jobs) but always writes the same `UsageEvent` documents.

- **CSV**: client parses CSV into normalized events and calls a Functions v2 callable to write them (idempotent).
- **APIs**: scheduled + on-demand Functions ingest provider usage and write the same normalized events (idempotent).

Everything lands in a unified event schema, with provider-specific payload stored for later reprocessing.

## Data Model

### Pricing Catalog (versioned, time-aware)
To compute **hot cost** (near real-time) and **historical cost** (replays with old rates), we store a **versioned pricing catalog** in Firestore.

This catalog is refreshed on a schedule and can also be manually overridden (e.g., backdating the effective start time when a provider changes prices).

**Sources to track (provenance URLs):**
- Claude pricing: `https://platform.claude.com/docs/en/about-claude/pricing` ([Anthropic pricing docs](https://platform.claude.com/docs/en/about-claude/pricing)) and `https://claude.com/pricing#api` ([Claude plans & API pricing](https://claude.com/pricing#api))
- OpenAI pricing: `https://openai.com/api/pricing/` (OpenAI pricing page)
- Gemini pricing: `https://ai.google.dev/gemini-api/docs/pricing` ([Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing))

#### Firestore paths
- `pricingCatalog/providerSnapshots/{snapshotId}`
  - Append-only snapshots of the raw source page content + parsed tables.
- `pricingCatalog/prices/{priceId}`
  - Normalized, queryable price rows with effective windows.

#### `ProviderPricingSnapshot` (append-only)
- **snapshotId**: string
- **provider**: string (`claude` | `openai` | `gemini` | ...)
- **fetchedAtMs**: number
- **sourceUrl**: string
- **sourceEtag**: string (optional)
- **sourceContentHash**: string (required; sha256 of fetched content)
- **parsed**: object (optional; extracted tables/fields)
- **raw**: object (optional; store minimal raw html/text or key sections; keep size reasonable)

#### `PriceRow` (normalized, versioned)
One row represents a price for a given provider/model and “billing dimension”.

- **priceId**: string (deterministic; see below)
- **provider**: string (`claude` | `openai` | `gemini` | ...)
- **modelName**: string (e.g. `gpt-5.2`, `claude-sonnet-4.5`, `gemini-2.5-pro`)
- **dimension**: string
  - examples:
    - `tokens.input`
    - `tokens.output`
    - `tokens.cached_input` (OpenAI)
    - `tokens.cache_read` (Claude prompt caching read)
    - `tokens.cache_write` (Claude prompt caching write; see `conditions.cacheTtl`)
    - `tokens.thinking_output` (Gemini: output includes thinking; we can keep a label, but we still store as output tokens)
    - `context_cache.storage_per_token_hour` (Gemini storage pricing)
- **unit**: string
  - `per_1m_tokens` | `per_token_hour` | `per_1k_requests` | `per_image` | `per_second` (extensible)
- **currency**: string (typically `USD`)
- **amountMicros**: number (required; integer micros, e.g. $2.00 → 2_000_000)

- **conditions**: object (optional; determines when this price applies)
  - **minBillingInputTokens**: number (optional)
  - **maxBillingInputTokens**: number (optional)
  - **cacheTtlSeconds**: number (optional; for cache write pricing tiers, e.g. 300s vs 3600s)
  - **endpointType**: string (optional; e.g. `global` vs `regional` where providers charge premiums)
  - **batch**: boolean (optional; if a provider has batch-discounted pricing)
  - **modality**: string (optional; e.g. `text`, `audio`, `image`, `video` where pricing differs)

- **effectiveStartMs**: number (required)
- **effectiveEndMs**: number (optional; omit if still active)
- **observedAtMs**: number (required; when we fetched/recorded it)
- **source**: object (required)
  - **snapshotId**: string
  - **sourceUrl**: string
  - **notes**: string (optional)

**Deterministic `priceId`**:
- `sha256(provider|modelName|dimension|unit|currency|effectiveStartMs)`

### Cost computation (from events + pricing)
Each `UsageEvent` may include a known cost (e.g. Cursor CSV typically includes cost). If cost is missing, we compute it later using the pricing catalog at the event timestamp.

- If `event.cost.hasCost=true`: treat as **ground truth** (still optionally recomputable for audit).
- If `event.cost.hasCost=false`: compute using:
  - `eventAtMs` (or `periodStartMs` for windowed APIs)
  - `event.model.name`
  - `event.tokens.*` buckets mapped to price dimensions
  - provider-specific “context tier” rules (below)

This requires that our `UsageEvent.tokens` preserves the relevant buckets:
- OpenAI: `tokens.input`, `tokens.output`, and cached input when provided (map to `tokens.cacheRead` and price against `tokens.cached_input`)
- Claude: `tokens.input`, `tokens.output`, `tokens.cacheRead`, `tokens.cacheWrite`
- Gemini: `tokens.input`, `tokens.output`; context caching costs may apply depending on how we use caching (store in `tokens.other`/`metrics` when available)

#### Context-size tier selection (≤200k vs >200k, etc.)
Some providers price differently depending on prompt size / billing input tokens (e.g. ≤200k vs >200k).

We standardize the selector input as:

- **billingInputTokens** \(integer\) =
  - `tokens.input` +
  - `tokens.cacheRead` +
  - `tokens.cacheWrite`

When a provider’s pricing table specifies thresholds, we select the `PriceRow` with matching `conditions.minBillingInputTokens` / `conditions.maxBillingInputTokens` for that event.

Example: Claude long-context pricing (thresholds based on input tokens including cache read/write) is documented in the Anthropic pricing docs ([Anthropic pricing docs](https://platform.claude.com/docs/en/about-claude/pricing)).

### Pricing refresh (“real-time updates”)
Implement scheduled Functions v2 (`europe-west2`) to refresh pricing:
- **`refreshPricingCatalog`** (scheduled daily; can also be invoked manually)
  - fetch provider pricing pages
  - compute content hash
  - if changed: write a new `ProviderPricingSnapshot` and update/insert `PriceRow`s
  - when a price changes:
    - close previous active `PriceRow` by setting `effectiveEndMs`
    - create a new `PriceRow` with `effectiveStartMs` (defaults to fetch time; admin can backdate)

Notes:
- Web pages change format; parsing should be robust and tested per provider.
- Keep provenance links in every snapshot and price row for auditability.

### Firestore write rule: avoid `null` / `undefined`
We will **not write `null`** values. Fields that are unknown/missing are:
- omitted entirely, and/or
- represented with explicit flags (e.g. `hasCost: boolean`)

This keeps writes safe and consistent with the project preference.

### Canonical `UsageEvent` (unified)
We standardize around one canonical document shape, with:
- stable identifiers and timestamps for ordering
- a rich token + cost model
- provider/source metadata
- a `raw` payload to retain unmapped fields

#### Firestore path (per-user, authoritative)
`users/{userId}/usageEvents/{eventId}`

We keep events “under the user’s data”, but every event also includes `organizationId` and `teamId` for aggregation.

#### `UsageEvent` fields (canonical)
- **eventId**: string (deterministic doc ID; see Dedup)
- **userId**: string
- **organizationId**: string (required for org members; omit for individuals)
- **teamId**: string (required for team members; omit for individuals)

- **provider**: string  
  Example values: `cursor`, `openai`, `gemini`, `anthropic`, `github_copilot` (extensible)

- **sourceType**: string  
  Example values: `csv`, `api`, `manual` (extensible)

- **eventAtMs**: number  
  Primary ordering timestamp (ms since epoch). For Cursor CSV rows, this is the parsed row timestamp.

- **periodStartMs**: number (optional)  
- **periodEndMs**: number (optional)  
  Some APIs return usage aggregated over windows (hour/day). We preserve the window explicitly.

- **day**: string  
  Derived from `eventAtMs` in UTC: `YYYY-MM-DD` (for partitioning and aggregation jobs).

- **model**: object
  - **name**: string (the provider model string as given; required)
  - **family**: string (optional; derived classification, e.g. `gpt-5`, `gemini-2.0`; omit if unknown)
  - **version**: string (optional)

- **tokens**: object  
  This object is designed to capture maximal token accounting across providers.
  - **total**: number (required)
  - **input**: number (optional; omit if unknown)
  - **output**: number (optional; omit if unknown)
  - **cacheRead**: number (optional; omit if unknown)
  - **cacheWrite**: number (optional; omit if unknown)
  - **other**: object (optional; provider-specific token buckets, numeric values)
  - **hasBreakdown**: boolean (required)

- **cost**: object
  - **hasCost**: boolean (required)
  - **currency**: string (required; `USD` for CSV cost; future-proof)
  - **amountMicros**: number (optional; cost in micros; omit if unknown)

  Notes:
  - We avoid `null`. If a cost value is missing, set `hasCost=false` and omit `amountMicros`.
  - Use micros to avoid float drift and allow later recomputation.

- **metrics**: object (optional)  
  Numeric provider-specific metrics we want to query/aggregate later without reparsing `raw`.
  Examples: `requests`, `imagesGenerated`, `audioSeconds`, `toolCalls`, etc.

- **labels**: object (optional)  
  Low-cardinality labels for slicing (strings only).
  Examples: `environment`, `workspace`, `project`, `region`, `success`, `billingType`.

- **source**: object (required)
  - **importId**: string (required; “batch identity” for a CSV upload or sync run)
  - **providerEventId**: string (optional; if provider supplies a stable id)
  - **fileName**: string (optional; CSV)
  - **fileHash**: string (optional; sha256 for CSV bytes if computed)
  - **rowIndex**: number (optional; CSV provenance)
  - **fingerprint**: string (required; canonical hash that also drives `eventId`)

- **raw**: object (optional, but strongly recommended)
  Provider payload or minimally-transformed row content to retain all unmapped fields.

- **createdAt**: Firestore server timestamp (required)

Notes:
- We do **not** store “one long structure” in a single doc; Firestore doc size limits make that risky. We store time-series as many small docs, and read via range queries + aggregation.
- Cursor CSV currently includes `tokenBreakdown` (input/cache/output). That maps cleanly into `tokens.*`.

### Aggregations (optional but recommended)
To support fast dashboards and cheap queries, store derived aggregates that can be queried directly by org/team/user.

#### Per-user minute buckets
`users/{userId}/usageAggMinute/{bucketId}`

Fields:
- day (YYYY-MM-DD)
- minute (YYYY-MM-DD HH:mm)
- model.name
- tokens.total
- cost.amountMicros (sum; only for events with `hasCost=true`)
- input/cache/output subtotals (if present)
- eventCount
- lastUpdated

#### Org/team minute buckets
`organizations/{orgId}/usageAggMinute/{bucketId}`
`organizations/{orgId}/teams/{teamId}/usageAggMinute/{bucketId}` (team-level pre-aggregation)

This avoids collection-group scans over all users for dashboards.

## Ingestion + Stitching Logic

### Deterministic event identity (dedup key)
We generate a canonical **fingerprint** for every event using normalized values, then derive `eventId` from that.

#### Fingerprint inputs (Cursor CSV)
- provider = `cursor`
- sourceType = `csv`
- eventAtMs
- model.name
- tokens.total and any known breakdown fields
- cost.amountMicros when present, otherwise the explicit `hasCost=false`

#### Fingerprint inputs (API records)
Prefer provider-supplied stable IDs when available:
- if `source.providerEventId` exists → fingerprint can be `provider|providerEventId`
- else fall back to canonical content (period window + model + token buckets + cost)

Then:
- `source.fingerprint = sha256(canonicalString)`
- `eventId = source.fingerprint` (optionally prefixed by provider, e.g. `openai_${hash}`; not required)

**Result:** re-uploading the same row creates the same document ID → no duplicates.

### Why not “append-only”
Append-only imports (like the current `saveUserUsageData`) reject historical data and rely on a moving “latest timestamp”. For multi-period uploads (e.g., importing last quarter after last week), we need **order-independent ingestion**.

Deterministic IDs make ingestion commutative:
- upload A then B → same final set as upload B then A

### Overlap detection / “matching points”
We can still compute overlap for UX feedback, but correctness does not depend on it:
- Given uploaded rows’ timestamp range \([minTs, maxTs]\), query counts in that range and report “X rows already existed”.
- We can show “overlap window” stats per file (optional).

## Cloud Functions (“cloud code”) responsibilities

We implement ingestion in Functions v2 (`europe-west2`) so:
- events always get user/org/team labels consistently
- dedup is enforced server-side
- we can run API syncs and write the same event schema

### Callable ingestion: CSV → UsageEvents
**Function:** `ingestUsageEventsFromCursorCsv`
- **Type:** Functions v2 callable (`onCall`) in **`europe-west2`**
- **Auth:** required
- **Input:** a chunked payload of normalized CSV rows (derived from `CursorUsageV2`)
- **Behavior:**
  - Resolve `organizationId` and `teamId` for the authenticated user
  - Normalize into `UsageEvent` docs
  - Compute `eventId` via fingerprint
  - Write with `create()` semantics (idempotent)
  - Return `{ saved, duplicates, minEventAtMs, maxEventAtMs, models }`

### Scheduled + on-demand ingestion: APIs → UsageEvents
Provider connectors (OpenAI/Gemini/etc.) should produce the same `UsageEvent` shape.
- If the API returns request-level usage: write one event per request.
- If the API returns aggregated usage windows: write one event per window and set `periodStartMs`/`periodEndMs`.

In both cases:
- keep `raw` payload
- map whatever token/cache buckets exist into `tokens.*` and `tokens.other`
- write cost if present; otherwise `cost.hasCost=false`

## Aggregation Strategy

### Option 1: On-create triggers (incremental)
- Trigger on `users/{userId}/usageEvents/{eventId}` **create**
- Update:
  - per-user minute bucket
  - org minute bucket
  - team minute bucket (if team attribution exists)

Pros:
- near-real-time dashboards
- avoids heavy recompute jobs

Cons:
- more writes per event (cost)
- careful idempotency (must run only on create, not update)

### Option 2: Batch recompute job (range-based)
- After ingest, enqueue a job to recompute aggregates for impacted days (e.g., minDay..maxDay)

Pros:
- fewer total writes if many events are ingested at once
- simpler correctness story

Cons:
- aggregates become eventually consistent
- job orchestration required

**Recommendation:** Start with Option 2 (batch recompute per import) for simplicity; move to triggers later if needed.

## Team / Organization Attribution

Requirement: “under each user account” + “aggregate across each team account”.

We should:
- Store events under `users/{userId}` for ownership and per-user history.
- Copy `organizationId` and `teamId` into each event document at ingestion time.
  - For individuals: omit `organizationId`/`teamId`
  - For org members: always set `organizationId`
  - For team members (single team today): set `teamId`

Then org/team aggregation can:
- query pre-aggregated buckets under org/team, or
- (fallback) use collection-group queries on `usageEvents` filtered by `organizationId`/`teamId` and date range (requires rules/indexing).

## Security / Rules Considerations

- Users can always read/write their own `users/{userId}/...` subcollections.
- Org dashboards require allowing admins/managers to read org/team aggregates.
- Avoid requiring org admins to read other users’ raw events; prefer reading **org/team aggregates**.

## Performance / Limits

- Firestore batch writes max **500 operations**.
- Callable payload size limits: keep rows chunked; consider compressing or sending only canonical fields (no `raw`).
- Document size: avoid storing large `raw` blobs for every row. If we keep `raw`, keep it minimal and/or gated behind a debug flag.

## UX Implications

- Authenticated users: after upload, show “Saved to your account” with counts + range.
- Support multiple uploads over time; the chart should:
  - fetch from aggregates/events for selected date range
  - show seamless timeline across periods
- Provide an “Imports” panel (Phase B) to view past imports, status, and optionally delete an import (advanced; would require reference tracking).

## Migration / Compatibility

Current persistence helpers are request/status-based (`CursorUsage`) and enhanced-format (`EnhancedCursorUsage`). Tokens-only (`CursorUsageV2`) should have its own persistence pipeline to avoid mixing schemas.

We can keep the existing collections untouched and introduce:
- `usageEvents`
- `usageAggMinute`
- corresponding org/team aggregates

## Open Questions

- **Event granularity per API:** Do OpenAI/Gemini endpoints provide request-level usage, or only aggregated windows? (Schema supports both via `periodStartMs`/`periodEndMs`.)
- **Timezone:** Are timestamps consistently UTC in Cursor exports? If not, we must normalize with explicit timezone handling.
- **Cost completeness:** If cost is missing, we will set `cost.hasCost=false` and omit `amountMicros`, then compute later via pricing tables.
- **Model normalization:** Do we want to derive `model.family`/`model.version` immediately or later?

## Next Steps (Implementation Order)

1. Define `UsageEvent` TypeScript types in `shared/` (provider-agnostic) and a small normalization library (CSV row → event; API record → event).
2. Implement `ingestUsageEventsFromCursorCsv` as a Functions v2 callable in `europe-west2`.
3. Wire `CursorCostsPage.handleTokensImport()` to call ingest when `currentUser` exists.
4. Update read paths (user charts + org dashboards) to query aggregates derived from `usageEvents`.
5. Update provider connectors (OpenAI/Gemini/etc.) to emit `UsageEvent` and ingest via scheduled/on-demand functions.

## Execution List (Do This Now)

This is the concrete build order to ship the unified pipeline end-to-end.

### Milestone 1: Unified event storage (Cursor CSV → Firestore)
- [ ] **Shared types**: Add `UsageEvent`, `UsageEventTokens`, `UsageEventCost`, `PriceRow`, `ProviderPricingSnapshot` to `shared/` and export them.
- [ ] **Functions v2**: Add callable `ingestUsageEventsFromCursorCsv` (region `europe-west2`) that:
  - derives `organizationId` and `teamId` for the caller
  - maps each CSV row into a `UsageEvent`
  - computes deterministic `eventId` from fingerprint
  - writes with `create()` semantics (idempotent)
  - never writes `null` fields
- [ ] **Frontend**: On authenticated CSV upload, chunk rows and call the callable; show “saved + duplicates” result.
- [ ] **Firestore rules**: Allow users to write/read their own `users/{uid}/usageEvents/*`. Block cross-user reads.

### Milestone 2: Pricing catalog storage + refresh
- [ ] **Firestore schema**: Create `pricingCatalog/providerSnapshots/*` and `pricingCatalog/prices/*`.
- [ ] **Scheduled refresh**: Functions v2 `refreshPricingCatalog` (daily):
  - fetch provider pages
  - store snapshot with content hash + provenance
  - parse and upsert `PriceRow`s with effective windows
- [ ] **Admin overrides**: Add a simple admin-only UI (or script) to backdate `effectiveStartMs` and close windows when needed.

### Milestone 3: Cost computation & backfill
- [ ] **Cost calculator**: Implement a server-side `computeCostMicros(event, pricingAtTime)` that:
  - selects correct context tier based on `billingInputTokens`
  - applies cache read/write rates where available
  - falls back to model-only computation when breakdown is missing
- [ ] **Backfill job**: Function to compute `computedCost` fields for events where `cost.hasCost=false`.
- [ ] **Dashboards**: Prefer computed costs when present; otherwise display tokens-only.

### Milestone 4: Provider API ingestion into the same event stream
- [ ] **Connectors output**: Update OpenAI/Gemini/Claude connectors to emit `UsageEvent` + raw payload and ingest idempotently.
- [ ] **Attribution**: Ensure every provider event is stamped with user/org/team.
- [ ] **Aggregation**: Build org/team minute aggregates from `usageEvents` for fast dashboards.

