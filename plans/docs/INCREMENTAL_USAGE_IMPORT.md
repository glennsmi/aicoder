# Incremental local usage imports

Codex and Claude Code imports now check for new work in two stages:

1. File metadata checkpoints, scoped by account and tool in browser storage, skip already-saved files with matching relative path, byte size and modification time. Only successful saves advance checkpoints; files with parse warnings are deliberately revisited. A changed or growing file is parsed in full to preserve cumulative token accounting and model context. This is not a byte-offset tail parser.
2. Before saving, the same authenticated ledger endpoint accepts `checkOnly: true` with batches of at most 200 event IDs and token totals. Firestore `getAll` reads their canonical user event documents together. Only absent IDs or fuller Claude snapshots are returned for upload. Existing transactional writes remain the final duplicate/race guard.

No date-only watermark is used: a session in an old date folder can still grow. Interrupted saves do not advance file checkpoints; the next preflight discovers chunks already committed and skips them. Existing imports made before this feature need one initial scan/preflight. Fresh browser/device selections also need the preflight because file checkpoints are local, but server IDs still prevent reuploading existing usage records.

The **Recheck all files** checkbox bypasses file metadata checkpoints for restored files, unusual tools that preserve size/mtime during rewrites, or usage deleted from the account. Server preflight still deduplicates. The cache is bounded to the latest 5,000 path entries and failures to access local storage fall back to ordinary preflight. File paths stay in browser storage; only event IDs and token totals are sent during checks. Raw JSONL contents are never uploaded.

JSON/CSV exports from the local import preview contain the scanned records; skipped files are not part of that preview. Use Recheck all files before selecting the folder to produce a complete export.

Release requires the frontend and updated `ingestCodexLedger` and `ingestClaudeLedger` functions together. The browser fails clearly if the backend does not implement the preflight rather than assuming records have been saved. Cursor CSV ingestion is unchanged by the ledger preflight.

Validation covers changed/unchanged file versions, account/tool isolation, recursive folder paths, minimal bounded preflight requests, absent and updated records, failed checks, and authenticated user document paths. Tests use mocked browser storage and Firestore; production connectivity is not established by unit tests.
