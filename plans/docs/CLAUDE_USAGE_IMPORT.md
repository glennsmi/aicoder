# Claude Code local usage import

**My Usage → Select Claude Code files / Select Claude projects folder** reads local JSONL transcripts or an exported ledger JSON. Select `~/.claude/projects`, or the `projects` directory under a custom `CLAUDE_CONFIG_DIR`. The folder picker includes nested project and subagent logs. macOS users can press Command-Shift-G in the picker to enter a hidden path.

Preview locally, then click **Import into chart** (guest) or **Import and save** (signed in). JSON and CSV exports are available from the same preview. The browser cannot silently access the home directory or run a terminal command. Conversation content, tool payloads, paths and credentials are discarded before export or upload.

Use either this local import or the existing **ccusage daily JSON** import for overlapping dates. Daily aggregates do not carry message IDs, so cross-format deduplication is not possible; importing both counts those tokens twice. Existing ccusage support is unchanged.

## CLI exporter

```sh
npm run functions:build
node scripts/export-claude-usage.cjs
# Optional directory and output prefix:
node scripts/export-claude-usage.cjs /path/to/projects /tmp/claude-usage
```

Writes `claude-usage.json` and `claude-usage.csv` by default, refusing to overwrite files. Re-import the JSON using **Select Claude Code files**. CSV is for external analysis, not the Cursor CSV importer. The CLI and browser use the same TypeScript parser.

## Data contract

The envelope is `{ "schema": "aicoder.claude.v1", "rows": [...] }`, defined in `shared/src/claudeLedger.ts`. Keep its Firebase copy in `functions/src/shared/claudeLedger.ts` identical, following the repository's mirrored shared-source convention.

Claude's raw `input_tokens`, `cache_read_input_tokens`, and `cache_creation_input_tokens` are separate buckets. The portable ledger normalizes `input_tokens` to their sum, consistent with the Codex ledger. `total_tokens` equals normalized input plus output. Nested cache TTL breakdowns and iteration counters are not added again. `CursorUsageV2` splits the normalized input back into fresh input, cache write, and cache read for existing charts.

One row represents one assistant message ID. Repeated content blocks and copied history are deduplicated by that ID across files/sessions. The fullest reported usage snapshot is retained, independent of file order. Independent subagent message IDs are included. Result summaries, user messages and synthetic messages are ignored. Server transactions create or update the same stable event ID; stale re-imports cannot reduce saved counts. Costs stay unknown (`null` in the ledger, `hasCost: false` in UsageEvent). Service tier and speed are retained when present; reasoning tokens and effort are unknown rather than fabricated.

The endpoint `ingestClaudeLedger` validates all rows before writing, binds the user to Firebase authentication, verifies organization membership, and writes user/org records atomically. It ignores client identity claims and unrecognized fields. Source `claude_code_local` is preserved through persistence and reload, separately from `ccusage_daily_json` and `codex_local`.

## Completeness

These are recorded transcript snapshots, not an authoritative bill or complete account ledger. Live/incomplete transcripts can undercount output. Some Claude SDK versions expose placeholder output counts in assistant messages; result-level usage has different aggregation scope and is not mixed into per-message rows. Logs without usage or deleted by retention cannot be reconstructed. Dedicated performance, reasoning, and speed chart controls are outside this feature.

References: [Claude session storage](https://code.claude.com/docs/en/sessions), [token accounting and repeated message IDs](https://code.claude.com/docs/en/agent-sdk/cost-tracking). The latter documents output-count and estimated-cost caveats. The adapter was also checked against nine local JSONL files: 164 unique records, no parsing warnings; only aggregate diagnostics were printed.

## Validation and release

```sh
npm run test:run --workspace=frontend -- src/lib/claudeUsage.test.ts src/components/ClaudeUsageImport.test.tsx src/lib/codexUsage.test.ts src/components/CodexUsageImport.test.tsx
npm run build --workspace=frontend
npm run functions:build
node --test functions/test/claudeLedger.test.cjs
```

18 frontend/parser tests and 3 backend handler tests pass. Backend tests use an in-memory Firestore stub to cover authentication, validation, membership, retries and snapshot updates; they do not verify production connectivity. Both builds and the CLI JSON round trip pass. Deploy the frontend and `ingestClaudeLedger` together before signed-in use. Deployment has not been performed.
