# PRD: Session-Level Analytics

**Date:** 2026-02-23  
**Product:** AICoder.Guru (app)  
**Status:** Draft  
**Related docs:**  
- `plans/Claude_Code_Local_Usage_ccusage_Plan.md` — ccusage ingestion plan (Phase 0/1 context)  
- `plans/docs/260211_1129_PRD_API_File_Ingestion_Endpoint.md` — ingestion API endpoint  
- `plans/docs/CLAUDE_CODE_LOCAL_SYNC_GUIDE.md` — user-facing sync guide  

---

## Summary

AICoder.Guru currently ingests Claude Code usage at **daily granularity** via `ccusage daily --json`. This gives useful aggregate cost and token views but hides the underlying shape of how developers actually work — when they code, how long sessions last, which projects consume most AI usage, and how session frequency compares across team members.

`ccusage` also outputs **session-level JSON** (`ccusage session --json`), which provides per-session records with start/end timestamps, duration, per-session token counts, model used, estimated cost, and project name — all without any conversation content.

This PRD defines the extension of AICoder.Guru's ingestion pipeline, data model, and analytics views to support session-level data as the natural next granularity tier above daily aggregates. No conversation content, prompts, or code is ever stored — only derived metrics.

---

## Confirmed Product Decisions

| Decision | Final Choice | Why |
|---|---|---|
| Conversation content | Never stored | Privacy-first principle; conflicts with enterprise trust requirements |
| Session data source | `ccusage session --json` | Already parsed by ccusage; stable schema; privacy-safe output |
| Deduplication key | `sessionId` from ccusage output | Stable across repeated exports; order-independent |
| Storage model | Extend existing `usageEvents` collection, new `streamId` | Clean coexistence with daily stream; no schema migration needed |
| Daily and session streams | Both coexist per user | Different granularities serve different views; no conflict |
| Project name | Opt-in metadata only | May reveal sensitive project names; default off |
| Rollout | Phase 0 manual upload → Phase 1 local agent → Phase 2 team dashboard | Mirrors existing ccusage daily pattern; proven approach |

---

## Problem Statement

Daily aggregates hide the structure of how developers engage with AI coding tools. A developer who tokens 50k in a day could have done that in one long focused session or thirty fragmented micro-sessions. A manager looking at the dashboard cannot tell the difference.

Without session-level data:

- **Individual developers** cannot see their own coding rhythm — session frequency, average session length, or which projects drive the most AI usage.
- **Team managers** cannot compare session patterns across members — who is using AI consistently versus sporadically, or who has gone inactive.
- **Admins** cannot identify under-utilising team members to target with training or tooling support.
- **Cost attribution** is imprecise — daily totals cannot be broken down by project without session records.

agentsview (a local open-source tool) solves some of this for individual developers, but it is entirely local, single-user, and includes full conversation content browsing. AICoder.Guru can deliver team-level session analytics in the cloud, fully privacy-safe, as a differentiated SaaS capability.

---

## Goals

- Ingest session-level usage metrics from ccusage without ever touching conversation content.
- Provide individual developers with a session heatmap and frequency analytics for their own usage.
- Enable team managers to compare session frequency and AI engagement across their team.
- Enable admins to identify inactive team members who have stopped using AI coding tools.
- Extend the existing API ingestion endpoint to accept session JSON with no breaking changes to the daily stream.
- Remain fully backwards compatible — daily and session ingestion coexist cleanly.

## Non-Goals

- Storing, displaying, or searching conversation content, prompts, code, or tool call details.
- Building a local session browser (this is agentsview's territory; we focus on team-level cloud analytics).
- Real-time session streaming or live sync in Phase 0 or Phase 1.
- Precise billing reconciliation for Claude Max plans (session cost figures are ccusage estimates).
- Replacing the daily aggregate stream — both streams serve different purposes.

---

## Personas and User Stories

### Developer (individual user)

> "As a developer, I want to see my AI coding session history so I understand my own patterns — whether I code in long focused sessions or many short bursts, and how my usage evolves over time."

- See a GitHub contribution-style heatmap of my coding sessions by day.
- View average session duration and total session count per week.
- See which models I use most per session type.
- See session frequency broken down by project (if I opt in to project metadata).

### Team Manager

> "As a team manager, I want to compare AI coding engagement across my team so I can identify who is adopting the tools well and who may need support."

- See a team session frequency summary — sessions per developer per week.
- Identify team members with zero sessions in the past N days.
- Compare average session duration across team members.
- View team-level session trends over time (weekly aggregate).

### Organisation Admin

> "As an admin, I want to see which users have gone inactive so I can follow up before licence costs are wasted."

- View a last-active date per user (based on last session timestamp).
- Filter users by session frequency bucket (e.g. active / occasional / inactive in the last 30 days).
- Export session frequency data per user for reporting.

---

## ccusage Session JSON Schema

The ccusage `session` report produces one record per session. Key fields available for ingestion:

```typescript
interface CcusageSessionRecord {
  sessionId: string           // Opaque stable identifier (hash-derived, not transcript)
  startTime: string           // ISO 8601 timestamp
  endTime: string             // ISO 8601 timestamp
  durationSeconds: number     // Session wall-clock duration
  model: string               // e.g. "claude-opus-4-5"
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  totalTokens: number
  estimatedCostUsd: number    // ccusage estimate, not actual billing
  projectName?: string        // Only present if user ran with --project flag (opt-in)
  instanceId?: string         // Only present if user ran with --instances flag (opt-in)
}
```

The full session JSON wraps records in one of the following shapes (consistent with existing ccusage patterns):

```json
{ "sessions": [ ...CcusageSessionRecord ] }
```

or typed:

```json
{ "type": "session", "data": [ ...CcusageSessionRecord ] }
```

---

## Data Model

### New Firestore event type: `SessionUsageEvent`

Session events are stored in the same `users/{userId}/usageEvents/{eventId}` collection as daily events, distinguished by `streamId` and `sourceType`.

```typescript
interface SessionUsageEvent {
  // Core identity
  eventId: string                       // sha256 of dedup string (see Deduplication)
  streamId: 'ccusage_session_json'      // Distinct from 'api_ccusage_daily_json'
  provider: 'claude_code'
  sourceType: 'ccusage_session_json'

  // Temporal
  sessionStart: Timestamp               // From ccusage startTime
  sessionEnd: Timestamp                 // From ccusage endTime
  durationSeconds: number
  day: string                           // YYYY-MM-DD (derived from sessionStart, user local date)

  // Usage
  model: string                         // Canonicalised model name
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  totalTokens: number
  estimatedCostUsd: number | null       // Labelled as estimate in UI

  // Session identity (privacy-safe opaque hash from ccusage)
  sessionId: string

  // Optional metadata (only if user opted in)
  projectName?: string
  instanceId?: string

  // Attribution
  userId: string
  organizationId?: string
  teamId?: string

  // Provenance
  ingestedAt: Timestamp
  ingestSource: 'manual_upload' | 'local_agent'
  ccusageVersion?: string
  agentVersion?: string
}
```

### Firestore paths

| Data | Path |
|---|---|
| Per-user session events | `users/{userId}/usageEvents/{eventId}` |
| Org fanout (existing pattern) | `organizations/{orgId}/usageEvents/{eventId}` |
| Import dedup guard | `users/{userId}/usageEventImports/{fileHash}` |

No new top-level collections are required. The existing `usageEvents` collection accommodates session events via `streamId` filtering.

### Firestore indexes required

- `(userId, streamId, sessionStart)` — for per-user session timeline queries
- `(organizationId, streamId, sessionStart)` — for org-level team analytics
- `(organizationId, teamId, streamId, sessionStart)` — for per-team manager views
- `(userId, streamId, day)` — for daily heatmap aggregation

---

## Ingestion Changes

### New source type

Extend the existing `ingestUsageFileViaApi` function to detect and handle `ccusage_session_json` as a new source type alongside the existing `ccusage_daily_json`.

Detection heuristic (in order):
1. If the JSON body contains a `sessions` array, treat as session JSON.
2. If `type === 'session'` and `data` is an array, treat as typed session JSON.
3. Otherwise fall through to existing daily detection.

### New parser: `parseCcusageSessionJson`

Location: `functions/src/ingestion/260211_1152_fileParsing.ts` (extend existing file) or new `260223_1611_ccusageSessionParsing.ts`.

Responsibilities:
- Accept raw JSON buffer.
- Detect session JSON shape (handles both `{ sessions: [...] }` and `{ type: 'session', data: [...] }`).
- Map each record to a `SessionUsageEvent` via the canonical model mapper.
- Strip `projectName` and `instanceId` if user has not opted in (default: strip).
- Validate required fields; skip malformed records with a warning in the result.
- Return `{ events: SessionUsageEvent[], skippedCount: number, warnings: string[] }`.

### Deduplication

Dedup key string:
```
ccusage_session|{sessionId}|{model}|{inputTokens}|{outputTokens}
```

`eventId = sha256(dedupString)`

This is stable across repeated exports of the same session, and independent of ingestion order. If ccusage updates cost estimates for a past session (rare), the event will be treated as a duplicate and skipped — acceptable behaviour for v1.

### File-level idempotency

Unchanged from existing pattern: compute `fileHash = sha256(rawFileBuffer)`, check `users/{userId}/usageEventImports/{fileHash}`, reject duplicates with a `409` response.

### Endpoint changes

No new endpoint required. The existing `ingestUsageFileViaApi` HTTP function handles session JSON transparently once the new source type is detected. Response shape is unchanged:

```json
{
  "success": true,
  "sourceType": "ccusage_session_json",
  "importedCount": 42,
  "skippedCount": 3,
  "importId": "abc123"
}
```

---

## Local Agent (Phase 1 Formalised)

This PRD formalises the Phase 1 agent described in `plans/Claude_Code_Local_Usage_ccusage_Plan.md`, extending it to include session-level sync alongside daily sync.

### Agent: `aicoder-agent`

**Distribution:** npm package (`npx aicoder-agent`) or downloadable binary.

**Commands:**

| Command | Description |
|---|---|
| `aicoder-agent pair` | Pair this device with an AICoder.Guru account via device-code flow |
| `aicoder-agent sync` | Run a full sync (daily + session data) since last cursor |
| `aicoder-agent sync --since 2026-01-01` | Sync from a specific date |
| `aicoder-agent sync --daily-only` | Sync daily aggregates only (skip session data) |
| `aicoder-agent status` | Show last sync time, record counts, paired account |
| `aicoder-agent unpair` | Revoke this device's credentials |

**Sync flow:**

1. Read cursor state from `~/.aicoder/sync-state.json`.
2. Invoke ccusage as a library (preferred) or shell out to `npx ccusage@latest session --json --since <lastSyncDate>`.
3. Filter records already seen (compare `sessionId` against local state).
4. POST new records to `ingestUsageFileViaApi` endpoint using the user's API key.
5. On success, update `sync-state.json` with new high-water marks.
6. Log result to stdout and optionally to `~/.aicoder/sync.log`.

**Cursor state file (`~/.aicoder/sync-state.json`):**

```json
{
  "lastDailySyncDate": "2026-02-22",
  "lastSessionSyncEndTime": "2026-02-22T23:59:59Z",
  "deviceId": "mac-pro-home",
  "pairedUserId": "uid_xxx",
  "agentVersion": "1.0.0"
}
```

**Authentication:**

- Reuse existing ingestion API keys (`createIngestionApiKey`) — no new auth mechanism needed.
- Agent stores key in OS keychain (macOS Keychain / Linux Secret Service / Windows Credential Manager) via the `keytar` npm package; falls back to `~/.aicoder/credentials.enc` (AES-256 encrypted with machine-specific key).
- Pairing UI: user generates an API key in the AICoder.Guru web app (Connections page) and pastes it into `aicoder-agent pair --key <key>`.

**Scheduling (user-configured, not managed by agent):**

Documentation provides OS-specific scheduling instructions:
- macOS: `launchd` plist (`~/Library/LaunchAgents/guru.aicoder.agent.plist`)
- Linux: `crontab -e` entry
- Windows: Task Scheduler

Running on a 4-hour interval is the recommended default.

**ccusage integration approach:**

Use ccusage as a library (Option A from the ccusage plan) where possible:
```typescript
import { loadSessions } from 'ccusage'
const sessions = await loadSessions({ since: lastSyncDate })
```

Fall back to `npx ccusage@latest session --json` shell-out only if the library API is unavailable for the target ccusage version.

---

## Frontend — Analytics Views

### 1. Session Heatmap (individual — My Usage page)

A GitHub contribution-style calendar heatmap showing session count per day over the past 52 weeks.

- Each cell = one calendar day.
- Colour intensity = number of sessions that day (0, 1–2, 3–5, 6–10, 11+).
- Tooltip on hover: date, session count, total duration, total tokens.
- Clicking a cell filters the session list below to that day.
- Uses brand colour palette (`primary-500` orange intensity scale).

### 2. Session List / Timeline (individual)

Below the heatmap: a paginated list of sessions for the selected date range.

Columns: Date, Duration, Model, Tokens (input / output / cache), Estimated Cost, Project (if opted in).

Sortable by any column. Default: most recent first.

### 3. Session Frequency Chart (individual — My Usage page)

Line or bar chart showing sessions per week over the past 12 weeks, overlaid with total tokens per week for correlation.

### 4. Team Session Dashboard (manager view — Team Dashboard page)

A table of team members with session metrics for the selected period:

| Member | Sessions (30d) | Avg Duration | Total Tokens | Est. Cost | Last Active |
|---|---|---|---|---|---|

- Sortable by any column.
- Last Active shown as relative time ("3 days ago") with colour coding (green < 3d, amber < 14d, red ≥ 14d).
- Clicking a row opens a modal with that member's session heatmap.

### 5. Org Activity Overview (admin — Dashboard page)

Summary cards added to the existing dashboard:

- **Active users (30d):** users with ≥ 1 session in the past 30 days.
- **Inactive users:** users with 0 sessions in the past 30 days (with link to filtered user list).
- **Total sessions (30d):** org-wide session count.
- **Avg sessions per active user:** org engagement benchmark.

### UI placement

| View | Location | Access |
|---|---|---|
| Session Heatmap | My Usage page (`/`) | All users with session data |
| Session List | My Usage page (`/`) | All users with session data |
| Session Frequency Chart | My Usage page (`/`) | All users with session data |
| Team Session Dashboard | Team Dashboard (`/teams`) | Team managers, admins |
| Org Activity Overview | Org Dashboard (`/dashboard`) | Admins |

---

## Privacy Controls

| Setting | Default | Description |
|---|---|---|
| Upload session data | On (if agent configured) | Developer can disable session upload; daily-only mode available |
| Include project name | Off | Opt-in per user; surfaced in agent configuration |
| Include instance ID | Off | Opt-in per user; may reveal directory/project structure |
| Session heatmap visibility | Self only (individual), team manager can see team | Follows existing role-based access model |

Project name and instance ID are stripped server-side during ingestion if the user has not explicitly opted in, regardless of what the uploaded file contains.

---

## Phased Rollout

### Phase 0 — Manual session JSON upload

**Target:** immediate value with zero new infrastructure.

- Extend the existing `CcusageJsonDrop` component to accept session JSON in addition to daily JSON.
- Add auto-detection of session vs daily format.
- Add new parser `parseCcusageSessionJson`.
- Extend `ingestUsageFileViaApi` to handle `ccusage_session_json` source type.
- Store session events in existing `usageEvents` collection.
- Add session heatmap and session list to My Usage page.

User flow:
1. Run `npx ccusage@latest session --json > sessions.json`
2. Upload `sessions.json` via the existing drop area in AICoder.Guru.
3. View session heatmap on My Usage page.

### Phase 1 — Local sync agent

**Target:** automated background sync for individual developers.

- Publish `aicoder-agent` npm package.
- Implement `pair`, `sync`, `status`, `unpair` commands.
- Agent uses existing ingestion API keys for authentication.
- Add Connections page entry for "Claude Code (Local)" showing: device name, last sync time, sync status, revoke button.
- Provide OS-specific scheduling docs.
- Extend agent to sync both daily and session data on each run.

### Phase 2 — Team and org session analytics

**Target:** manager and admin session visibility.

- Add Team Session Dashboard to the Teams page.
- Add Org Activity Overview cards to the Org Dashboard.
- Implement last-active date indexing and inactive user filtering.
- Firestore composite indexes for org/team session queries.
- Export functionality (CSV) for session frequency data per user.

---

## Implementation Notes

### Parser location

Extend `functions/src/ingestion/260211_1152_fileParsing.ts` with a new `parseCcusageSessionJson` function, following the same pattern as the existing `parseCcusageDailyJson`. If the file becomes large, extract to a companion file `260223_1611_ccusageSessionParsing.ts` in the same directory.

### Model canonicalization

Reuse the existing `functions/src/shared/utils/260210_1550_modelMapping.ts` mapper. Session records use the same model name strings as daily records from ccusage.

### Cost labelling

All `estimatedCostUsd` values from ccusage session data must be displayed with an "Estimated" label in the UI. These are not Anthropic billing figures.

### Backwards compatibility

The existing daily ingestion stream (`streamId: 'api_ccusage_daily_json'`) is untouched. Users who upload both daily and session JSON will have both streams active. Charts on My Usage can be toggled by stream or combined.

### Firestore cost

Session records are more granular than daily aggregates. A developer with 10 sessions per day generates ~3,650 session records per year versus ~365 daily records. At Firestore pricing, this is negligible for individual users. For large orgs (500+ developers), monitor read costs on org-scoped session queries and add aggregation if needed in Phase 2.

---

## Open Questions

| Question | Notes |
|---|---|
| Should `durationSeconds` = wall-clock or active-only time? | ccusage provides wall-clock; active time is not available without transcript analysis |
| How should we handle sessions that span midnight? | Assign to the day of `sessionStart`; document this in UI |
| Should the heatmap show session count or total tokens per day? | Offer both via toggle; default to session count (more legible) |
| Agent OS support scope for Phase 1? | macOS + Linux first; Windows in Phase 1.1 |
| Should the free tier get session heatmap? | Recommend yes — individual session data is core value; gating team views is sufficient |
| What is the minimum ccusage version with stable session JSON? | Verify against ccusage changelog before Phase 0 launch |

---

## Success Metrics

| Metric | Target (3 months post-Phase 1) |
|---|---|
| Users with at least one session upload | 30% of active users |
| Users with local agent installed | 15% of active users |
| Team managers viewing team session dashboard | 40% of team manager accounts |
| Avg sessions ingested per active user per week | ≥ 5 (indicator of meaningful data) |
| Inactive user alerts actioned by admins | Track via "last active" date filter usage |
