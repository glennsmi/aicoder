# PRD: Automated File Ingestion API Endpoint

**Date:** 2026-02-11  
**Product:** AICoder.Guru (app)  
**Status:** Draft (for review)  
**Branch:** `feature/api-file-ingest-endpoint`  
**Related systems:** Unified upload flow (`CSVDragDrop`), usage ingestion callables, Firestore usage events

---

## Summary
Some users want to automate file ingestion from their desktop/server on a schedule, instead of manual drag-and-drop uploads in the app.

This PRD defines a secure API ingestion path that:
- accepts uploaded files via HTTP endpoint
- applies the same file-type detection and parsing behavior as the existing unified drop area
- ingests records into the correct user/account context
- supports API-key based automation for both individual and team/organization contexts

---

## Confirmed Product Decisions
- Every API upload must be attributed to a specific human user.
- Keys are mapped to users; users are already mapped to organizations when applicable.
- Service identity uploads without a human user mapping are not allowed.
- Key expiration is not required by default at this stage.
- Team/org admins may manage user keys, but ingestion still executes as a user-bound key.

---

## Decision Table (Locked)
| Decision | Final Choice | Why |
|---|---|---|
| Upload attribution model | Human user only | Matches business model and reporting rollups |
| Ingestion key scope | User-bound keys only | Prevents ambiguous impersonation paths |
| Organization key for uploads | Not required | Org derived from mapped user membership |
| Key expiration default | No default expiry required | Lower operational friction for initial rollout |
| Service identity uploads | Not allowed | All data must map to an individual user |
| Request identity field | `userId` required and validated against key mapping | Explicit attribution and safer automation diagnostics |

---

## Problem Statement
Current ingestion is primarily UI-driven. Teams with scheduled exports or local cron jobs need a machine-to-machine path to upload files automatically.

Without an API endpoint:
- users must manually upload files
- adoption is blocked for automation-first workflows
- recurring historical syncs are harder to standardize

---

## Goals
- Provide a stable API endpoint for scheduled file ingestion.
- Reuse existing file type identification and ingestion logic where possible.
- Support secure API key authentication and scoped account attribution.
- Preserve idempotency and duplicate handling (file hash and event fingerprint behavior).
- Keep compatibility with current storage model (`users/{uid}/usageEvents` and org fanout).

## Non-Goals
- Replacing existing manual upload UX.
- Building a full external connector platform in this phase.
- Supporting arbitrary binary file analytics beyond currently supported file families.

---

## Personas and Primary Use Cases
- **Individual user**
  - Runs a local scheduled script to upload Cursor CSV or ccusage JSON daily.
- **Team admin**
  - Issues ingestion credentials for team members or automation agents.
- **Operations/IT**
  - Manages rotations of keys and monitors ingest activity.

---

## Current State (from codebase)
- UI upload path detects and parses file content in the frontend.
- Ingestion functions require Firebase Auth (`onCall`), so they are not suitable for unattended machine clients.
- Duplicate protections already exist through file hash import records and deterministic event fingerprints.
- Organization and team attribution are resolved during ingestion and written to org-scoped usage records.

---

## Proposed Solution

### 1) New endpoint
Add a Firebase Functions v2 HTTP endpoint in `europe-west2` for API uploads.

- Method: `POST`
- Content types:
  - `multipart/form-data` (preferred for file upload)
  - `application/json` with structured pre-parsed rows (optional advanced path, phase 2+)
- Response:
  - accepted/rejected
  - detected file type
  - imported row counts
  - skipped duplicate counts
  - import reference ID

### 2) Shared processing pipeline
Refactor current ingestion flow so the endpoint and existing UI upload callables use shared parsing/normalization/ingest helpers.

High-level flow:
1. Authenticate API key.
2. Resolve effective actor (`userId`) and account context (`organizationId`, `teamId`).
3. Compute `fileHash` and check idempotency.
4. Detect file type (same logic as unified drop area).
5. Parse into normalized usage rows.
6. Write usage events with existing dedupe semantics.
7. Return ingest result summary.

### 3) Key-based auth model
Introduce first-party ingestion API keys with secure storage.

Key handling:
- Show full key only once at creation.
- Store only hash of secret in Firestore.
- Keep short key prefix for lookup UX and performance.
- Track `createdBy`, `createdAt`, `lastUsedAt`, `lastUsedIp` (if available), `revokedAt`.

---

## Authentication and Identity Model (Final)

### Upload keys are always user-bound
Each ingestion key maps to exactly one human `userId`.

Rules:
- The mapped `userId` is required on the key record.
- The request must include `userId` and it must match the mapped user.
- If the user belongs to an organization, org attribution is resolved from user membership.
- No upload is accepted without a human user attribution.

### Do we need a separate organization upload key?
For ingestion, **no**. A user-bound key is sufficient because:
- users are already mapped to org membership in the data model
- organization rollups are computed from user-level events
- it avoids impersonation and ambiguous attribution paths

If needed later, an org-level key can be introduced only for **key management APIs** (create/revoke/list), not for direct data ingestion.

---

## Firestore Data Model (proposed)

### API keys
`organizations/{orgId}/ingestionKeys/{keyId}` (or top-level variant for non-org users)

Suggested fields:
- `keyPrefix: string`
- `keyHash: string`
- `scope: 'user'`
- `ownerUserId: string`
- `mappedUserId: string` (required)
- `mappedOrganizationId?: string` (denormalized snapshot for faster lookup)
- `name: string`
- `status: 'active' | 'revoked'`
- `createdAt`, `createdBy`
- `lastUsedAt`, `lastUsedMeta`
- `expiresAt?` (optional, not required by default)

### Import receipts (existing pattern, reused)
- `users/{uid}/usageEventImports/{fileHash}`
- (optional) org-scoped mirror for analytics/audit

---

## API Contract (Draft)

### Endpoint
`POST /v1/ingestion/files`

### Headers
- `Authorization: Bearer <api_key>`
- `Content-Type: multipart/form-data`

### Form fields
- `file`: uploaded file (required)
- `userId`: required and must match `mappedUserId` for key
- `sourceLabel`: optional client label (`cron`, `desktop-job`, etc.)
- `idempotencyKey`: optional client-generated key

### Success response example
```json
{
  "ok": true,
  "importId": "imp_01H...",
  "fileType": "cursor_csv",
  "rowsReceived": 892,
  "rowsImported": 877,
  "rowsSkippedDuplicate": 15
}
```

### Error response examples
- `401` invalid/missing key
- `403` user mismatch or unauthorized attribution attempt
- `400` unsupported file format or invalid schema
- `409` duplicate import already processed

---

## File-Type Detection and Parsing Requirements
- Endpoint must produce the same detection outcome as unified drop area for supported files.
- Supported initial file types:
  - Cursor CSV
  - ccusage daily JSON
- If unknown/unsupported:
  - return structured error with reason and sample expectations.

Implementation preference:
- move detection/parsing utilities into shared reusable modules consumed by both frontend and functions.

---

## Security Requirements
- Never store raw API keys after creation.
- Compare secrets in constant-time semantics.
- Enforce strict `userId === mappedUserId` checks.
- Add per-key rate limiting and request size limits.
- Log audit records for create/revoke/use events.
- Support key rotation and revocation without downtime.

---

## Operational Requirements
- Functions v2 in `europe-west2`.
- Observability:
  - structured logs with `keyId`, `orgId`, `userId`, `fileType`, counts, duration
  - dashboards/alerts on error rate spikes
- Retry behavior:
  - clients should safely retry with idempotency support
  - duplicate imports must not create duplicate events

---

## UX/Admin Requirements
- Admin UI for keys:
  - create key
  - name/description
  - mapped user selection (required)
  - revoke key
  - view last-used metadata
- Include copy-paste ready examples for:
  - `curl`
  - Node script
  - scheduled cron invocation

---

## Developer Documentation Requirements (Website)
This feature must ship with public, implementation-ready docs on the marketing website, not only internal docs.

### Docs information architecture
- New website route: `/developers/file-ingestion-api`
- Optional index route later: `/developers`
- Discoverability:
  - add a `Docs` or `Developers` link in top navigation
  - add `Developer Docs` link in footer

### Required page content (v1)
1. **Overview**
   - what the endpoint is for
   - who should use it (scheduled jobs, automation scripts, CI)
2. **Authentication**
   - API key lifecycle (create, copy once, rotate, revoke)
   - how key scope and `subjectUserId` work
3. **Endpoint reference**
   - HTTP method and URL
   - headers
   - body formats
   - max file size
   - timeout expectations
4. **Supported file types**
   - Cursor CSV and ccusage daily JSON with examples
   - unsupported format behavior
5. **Response schema**
   - success JSON fields explained
   - import/duplicate semantics
6. **Error handling**
   - HTTP status code table
   - machine-readable error code list (e.g. `invalid_api_key`, `file_type_not_supported`)
   - remediation guidance per code
7. **Idempotency and retries**
   - recommended retry strategy
   - duplicate processing behavior
8. **Implementation guides**
   - copy/paste examples for:
     - `curl`
     - Node.js
     - Python
     - cron/systemd scheduler pattern
9. **Security best practices**
   - secret handling
   - key rotation cadence
   - least privilege recommendations
10. **Change log and versioning**
   - endpoint version policy (`/v1`)
   - deprecation communication window

### Documentation quality bar ("world class")
- Written for developers who have never used AICoder before.
- Includes end-to-end "first successful upload in <10 minutes" path.
- Every error/status code is documented with:
  - meaning
  - likely cause
  - exact fix steps
- Includes tested code snippets and sample payloads.
- Includes both happy-path and failure-path examples.
- Includes visible "last updated" date and contact/support path.

### Docs acceptance criteria
- Website page exists and is publicly reachable at `/developers/file-ingestion-api`.
- Header/footer include links to the developer docs.
- Endpoint docs include:
  - request examples
  - response examples
  - status/error code reference
  - retry/idempotency guidance
- A developer can complete a sample upload using docs only, without manual support.

---

## Acceptance Criteria
- New API endpoint accepts file uploads and returns deterministic ingest summary.
- Same files produce materially equivalent ingestion results as manual upload path.
- Every upload is attributed to a human user.
- API key checks reject any `userId` mismatch.
- Duplicate file re-submission does not duplicate usage events.
- Revoked keys are rejected immediately.
- At least one team-level automation scenario and one per-user scenario validated end-to-end.

---

## Phased Delivery

### Phase 0: PRD and architecture alignment
- finalize key model and endpoint contract
- confirm storage location for key metadata

### Phase 1: Core endpoint + per-user keys
- create key issuance/revocation backend
- implement file upload endpoint and shared ingest helper
- enforce required `userId` request and mapped-user validation

### Phase 2: Org admin management controls
- add admin flows for issuing/revoking user-bound keys at team/org scale
- add governance and audit views for key ownership and usage

### Phase 3: Hardening and DX
- add advanced docs examples, limits, and alerting
- optional pre-parsed JSON ingest path

---

## Risks and Mitigations
- **Risk:** Key leakage  
  **Mitigation:** hash-only storage, least-privilege scopes, easy rotation/revocation.
- **Risk:** Attribute data to wrong user  
  **Mitigation:** strict subject policy checks and audit logs.
- **Risk:** Parsing drift between UI and API path  
  **Mitigation:** shared parser/detector modules and equivalence tests.
- **Risk:** Abuse/high-volume uploads  
  **Mitigation:** per-key quotas, request limits, and rate controls.

---

## Open Questions for Product/Engineering
1. Should individual users outside an org store keys under user docs or under a global API key namespace?
2. Do we keep `userId` in body as mandatory explicit attribution, or move it to an optional field validated when present?
3. Should org admins be able to issue user-bound keys for members without user self-service?
4. Do we want to support compressed uploads (`.gz`, `.zip`) in initial release?

---

## Initial Recommendation
Ship with **user-bound upload keys only**. This aligns with current business logic (user-first attribution, org rollups from users), minimizes security ambiguity, and avoids service-identity drift.

This gets automation live quickly while preserving attribution integrity and clear auditability.
