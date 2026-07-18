const ingestionEndpoint = 'https://europe-west2-aicoder-guru.cloudfunctions.net/ingestUsageFileViaApi'

const statusCodes = [
  { code: 200, meaning: 'Import accepted and processed', action: 'Store importId and metrics for audit' },
  { code: 400, meaning: 'Request shape or file format is invalid', action: 'Validate body, file type, and required fields' },
  { code: 401, meaning: 'API key is missing or invalid', action: 'Check Authorization header and key state' },
  { code: 403, meaning: 'Provided userId does not match key mapping', action: 'Remove userId or send the mapped userId for this API key' },
  { code: 409, meaning: 'Duplicate import already processed', action: 'Treat as safe duplicate and skip re-upload' },
  { code: 413, meaning: 'Payload too large', action: 'Split files into smaller chunks before retrying' },
  { code: 429, meaning: 'Rate limit exceeded', action: 'Back off and retry with jitter' },
  { code: 500, meaning: 'Unexpected server error', action: 'Retry with idempotency key; contact support if persistent' },
]

const errorCodes = [
  {
    code: 'invalid_api_key',
    meaning: 'Provided API key is not recognized or revoked.',
    fix: 'Generate a new key in dashboard, update secret store, and retry.',
  },
  {
    code: 'user_mismatch',
    meaning: 'Provided userId does not match the user mapped to this key.',
    fix: 'Omit userId (recommended) or pass the exact mapped userId.',
  },
  {
    code: 'file_type_not_supported',
    meaning: 'File does not match Cursor CSV or ccusage daily JSON.',
    fix: 'Export in supported format or use documented schema.',
  },
  {
    code: 'invalid_file_schema',
    meaning: 'File type detected but structure is malformed.',
    fix: 'Validate required headers/fields and regenerate export.',
  },
  {
    code: 'duplicate_import',
    meaning: 'File hash already processed for this user/account context.',
    fix: 'Ignore unless data changed; if changed, upload updated file.',
  },
]

export default function DeveloperFileIngestionDocsPage() {
  return (
    <div className="min-h-screen bg-sand-300 dark:bg-secondary-900">
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-sand-300 via-primary-50/30 to-sand-300 dark:from-secondary-900 dark:via-secondary-800/40 dark:to-secondary-900">
        <div className="container mx-auto max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-400 mb-3">Developer Docs</p>
          <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 dark:text-white mb-4">File Ingestion API</h1>
          <p className="text-lg text-neutral-700 dark:text-sand-300 leading-relaxed max-w-3xl">
            Automate uploads from scheduled jobs and scripts. Send supported usage files to AICoder.Guru without manual drag-and-drop.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent-100 text-secondary-900 px-3 py-2 text-sm font-medium dark:bg-accent-900/30 dark:text-accent-300">
            <span>Version:</span>
            <code>/v1</code>
          </div>
        </div>
      </section>

      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-5xl space-y-10">
          <article className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-secondary-800 p-6">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">Quick start</h2>
            <ol className="list-decimal pl-6 space-y-2 text-neutral-700 dark:text-sand-300">
              <li>Create an ingestion API key in the AICoder dashboard.</li>
              <li>Store the key in your machine secret manager (never commit it).</li>
              <li>Call the endpoint with `multipart/form-data` and attach your file.</li>
              <li>Store `importId` from the response for observability and retries.</li>
            </ol>
          </article>

          <article className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-secondary-800 p-6">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">Authentication model</h2>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              Use `Authorization: Bearer &lt;api_key&gt;`. Upload keys are always mapped to one human user and every upload is attributed to that mapped user.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-neutral-700 dark:text-sand-300">
              <li><strong>User-bound key:</strong> one key maps to one user identity.</li>
              <li><strong>Org attribution:</strong> if the mapped user is in an organization, rollups are handled from that user context.</li>
              <li><strong>No service identities:</strong> uploads without a mapped human user are rejected.</li>
              <li><strong>Expiry policy:</strong> key expiry is optional and not required by default in v1.</li>
              <li><strong>Lifecycle:</strong> create once, copy once, rotate regularly, revoke immediately on exposure.</li>
            </ul>
          </article>

          <article className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-secondary-800 p-6">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">Endpoint reference</h2>
            <div className="space-y-3 text-neutral-700 dark:text-sand-300">
              <p><strong>Method:</strong> `POST`</p>
              <p><strong>Endpoint URL:</strong> <code>{ingestionEndpoint}</code></p>
              <p><strong>Content type:</strong> `multipart/form-data`</p>
              <p><strong>Required field:</strong> `file`</p>
              <p><strong>Optional field:</strong> `userId` (if provided, must match key mapping)</p>
              <p><strong>Optional fields:</strong> `sourceLabel`, `idempotencyKey`</p>
            </div>
            <div className="mt-4 rounded-lg bg-neutral-900 text-sand-300 p-4 overflow-x-auto">
              <pre className="text-sm leading-relaxed">{`curl -X POST "${ingestionEndpoint}" \\
  -H "Authorization: Bearer $AICODER_API_KEY" \\
  -F "file=@/path/to/cursor-usage.csv" \\
  -F "sourceLabel=nightly-cron"`}</pre>
            </div>
          </article>

          <article className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-secondary-800 p-6">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">Supported file types</h2>
            <ul className="list-disc pl-6 space-y-2 text-neutral-700 dark:text-sand-300">
              <li>Cursor CSV exports</li>
              <li>ccusage daily JSON exports</li>
            </ul>
            <p className="mt-3 text-neutral-700 dark:text-sand-300">
              File detection follows the same logic as the in-app unified file drop area for consistent behavior between manual and API uploads.
            </p>
          </article>

          <article className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-secondary-800 p-6">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">Response schema</h2>
            <div className="rounded-lg bg-neutral-900 text-sand-300 p-4 overflow-x-auto">
              <pre className="text-sm leading-relaxed">{`{
  "ok": true,
  "importId": "imp_01HXYZ",
  "fileType": "cursor_csv",
  "rowsReceived": 892,
  "rowsImported": 877,
  "rowsSkippedDuplicate": 15
}`}</pre>
            </div>
          </article>

          <article className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-secondary-800 p-6">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">HTTP status codes</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white">
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Meaning</th>
                    <th className="py-2">How to handle</th>
                  </tr>
                </thead>
                <tbody>
                  {statusCodes.map((row) => (
                    <tr key={row.code} className="border-b border-neutral-100 dark:border-neutral-800 text-neutral-700 dark:text-sand-300">
                      <td className="py-2 pr-4 font-mono">{row.code}</td>
                      <td className="py-2 pr-4">{row.meaning}</td>
                      <td className="py-2">{row.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-secondary-800 p-6">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">Error code dictionary</h2>
            <div className="space-y-4">
              {errorCodes.map((err) => (
                <div key={err.code} className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="font-mono text-sm text-primary-600 dark:text-primary-400 mb-1">{err.code}</p>
                  <p className="text-neutral-700 dark:text-sand-300"><strong>Meaning:</strong> {err.meaning}</p>
                  <p className="text-neutral-700 dark:text-sand-300"><strong>Fix:</strong> {err.fix}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-secondary-800 p-6">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">Retry and idempotency</h2>
            <ul className="list-disc pl-6 space-y-2 text-neutral-700 dark:text-sand-300">
              <li>Always send an `idempotencyKey` for scheduled jobs.</li>
              <li>On `429` or `500`, retry with exponential backoff and jitter.</li>
              <li>Treat `409 duplicate_import` as success for retry-safe workflows.</li>
              <li>Keep your source file immutable per run to preserve deterministic dedupe behavior.</li>
            </ul>
          </article>

          <article className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-secondary-800 p-6">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">Node.js example</h2>
            <div className="rounded-lg bg-neutral-900 text-sand-300 p-4 overflow-x-auto">
              <pre className="text-sm leading-relaxed">{`import fs from 'node:fs'
import FormData from 'form-data'
import fetch from 'node-fetch'

const endpoint = '${ingestionEndpoint}'
const filePath = '/path/to/cursor-usage.csv'

async function upload() {
  const form = new FormData()
  form.append('file', fs.createReadStream(filePath))
  form.append('sourceLabel', 'nightly-cron')
  form.append('idempotencyKey', '2026-02-11-nightly-user123')

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: \`Bearer \${process.env.AICODER_API_KEY}\`,
      ...form.getHeaders(),
    },
    body: form,
  })

  const result = await response.json()
  console.log(response.status, result)
}

upload().catch(console.error)`}</pre>
            </div>
          </article>

          <article className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-secondary-800 p-6">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">Security checklist</h2>
            <ul className="list-disc pl-6 space-y-2 text-neutral-700 dark:text-sand-300">
              <li>Store keys in secret managers, never in source control.</li>
              <li>Rotate keys on a fixed cadence (for example every 60-90 days).</li>
              <li>Use distinct keys per environment and per automation job.</li>
              <li>Revoke keys immediately on team changes or suspected exposure.</li>
            </ul>
          </article>

          <p className="text-sm text-neutral-500 dark:text-neutral-400">Last updated: 2026-02-12. Need help? Contact support@aicoder.guru.</p>
        </div>
      </section>
    </div>
  )
}
