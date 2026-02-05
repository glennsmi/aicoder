## PRD: Crossfilter-Inspired In-Browser Analytics (Hourly Buckets)

**Date:** 2026-02-04  
**Product:** AICoder.Guru (app)  
**Status:** Draft  
**Related docs:** `plans/Cursor_CSV_Persistence_POD.md` (unified event storage), Crossfilter overview ([square.github.io/crossfilter](https://square.github.io/crossfilter/))

### Summary
Six months of raw usage events can produce **tens of thousands+** rows, making the current “render everything + recompute everything” approach feel **slow, sticky, and jumpy** in the browser.  

This PRD defines a **Crossfilter-inspired** client analytics engine that stays fast by:
- building **indexes once** (dimensions like time, model, user)
- doing **incremental filtering/reducing** instead of full recompute
- showing **details on demand** (virtualized, top-K rows) rather than a giant table

**Key constraint:** we do **not** need finer than **hourly buckets**. Remove 15-minute aggregation options; all aggregation is **hourly** (with daily views derived from hourly).

---

## Problem Statement
When large datasets are loaded (e.g., 6 months), the UI becomes sluggish due to:
- too many DOM nodes (table rows/cells/tooltips)
- expensive derived computations executed per-row and per-render
- full recomputation on every filter/sort interaction

We need a scalable browser strategy that remains smooth as we expand to:
- larger personal histories
- **teams** with **many users** (more events, more dimensions)

---

## Goals
- **Smooth interactions:** filter / zoom / toggle model should feel immediate and not freeze the main thread.
- **Hourly buckets as canonical view data:** no UI path requires 15-min granularity.
- **Scalable dimensions:** support future filtering by **user**, **team**, and **organization** without redesign.
- **Details on demand:** show a small set of raw events when needed without rendering everything.
- **Deterministic, testable data pipeline:** consistent transforms for chart + table + exports.

## Non-Goals
- Using the Crossfilter library directly (we take inspiration only).
- Building a full OLAP cube or BigQuery pipeline (future).
- Supporting minute-level or 15-minute-level analytics (explicitly out of scope).

---

## Users / Personas
- **Individual developer:** wants fast “last 7/30/180 days” charts and cost insights.
- **Team manager (future):** wants team-wide hourly trends and “top users/models”.
- **Org admin (future):** wants org rollups + slicing by team/user/model.

---

## Core User Stories
- As a user, I can view **last 6 months** aggregated by **hour** without the UI lagging.
- As a user, I can filter to one or more **models** and see the chart/totals update instantly.
- As a user, I can drill into **raw events** for a time range without rendering thousands of rows.
- As a manager/admin (future), I can slice by **user** and/or **team** and still get responsive interactions.

---

## Functional Requirements

### 1) Aggregation & Granularity
- **FR-1:** The smallest supported aggregation is **hourly**.
- **FR-2:** Remove 15-minute aggregation options from UI controls and internal state.
- **FR-3:** “Daily” views are allowed, but must be **derived from hourly buckets** (sum 24 hours), not computed from raw events each time.

### 2) Filtering & Slicing (Dimensions)
Inspired by Crossfilter’s “dimensions + incremental filtering/reducing” approach:
- **FR-4:** Support filtering by **time range** (presets + custom range).
- **FR-5:** Support filtering by **model** (multi-select).
- **FR-6 (future):** Support filtering by **userId** (multi-select) for team/org views.
- **FR-7 (future):** Support filtering by **teamId** (single or multi-select depending on org model).

### 3) Table (“Details on Demand”)
- **FR-8:** The main table is not required to show every matching row. Default to **top K (e.g., 200)** most-recent events matching filters.
- **FR-9:** Table must be **virtualized** (only visible rows are rendered).
- **FR-10:** Sorting must not require re-rendering thousands of DOM nodes; sorting applies to the top-K detail set (or occurs within the engine before render).
- **FR-11:** Provide “Export all matching” for power users (CSV download), without rendering all rows.

### 4) Charts & Totals
- **FR-12:** Charts and footer totals read from **hourly buckets** (and derived daily buckets when needed).
- **FR-13:** Hover breakdowns/tooltips must not instantiate large DOM per row; prefer **single shared tooltip** components.

---

## Non-Functional Requirements (Performance & Quality)
- **NFR-1:** Index/aggregate builds must not lock up the UI. Use a **Web Worker** for heavy transforms when dataset exceeds a threshold (e.g., > 10k raw events).
- **NFR-2:** Filtering updates should target “fast feel” (goal: sub-100ms for typical interactions; aspire to ~30ms for common slices as Crossfilter describes).
- **NFR-3:** Avoid quadratic work (no per-row scans over full arrays during render).
- **NFR-4:** Deterministic results: same input events + filters ⇒ same outputs (testable).

---

## Proposed Design (Crossfilter-Inspired, Not Crossfilter)
Crossfilter’s key idea is that most interactions adjust **one dimension** slightly, so the system should:
- precompute **sorted indexes** per dimension
- update results incrementally, not from scratch

We implement the same principles for our domain.

### A) Data Representation (Columnar)
Normalize raw `UsageEvent` / `CursorUsageV2` into column arrays:
- `eventAtMs: number[]` (sorted ascending)
- `modelId: number[]` (dictionary-encoded)
- `userId: number[]` (dictionary-encoded; 0 for “self” in single-user mode)
- `tokensTotal: number[]`
- `tokensInput: number[]`, `tokensOutput: number[]`, `tokensCacheRead: number[]`, `tokensCacheWrite: number[]` (optional; 0 if missing)
- `costMicros: number[]` (0 if missing; plus a `hasCost: boolean[]` if needed)
- `eventId: string[]` (for drill-down / export)

**Why:** columnar + numeric arrays reduce GC pressure and speed up scanning/aggregation.

### B) Canonical Hour Buckets
Transform events into hour buckets with stable keys:
- `hourStartMs = floor(eventAtMs / 3600000) * 3600000`

Bucket grouping keys (vary by view):
- **Personal view:** `(hourStartMs, modelId)`
- **Team/org view (future):** `(hourStartMs, modelId, userId)` and optionally a rollup `(hourStartMs, modelId)` for fast “whole team” charts.

Bucket value sums:
- `tokens.*` sums, `costMicros` sums, `eventCount`

### C) Dimension Indexes
Build indexes once, reused for many interactions:
- **Time index:** buckets sorted by `hourStartMs` (binary search for range).
- **Model index:** `modelId -> bucketIndex[]` (or bitmap mask over bucket indices).
- **User index (future):** `userId -> bucketIndex[]` (or bitmap).
- **Team index (future):** `teamId -> bucketIndex[]` (if team dimension is present in the dataset).

**Implementation note:** start with arrays-of-indices; introduce bitsets later if needed.

### D) Incremental Filtering / Reducing
Maintain a current filter state:
- `timeRange: [startMs, endMs)`
- `selectedModelIds: Set<number>`
- `selectedUserIds: Set<number>` (future)

Compute current “active bucket set” by:
- range slice via time binary search ⇒ candidate bucket indices
- intersect with model/user selections via index lists or bitset AND

Produce outputs:
- `chartSeriesBuckets[]` (hourly, then optionally fold to daily)
- `totals` (sum across active buckets)
- `detailsTopKEventIds[]` (top K recent events) for the table

**Incremental behavior (goal):**
- When only `selectedModelIds` changes, do not rebuild time index; only recompute intersections + sums.
- When only time window shifts slightly (drag/zoom), update with adjacent hours, not rescan everything (optional optimization).

### E) “Details on Demand” Strategy
Keep raw events accessible, but only render a small, user-relevant subset:
- Maintain `eventsSortedByTimeDesc: number[]` (indices) once.
- On filter changes, scan the sorted list until K matches are found (fast for small K).
- Render those K via virtualization.

---

## UX / UI Requirements (Concrete)

### Aggregation controls
- Remove “15 min” aggregation choice entirely.
- Aggregation selector (if kept) is:
  - **Hour** (default)
  - **Day** (derived from hour buckets; optional toggle)

### Large dataset handling
- When dataset is large:
  - show “Building analytics…” progress (worker)
  - chart and totals switch to hourly buckets automatically

### Table defaults
- “Showing **200 most recent events** (of N matching).”
- Button: “Export all matching (CSV)”
- Optional button: “Show more” increments K (200 → 500 → 1000), still virtualized.

---

## Data/Backend Integration (Alignment with Unified Storage)
This PRD assumes raw events are stored as immutable `usageEvents` (per the POD), but UI reads should prefer:
- **hourly aggregates** for chart/totals
- **raw events** only for drill-down / details / export

If server-side aggregates exist, the client engine can still apply the same filtering principles, but over **already-bucketed rows** (even faster).

---

## Success Metrics / Acceptance Criteria
- **AC-1:** Loading 6 months shows chart + table without noticeable UI freezes.
- **AC-2:** Switching model filters updates chart within a “fast feel” threshold.
- **AC-3:** Table scroll remains smooth (virtualized).
- **AC-4:** No 15-minute aggregation option exists in UI.
- **AC-5 (future):** With team data (many users), filtering by user remains responsive due to indexes.

---

## Phased Delivery (Suggested)
- **Phase 1:** Remove 15-min option; aggregate to hourly in-memory for chart; virtualize table; eliminate known quadratic render costs.
- **Phase 2:** Introduce worker-based index + bucket build; add details-on-demand top-K table behavior.
- **Phase 3:** Add user/team dimensions + indexes; support team/org views with the same engine.

