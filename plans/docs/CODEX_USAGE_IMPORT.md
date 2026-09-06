# Codex local usage import

My Usage now includes **Select Codex files** and **Select sessions folder**. Select `~/.codex/sessions` (or your custom CODEX_HOME sessions directory), review the record/token count, then import. Guests see temporary chart data; signed-in users save to their own canonical usageEvents collection. Verified organization membership enables the org copy. Raw session files are parsed locally, not uploaded.

The browser requires a file/folder selection; a hosted website cannot run a local CLI or silently read the home directory. A future unattended sync button would require an installed, authenticated local companion. No companion or background server is needed for this version.

## Exporter

The same TypeScript parser powers the browser and command-line export:

```sh
npm run functions:build
node scripts/export-codex-usage.cjs
# Optional input directory and output prefix:
node scripts/export-codex-usage.cjs /path/to/sessions /tmp/codex-usage
```

The CLI writes JSON and CSV and refuses to overwrite existing files. Re-import JSON with **Select Codex files**. CSV is for external analysis, not the existing Cursor CSV importer. The browser offers both exports without running a CLI. Include archived sessions by selecting/exporting that directory separately if needed.

## Compatibility contract

JSON envelope: `{ "schema": "aicoder.codex.v1", "rows": [...] }`. See `shared/src/codexLedger.ts` for the validated row interface. The Firebase deployment uses an identical copy under `functions/src/shared/codexLedger.ts`, consistent with this repository's mirrored shared sources; keep them synchronized.

- Timestamp is ISO UTC. Session ID plus cumulative counter position provides an event identity independent of filename and upload date.
- `input_tokens` includes cache reads/writes; `output_tokens` includes reasoning. `total_tokens = input_tokens + output_tokens`.
- The existing CursorUsageV2 breakdown receives uncached input separately from cache read/write. Reasoning remains metadata and is not added a second time.
- Canonical UsageEvent uses provider `openai`, source `codex_local`, input excluding cache reads, and `cost.hasCost = false`. Source label survives reload. Server IDs are hashes of stable local event IDs; transactions make retries idempotent and save user/org copies atomically.
- `actual_cost_usd` and `estimated_api_equivalent_cost_usd` are null. There is no guessed model price or invented subscription charge. Existing chart cost totals omit these unknown costs; a visible notice explains the limitation.
- Reasoning effort and service tier are retained when present, but have no dedicated chart controls yet. Model and timestamp retain their existing chart behavior.
- No prompts, responses, tool calls, working directories, repository URLs, or credentials are exported. Session identifiers are retained for deduplication.

## Findings from the existing implementation

The existing ccusage importer explicitly stamps Claude Code provenance, so it cannot be reused unchanged for Codex. The existing OpenAI Admin connector already fetches completions usage, but computes cost from its embedded price table; it does not fetch the Costs API. Those values are estimates, not an exact billed ledger. This feature does not change that connector. A billed-cost integration should store separate period/project cost records rather than inventing per-turn allocations.

The local parser supports observed `session_meta`, `turn_context`, and `event_msg/token_count` cumulative usage records. It differences cumulative counters and drops unchanged snapshots. Malformed lines produce warnings; a counter reset establishes a new baseline with a warning rather than attributing historical tokens again. Missing model is `unknown`. Old logs without usage, cloud-only sessions, copied/forked history, and logging schema changes can limit completeness. No claim of a complete account ledger is made. Duration, speed, repository grouping, and API-equivalent pricing are intentionally not inferred from insufficient data.

Official references: [Codex App Server](https://learn.chatgpt.com/docs/app-server) documents token usage updates; [OpenAI organization usage](https://developers.openai.com/api/reference/resources/admin/subresources/organization/subresources/usage) documents API usage reporting. The local JSONL format was additionally checked against an installed session; it is treated as a version-sensitive adapter.

## Verification and release

Run the Codex parser and import component tests, frontend production build, and Functions build. Deploy the new `ingestCodexLedger` function together with the frontend before using signed-in import. Authenticated Firebase writes require a deployed/emulated environment for end-to-end verification; unit tests do not establish production connectivity.
