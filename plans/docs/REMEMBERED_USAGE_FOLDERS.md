# Remembered usage folders

Codex and Claude Code folder buttons now use a read-only File System Access directory picker where supported. Select a folder once, then use **Read saved folder again** on subsequent visits. The existing preview and **Import and save** flow remains. A **Forget folder** button removes the local reference.

Cursor adds **Select Cursor exports folder**. Download usage CSV exports into a dedicated directory, then reread that folder using the existing CSV import pipeline. This feature does not cause Cursor to generate or download exports automatically.

Folder handles are serialized in IndexedDB, keyed separately by Firebase user ID and tool. They stay on the current browser profile/origin/device, never in Firestore. Only the folder name is shown; the browser does not supply an absolute path. Guests can select and reread during their visit but no folder handle is persisted. Account changes clear importer state and invalidate pending folder scans. No automatic reads happen at page load.

Chrome/Edge supporting showDirectoryPicker can remember access. The browser can request read permission again when the user clicks; denials and removed folders display errors. Unsupported browsers retain the existing folder/file upload flow. Browser storage clearing, private browsing, changing browser/device, or switching between localhost and the live site requires selecting again. Directory scans include nested year/month/day and project folders and read only JSONL for local ledgers or CSV for Cursor.

Sources checked September 8, 2026:
- https://developer.mozilla.org/en-US/docs/Web/API/Window/showDirectoryPicker
- https://developer.mozilla.org/en-US/docs/Web/API/File_System_API
- https://cursor.com/docs/account/teams/analytics (dashboard CSV downloads)
- https://prod.cursor.com/docs/enterprise/opentelemetry-export (streamed token/cost telemetry to a collector)

No documented automatic Cursor local JSONL token ledger equivalent was established. Cursor's documented Enterprise telemetry is a separate integration, not implemented here. Existing CSV export remains the compatible workflow.

Verification: frontend tests cover recursive file matching, remembering/reloading, account/tool isolation, permission denial, account switches during selection, and fallback. Native directory picker permissions and persistence need browser integration QA; unit tests mock the picker/storage APIs.
