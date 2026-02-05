# PRD: Organization Usage Analytics Dashboard (My Usage parity + Team/User/Stream filters)

## Summary
Replace the current `Organization Dashboard` (high-level KPI overview) with an analytics experience that **replicates the “My Usage” personal dashboard**: same chart, controls, tooltips, summary cards, and detailed tables—**but without local upload components** (CSV / ccusage dropzones) because each user uploads/syncs on their own.

Add new controls that let viewers slice the org’s usage by:
- **Team**
- **User**
- **Stream** (e.g. “local upload”, “API connection / API key”)

This enables **all org members** to see usage patterns across the organization, teams, and individual users (competition/incentives), while preserving the existing “My Usage” workflow for personal ingestion.

---

## Goals
- **My Usage parity** in the org context:
  - Same chart rendering (hour/day aggregation, tokens vs cost modes, date presets + custom range, zoom/drag, copy-as-image, model highlighting, etc.)
  - Same summary cards/boxes and the same model breakdown + details tables and tooltips
- **Add filtering** at the top of the org analytics view:
  - Team filter
  - User filter
  - Stream filter (API connection / API key vs local uploads)
- **Encourage adoption via competition**:
  - Add leaderboards (Top Users / Top Teams) and org-wide visibility for all members
- **Support multi-tenant reality**:
  - Users belong to `organizations/{orgId}`, optionally assigned to a `teamId`
  - Usage data is already saved for paid accounts; free users can still analyze locally but do not persist to Firestore

## Non-goals
- Rebuilding the ingestion/upload UX in the org dashboard (no local file dropzones there).
- Full-blown “billing analytics” (seat usage, Stripe invoices, etc.) beyond what My Usage already offers.
- Building new provider connectors in this PRD (but this PRD defines how their data must be attributed so the filters work).

---

## Personas & primary use-cases
- **Org Admin**
  - Wants to see org-wide token/cost trends, top users, and drill down by team/user/stream.
- **Team Manager**
  - Wants a team-centric view (default to their team; can drill into users).
- **Member**
  - Can see org/team/user breakdown (including streams) and leaderboards to self-educate and optimize usage, and to compete with peers.

---

## Definitions
- **My Usage dashboard**: current personal analytics page (`frontend/src/pages/CursorCostsPage.tsx`) using shared chart/table components.
- **Org Usage Analytics dashboard**: the org-scoped equivalent, driven by persisted usage events rather than uploads.
- **Stream**: a stable identifier representing *where usage came from*.
  - Examples:
    - Local uploads: Cursor CSV, ccusage daily JSON
    - API-based: a specific API connection (“OpenAI Key A”, “Anthropic Admin Key”, etc.)
- **Actor**: the “who” dimension.
  - Usually `userId` in an org.
  - In the future, some API data may be not attributable to a specific user; these events should still have a stream and be visible as “Unattributed”.

---

## Current state (observed in code)
- User tier is already represented as `user.tier` with values:
  - `free_individual`, `paid_individual`, `team`, `enterprise` (see `shared/src/schemas/user.ts`)
- Teams exist and members may have `teamId`:
  - `organizations/{orgId}/teams` documents
  - `organizations/{orgId}/members/{userId}` includes optional `teamId` (see `functions/src/shared/types/organization.ts`)
- CSV / ccusage ingestors already resolve and store:
  - `organizationId` and `teamId` on `users/{uid}/usageEvents/*` documents (see `functions/src/usage/ingestUsageEventsFromCursorCsv.ts` and `ingestUsageEventsFromCcusageDailyJson.ts`)

---

## Requirements

### R1. Org dashboard = My Usage analytics (visual parity)
The org analytics view must match the My Usage page’s analytics experience:
- **Chart**: reuse the same component behavior and UI affordances:
  - time presets, custom date range
  - aggregation mode (hour/day)
  - metric mode (tokens/costs)
  - model selection/highlighting and model breakdown table/tooltips
  - copy-as-image
  - zoom/drag range selection
- **Tables/cards**: same table UX, same tooltips, same summary cards / breakdown cards

**Explicitly excluded** from org dashboard:
- local file upload / drag-drop components (`CSVImport`, `CcusageJsonDrop`, etc.)

### R2. Add Team/User/Stream filters (apply to both chart and tables)
Add a control band above the chart with:
- **Scope selector** (single-select):
  - Organization (default)
  - Team
  - User
- **Team filter** (single-select, shown when scope=Team or when a “Team” sub-filter is enabled):
  - options: All teams + each team by name
- **User filter** (single-select, shown when scope=User OR after choosing a team):
  - options: All users (when allowed) + each user (displayName/email)
  - should support “Unattributed” if events exist without user attribution
- **Stream filter** (multi-select or single-select; preference: multi-select):
  - options include:
    - Local: Cursor CSV uploads
    - Local: ccusage daily JSON uploads
    - API: each configured API connection (displayName)
  - must be stable across refreshes and shareable (URL params optional)

All filters must affect:
- chart series aggregation
- model breakdown table
- detailed event table (if present in the org view)
- summary totals (tokens/cost)

### R3. Permissions & visibility policy (competition/incentive)
Visibility is **org-wide by design** to encourage usage.

- **Admins / Team Managers / Members**: can view org-wide usage and drill down by Team/User/Stream, including leaderboards.

Implementation note:
- If we later need a privacy mode, we can introduce an org setting (not required for this PRD):
  - `organizations/{orgId}.settings.allowMemberUsageBreakdown: boolean`

### R4. Free vs paid behavior (tier)
- **Free users** (`user.tier = free_individual`) can:
  - upload/analyze locally in My Usage (no persistence)
  - **should not** see org analytics because it depends on persisted usage/events
  - should see a clear empty state + CTA (“Upgrade to sync usage to your org”)
- **Paid users** (`paid_individual`, `team`, `enterprise`) have usage saved/synced and can power org analytics.

This answers “are we happy with user profile containing paid account status?”:
- Yes: `user.tier` is the canonical “paid vs free” signal for gating persistence-backed views.

### R5. Leaderboards (Top Users / Top Teams) with click-to-expand
Add competitive leaderboards to the org analytics page.

- **Top Users leaderboard**
  - Default: show **Top 5 users in the org** ranked by **total tokens** for the currently selected time window and stream filters.
  - Each row shows: user (displayName/email), total tokens, total cost (if available), and optional requests.
  - Clicking the leaderboard (or a “View all”) expands into a full table of **all users ranked** by total tokens (sortable).

- **Top Teams leaderboard**
  - Only show if the org has **more than one team** (team count \(> 1\)).
  - Default: show **Top 5 teams** ranked by **total tokens** (same time window + stream filters).
  - Each row shows: team name, total tokens, total cost (if available), member count.
  - Clicking expands into a full table of **all teams ranked** by total tokens (sortable).

Leaderboards must respect the same filter state as the chart/tables:
- time period / custom range
- stream filter
- (optional) if a Team filter is actively selected, the Top Users leaderboard should be scoped to that team; otherwise org-wide.

---

## Data & attribution requirements

### D1. Org analytics must not depend on per-user fan-out reads in the client
Reading `users/{uid}/usageEvents` for *every member* in the browser is:
- slow (N× queries)
- expensive (reads)
- hard to secure cleanly (rules often prevent users from reading other users’ subcollections)

Therefore, org analytics should read from an **org-scoped materialized collection**.

### D2. Proposed org-scoped storage
Create/write to:
- `organizations/{orgId}/usageEvents/{eventId}`

Each doc should contain at least:
- `eventId`
- `organizationId`
- `teamId` (optional)
- `userId` (optional but preferred)
- `provider`
- `sourceType`
- `eventAtMs`
- `day`
- `model.name`
- `tokens.total` (+ breakdown if present)
- `cost.amountMicros` (+ currency)
- `labels.streamId` (required for stream filtering)
- `labels.streamType` (e.g. `local_upload` | `api_connection`)
- `labels.connectionId` (if streamType is api)

### D3. Stream attribution rules
All ingested/synced events must set a stream:
- Local uploads:
  - `labels.streamType = "local_upload"`
  - `labels.streamId = "cursor_csv"` OR `"ccusage_daily_json"`
- API-synced:
  - `labels.streamType = "api_connection"`
  - `labels.streamId = "api:{connectionId}"`
  - `labels.connectionId = "{connectionId}"`

### D4. Backfill / migration
If existing `users/{uid}/usageEvents` lack `labels.streamId`, org analytics must still work:
- Use `sourceType` + `provider` to infer a default `streamId` when missing.
- Optionally run a backfill job later; not required for initial rollout if inference is sufficient.

---

## UI/UX details

### Layout
- Page title: “Usage Analytics” (org context) + subheading showing org name.
- Filter band (new): scope/team/user/stream selectors.
- Leaderboards block (new): Top Users (always) + Top Teams (only if >1 team).
- Chart block: identical to My Usage.
- Below chart: identical breakdown tables/cards as My Usage.

### UX principles
- **Default view should be useful instantly**:
  - Scope: Organization
  - Team/User: “All”
  - Stream: “All”
  - Time period: last 7 days (match My Usage default)
- **Filter dependencies**:
  - If Team is selected, User dropdown should only list members of that team.
  - If User is selected, Team should auto-resolve (if known).
- **Empty state**:
  - If no persisted data in selected scope: show “No usage yet” + hints (“Members need to upload or connect APIs”).

---

## Acceptance criteria (high signal)
- Org page renders the same chart + controls + tooltips as My Usage (visually and functionally).
- Org page shows **Top Users** leaderboard; it can expand to a full ranked list.
- Org page shows **Top Teams** leaderboard only when org has >1 team; it can expand to a full ranked list.
- Selecting a Team changes totals/chart/table consistently.
- Selecting a User changes totals/chart/table consistently.
- Selecting a Stream filters usage to only that stream (e.g. only Cursor CSV vs only API connection).
- Free users do not see persistence-backed org analytics and get a clear CTA; paid tiers do.

---

## Open questions / follow-ups (documented, not blocking PRD)
- Should the org analytics replace the current KPI-style dashboard, or should it become a separate route (e.g. `/dashboard/usage` vs `/dashboard`)?
- Should we add “competition mode” UX extras (badges, streaks, week-over-week change) beyond leaderboards?
- Should Stream filter be multi-select (recommended) or single-select (simpler)?

