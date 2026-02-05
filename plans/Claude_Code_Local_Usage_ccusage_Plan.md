# Claude Code Local Usage Ingestion via ccusage (Plan)

**Date:** 2026-02-03  
**Owner:** AICoder.Guru  
**Status:** Draft for review  

## Context / Problem

Claude Code’s most common “personal / Max” usage does **not** provide an accessible hosted usage API for individuals. However, Claude Code **does write local JSONL usage logs** to the developer machine, and the open-source tool **`ccusage`** parses those logs into rich usage datasets (daily, monthly, session, blocks) and can output **JSON** for downstream ingestion.

References:
- ccusage guide: [ccusage Guide](https://ccusage.com/guide/)
- ccusage API reference (library entry points / loaders / schemas): [ccusage API Reference](https://ccusage.com/api/)
- ccusage repo: [ryoppippi/ccusage](https://github.com/ryoppippi/ccusage)

Key architectural constraint:
- The AICoder.Guru web app (browser) **cannot** read `~/.config/claude/projects/` or `~/.claude/projects/` due to sandboxing. Therefore we need either:
  - a manual export/import workflow, or
  - a local “agent” running on each developer machine that reads local logs and pushes derived usage up to the SaaS.

## Goals

- **Per-user ingestion:** Each developer can ingest their own Claude Code usage into their AICoder.Guru account.
- **Org/team aggregation:** Org dashboards can aggregate usage across members (and optionally by team) without requiring access to other users’ raw events.
- **Idempotent + deduped:** Repeated syncs should not create duplicates; uploads should be order-independent.
- **Privacy-first:** Upload only usage metrics (tokens, estimated cost, model, timestamps). Never upload prompts, code, or transcript content.
- **Good UX:** Minimal friction. Ideally “pair once, then background sync.”

## Non-Goals (initially)

- Precise billing reconciliation for Max plans (we only have estimates from token counts and price tables).
- “Real-time” usage streaming.
- Mining/deriving productivity signals from transcripts (out of scope + privacy-sensitive).
- Enterprise device management (MDM/IT deployment) in v1.

## Proposed Approach (Summary)

Deliver in phases to reduce risk:

- **Phase 0 (fast validation): Manual JSON import**
  - User runs `ccusage ... --json` locally and uploads the JSON file in the app.
  - Validates: mapping, UI, charts, storage schema, dedup.

- **Phase 1 (recommended): Local sync agent (CLI)**
  - A small cross-platform Node CLI (`aicoder-agent`) runs `ccusage` locally (library usage preferred).
  - Agent authenticates to AICoder.Guru via pairing and uploads normalized usage events.
  - Agent runs on a schedule (cron / launchd / scheduled task) and maintains cursor state to only upload new data.

- **Phase 2: Background + admin controls**
  - In-app “Connections” UI for Claude Code local sync: last sync, device list, revoke device.
  - Optional org policy controls (allow/deny local agents, retention windows).

## Why ccusage (vs parsing Claude logs ourselves)

`ccusage` already solves the hardest compatibility problems:
- Local directory detection (new + legacy locations) and multi-instance aggregation.
- Robust JSONL parsing and report aggregation (daily/monthly/session/blocks).
- Token breakdown (cached tokens, etc.) and estimated costs.
- A documented library API surface (loaders + schemas) suitable for embedding.

## Architecture Options

### Option A: Manual JSON import (Phase 0)

**Flow**
- User runs (examples):
  - `npx ccusage@latest daily --json`
  - `npx ccusage@latest session --json`
- User uploads JSON into AICoder.Guru (new import component parallel to CSV import).

**Pros**
- No local background service to ship.
- Quickest proof of value.

**Cons**
- Manual and error-prone.
- Hard to keep fresh.

### Option B: Local sync agent uploads directly (Phase 1)

**Flow**
- User installs/runs `aicoder-agent`.
- Agent pairs with AICoder.Guru (device-code pairing).
- Agent periodically runs ccusage loaders and uploads deltas.

**Pros**
- Best UX once paired.
- Keeps data up-to-date with minimal user action.

**Cons**
- Requires distributing and maintaining an agent.
- Needs secure auth + revocation model.

### Option C: Local agent provides `localhost` bridge to browser

**Flow**
- Agent runs `localhost` API.
- Web app pulls from local API and then saves to Firebase.

**Pros**
- Upload is user-triggered (“Import from local” button).

**Cons**
- CORS/port/firewall complexity.
- Still needs pairing/auth.
- Less reliable than “agent uploads directly.”

**Recommendation:** Option B for production, with Option A as an MVP.

## Data Model (Canonical)

We should normalize Claude Code usage into the same “events + aggregates” pattern used for Cursor token CSV persistence (see `plans/Cursor_CSV_Persistence_POD.md`).

### Canonical event: `UsageEventV1` (proposed)

Firestore path (per-user):
- `users/{userId}/usageEvents/{eventId}`

Fields (proposed minimal set):
- **eventId**: deterministic (see Dedup)
- **provider**: `'claude_code' | 'cursor' | 'anthropic_api' | ...`
- **sourceType**: `'local_agent' | 'csv_upload' | 'api_connector'`
- **timestamp**: number (ms)
- **day**: string (`YYYY-MM-DD`)
- **model**: string (e.g. `claude-3-5-sonnet`, etc.)
- **inputTokens**: number
- **outputTokens**: number
- **cachedInputTokens**: number (or `cacheReadTokens`, depending on chosen naming)
- **cacheWriteTokens**: number (if available)
- **totalTokens**: number
- **estimatedCostUsd**: number | null
- **metadata** (optional, privacy-safe):
  - **instanceId**: string | null (only if user opts-in; may reveal project names)
  - **sessionId**: string | null (opaque hash; not transcript)
  - **ccusageVersion**: string | null
  - **agentVersion**: string | null
- **organizationId**: string | null (copied for aggregation routing)
- **teamId**: string | null
- **ingestedAt**: server timestamp

Notes:
- This plan suggests a *unified* event type to support multi-provider analytics. If we want to move faster, we can start with provider-specific collections (e.g. `claudeCodeUsageEvents`) and unify later.

### Aggregations

To avoid expensive org-wide queries:
- `users/{userId}/usageAggMinute/{bucketId}`
- `organizations/{orgId}/usageAggMinute/{bucketId}`
- `organizations/{orgId}/teams/{teamId}/usageAggMinute/{bucketId}` (optional)

Bucket dimensions (recommended):
- `minute` (YYYY-MM-DD HH:mm) + `provider` + `model`

## Deduplication / Idempotency

The agent/import must be safe to rerun. Use deterministic IDs:

Canonical string (example):
- `${provider}|${timestamp}|${model}|${inputTokens}|${outputTokens}|${cachedInputTokens}|${cacheWriteTokens}|${estimatedCostUsd ?? 'null'}`

Then:
- `eventId = sha256(canonicalString)`

This is intentionally order-independent and robust across repeated syncs.

## Authentication & Pairing (Agent)

### Device-code pairing (recommended UX)

1. User in web app selects “Connect Claude Code (Local)” and receives a short pairing code.
2. User runs `aicoder-agent pair` and pastes the code.
3. Backend exchanges code → issues a scoped token/session for that user/device.
4. Agent stores token in OS keychain (preferred) or encrypted local file.
5. Web app can revoke tokens/devices.

Security considerations:
- Token should be revocable and scoped to *only* “upload my usage events”.
- Rotate and expire long-lived tokens.

## ccusage Integration Approach (Agent Implementation)

Two viable implementation styles:

### A) Use ccusage as a library (preferred)

Use the documented loader functions referenced in the API docs (e.g. daily/session/monthly data loaders) rather than shelling out. This should be more stable and faster, and avoids CLI parsing.

Advantages:
- Typed schemas and stable interfaces (per [ccusage API Reference](https://ccusage.com/api/)).
- No dependency on terminal output formatting.

### B) Shell out to `ccusage --json` (acceptable in Phase 0/1)

Pros:
- Easiest to bootstrap.

Cons:
- Harder to version-pin and handle edge cases.
- Requires `npx`/package runner availability.

## Mapping ccusage Output → Canonical Events

ccusage supports multiple report types; we should choose the one that best aligns with “event” ingestion:

- **Daily**: easiest for dashboards, but loses per-session granularity.
- **Session**: supports per-conversation grouping; risk of session IDs exposing info if derived from paths.
- **Blocks**: matches Claude billing windows; may be useful for burn-rate views.

Recommendation:
- Start by ingesting **daily aggregates** per model as “events” with a synthetic timestamp at day boundary (or store as daily aggregates directly).
- Then extend to session-level ingestion if desired.

Design decision:
- If we ingest “daily rows” as events, we need uniqueness keys based on `(day, model, provider, source)` rather than high-resolution timestamps.
- Alternatively, store daily rows in a separate `usageAggDay` collection.

**Proposed v1:** store daily aggregates as `usageAggDay` (clean + cheap), and keep `usageEvents` for higher-resolution providers (Cursor CSV).

## Firestore Writes & Cost

If we ingest per-day aggregates:
- Writes per user per day ≈ number of models used that day (usually small).
- This is cheaper than ingesting every transcript entry.

If we ingest event-level entries:
- Writes could be very high and become costly.

Recommendation:
- Default to daily aggregates first.
- Keep an escape hatch to ingest session-level for power users.

## UX / Product Surface

### “API Connections” page

Add “Claude Code (Local)” connection type:
- shows connection state (paired / last sync / device name)
- sync interval setting (e.g. hourly/daily)
- “Revoke device” action

### Import UI (Phase 0)

Add a new import module:
- “Upload ccusage JSON”
- Shows parsed range and totals before saving
- Warn if JSON includes project paths/instance IDs (and offer “strip metadata” toggle)

## Privacy & Compliance

Default behavior:
- Upload only usage totals and model names.
- Do not upload:
  - prompts
  - code
  - file paths
  - project names

Opt-in:
- If we ever support “per project/instance”, treat it as sensitive metadata and add explicit opt-in plus clear UI messaging.

## Implementation Plan (High-level)

### Phase 0: Manual JSON import
- Add frontend importer for ccusage JSON (daily first).
- Normalize to an internal type (e.g. `ClaudeCodeDailyUsageRow`).
- Persist to Firestore under `users/{userId}/claudeCodeAggDay` with deterministic doc IDs.
- Update “My Usage” charting to allow selecting provider(s).

### Phase 1: Local sync agent
- Create `aicoder-agent` CLI:
  - `pair`
  - `sync --since <date>`
  - `status`
- Implement device-code pairing with Functions v2 callable endpoints (region `europe-west2`).
- Implement scheduled sync instructions per OS (docs), and “manual sync” command.

### Phase 2: Admin + dashboards
- Show org-level aggregates and filters by provider/model.
- Add device management and security controls.

## Open Questions

- **Granularity:** Do we want daily-only for Claude Code Max users, or session-level too?
- **Timezone:** Should daily aggregation be per user locale timezone or UTC?
- **Model naming:** Ensure model aliases from ccusage map cleanly to our model taxonomy.
- **Cost:** ccusage costs are estimates; do we label them explicitly as “estimated”?
- **Metadata risk:** If `--instances` or `--project` outputs are used, do they reveal sensitive names?

## Next Steps

- Decide v1 granularity (daily aggregates recommended).
- Add a sample `ccusage daily --json` fixture into `plans/docs/` (redacted) for parser development.
- Implement Phase 0 import UI + Firestore schema.
- Draft agent pairing design (token scope, revocation, storage).

