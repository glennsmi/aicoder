import { onSchedule } from 'firebase-functions/v2/scheduler'
import * as admin from 'firebase-admin'
import crypto from 'node:crypto'

type Provider = 'claude' | 'openai' | 'gemini'

const PROVIDER_URLS: Array<{ provider: Provider; url: string }> = [
  { provider: 'claude', url: 'https://platform.claude.com/docs/en/about-claude/pricing' },
  { provider: 'claude', url: 'https://claude.com/pricing#api' },
  { provider: 'openai', url: 'https://openai.com/api/pricing/' },
  { provider: 'gemini', url: 'https://ai.google.dev/gemini-api/docs/pricing' },
]

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex')
}

/**
 * Scheduled job that stores append-only snapshots of provider pricing pages.
 *
 * This is intentionally a "skeleton":
 * - It fetches pages, hashes content, and stores snapshots for auditability.
 * - Parsing into normalized PriceRows comes next (format differs per provider and changes over time).
 */
export const refreshPricingCatalog = onSchedule(
  {
    region: 'europe-west2',
    schedule: 'every day 03:17',
    timeZone: 'Etc/UTC',
    retryCount: 2,
  },
  async () => {
    const db = admin.firestore()

    for (const { provider, url } of PROVIDER_URLS) {
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            // Keep it simple; some sites vary output by UA.
            'user-agent': 'AICoder.Guru pricing snapshot bot',
          },
        })

        const text = await res.text()
        const fetchedAtMs = Date.now()
        const sourceContentHash = sha256Hex(text)

        const snapshotId = `${provider}_${fetchedAtMs}_${sourceContentHash.slice(0, 12)}`

        // Store snapshot
        await db.collection('pricingCatalog').doc('providerSnapshots').collection('snapshots').doc(snapshotId).set({
          snapshotId,
          provider,
          fetchedAtMs,
          sourceUrl: url,
          httpStatus: res.status,
          sourceContentHash,
          // Store only a small excerpt to avoid large docs; full parsing can refetch by URL if needed.
          excerpt: text.slice(0, 20_000),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        })
      } catch (error) {
        console.error('refreshPricingCatalog error', { provider, url, error })
      }
    }
  }
)

