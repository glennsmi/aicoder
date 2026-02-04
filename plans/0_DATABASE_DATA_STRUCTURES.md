# 0_DATABASE_DATA_STRUCTURES

Compact reference of the Firestore structures we write/read.

## Core usage events (authoritative per user)

### `users/{userId}/usageEvents/{eventId}`
- **Purpose**: unified, immutable usage events across Cursor CSV + provider APIs.
- **Write path**: Cloud Functions callable `ingestUsageEventsFromCursorCsv` (Cursor CSV).
- **Idempotency**: `eventId` is a deterministic fingerprint; re-ingesting same row becomes a duplicate (create fails).

**Fields (canonical)**
- `eventId` (string)
- `userId` (string)
- `organizationId` (string, optional)
- `teamId` (string, optional)
- `provider` (string; e.g. `cursor`, `openai`, `gemini`, `anthropic`)
- `sourceType` (string; e.g. `csv`, `api`)
- `eventAtMs` (number; primary ordering timestamp)
- `day` (string; `YYYY-MM-DD` UTC derived from `eventAtMs`)
- `model` (object)
  - `name` (string)
- `tokens` (object)
  - `total` (number)
  - `hasBreakdown` (boolean)
  - `input` (number, optional)
  - `output` (number, optional)
  - `cacheRead` (number, optional)
  - `cacheWrite` (number, optional)
  - `other` (map<string, number>, optional)
- `cost` (object)
  - `hasCost` (boolean)
  - `currency` (string; typically `USD`)
  - `amountMicros` (number, optional; integer micros)
- `source` (object)
  - `importId` (string)
  - `fileName` (string, optional)
  - `fileHash` (string, optional)
  - `rowIndex` (number)
  - `fingerprint` (string)
- `raw` (map<string, any>, optional)
- `createdAt` (timestamp; server)

**Null policy**
- We do **not** write `null`. Missing values are omitted (and/or represented by `hasCost=false` etc.).

## Pricing catalog (snapshots + normalized rows)

### Snapshots (implemented)
#### `pricingCatalog/providerSnapshots/snapshots/{snapshotId}`
- **Purpose**: append-only audit trail of provider pricing pages (hash + excerpt).
- **Written by**: scheduled Function `refreshPricingCatalog`.

**Fields**
- `snapshotId` (string)
- `provider` (string; `claude` | `openai` | `gemini`)
- `fetchedAtMs` (number)
- `sourceUrl` (string)
- `httpStatus` (number)
- `sourceContentHash` (string; sha256 hex)
- `excerpt` (string; first ~20k chars)
- `createdAt` (timestamp; server)

### Normalized price rows (planned next; schema finalized in POD)
#### `pricingCatalog/prices/...`
- **Purpose**: queryable price rows with effective windows for historical cost computation.
- **Reference**: `plans/Cursor_CSV_Persistence_POD.md` (“Pricing Catalog” section)

## Aggregates (planned)

### `users/{userId}/usageAggMinute/{bucketId}`
### `organizations/{orgId}/usageAggMinute/{bucketId}`
### `organizations/{orgId}/teams/{teamId}/usageAggMinute/{bucketId}`
- **Purpose**: fast dashboards without scanning raw events.
- **Status**: not implemented yet (documented in POD).

