# Email Change Cascade Cleanup Plan

## Goal

Fix current data inconsistencies caused by user email changes and prevent recurrence by enforcing a canonical email sync path across Auth, user docs, membership docs, and billing resolution.

## A) Clean up current issue

- Identify canonical identity from Firebase Auth UID.
- Update `users/{uid}.email` to the canonical Auth email.
- Update all `organizations/*/members/{uid}.email` records for that UID.
- If the user owns a default workspace named from their old email, rename it to the new default (`<newEmail>'s Workspace`).
- Verify duplicate `users` docs that share the same email and flag for manual merge/archive if needed.

## B) Prevent recurrence

- Add a callable function to perform canonical email cascade from Auth on demand and on login.
- Invoke the function from frontend auth initialization so email changes self-heal on next sign-in.
- Harden Stripe checkout email-based fallback resolution when multiple Firestore `users` docs share one email:
  - Prefer matching Firebase Auth UID.
  - Fallback to most recently updated/created Firestore user doc.
  - Log duplicate-user conditions for observability.

## Implemented in this change

- Added `functions/src/users/260225_0906_syncMyEmailCascade.ts`.
- Exported `syncMyEmailCascade` in `functions/src/index.ts`.
- Wired client auth bootstrap to call `syncMyEmailCascade` in `frontend/src/contexts/AuthContext.tsx`.
- Updated `functions/src/webhooks/stripeWebhookHandlers.ts` to resolve duplicate email matches deterministically.

## Adam-specific cleanup executed

- Updated `organizations/XbdyGYXDb2T4U8vf9JIV/members/XH1PkIJP5vYKjbOVjQnenrlNez62.email` to `adam@claimer.com`.
- Updated `organizations/XbdyGYXDb2T4U8vf9JIV.name` to `adam@claimer.com's Workspace`.

## Follow-up recommended

- Review orphaned duplicate user doc `users/VdqLxcGarePAga5w3CYDaNjsQUP2` and decide whether to archive or merge.
- Validate Stripe subscriptions tied to both Adam workspaces and decide whether one should be canceled/consolidated.
