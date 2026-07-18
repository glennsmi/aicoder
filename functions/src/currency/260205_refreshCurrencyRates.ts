import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'
import { SUPPORTED_CURRENCIES, CurrencyRate } from '../shared'

const API_URL = 'https://open.er-api.com/v6/latest/USD'
const COLLECTION_LIVE = 'currencyRates'
const COLLECTION_HISTORY = 'currencyRatesHistory'

interface ExchangeRateApiResponse {
  result: string
  base_code: string
  time_last_update_utc: string
  time_next_update_utc: string
  rates: Record<string, number>
}

/**
 * Fetches the latest exchange rates from the API and writes them to Firestore.
 * Shared logic used by both the scheduled and manual-trigger functions.
 */
async function fetchAndStoreRates(): Promise<{ updated: number; skipped: number; date: string }> {
  const db = admin.firestore()

  // 1. Fetch rates from API
  const response = await fetch(API_URL, {
    method: 'GET',
    headers: { 'user-agent': 'AICoder.Guru currency rate bot' },
  })

  if (!response.ok) {
    throw new Error(`Exchange rate API returned HTTP ${response.status}: ${response.statusText}`)
  }

  const data: ExchangeRateApiResponse = await response.json()

  if (data.result !== 'success') {
    throw new Error(`Exchange rate API returned non-success result: ${data.result}`)
  }

  const apiRates = data.rates
  const now = new Date().toISOString()
  const dateKey = now.slice(0, 10) // YYYY-MM-DD

  // 2. Batch-write live rates to currencyRates/{code}
  let updated = 0
  let skipped = 0
  const historyRates: Record<string, number> = {}

  // Firestore batches have a 500 operation limit; our 52 currencies fit in one batch
  const batch = db.batch()

  for (const currency of SUPPORTED_CURRENCIES) {
    const code = currency.code
    const rate = apiRates[code]

    if (rate === undefined) {
      console.warn(`No rate found for ${code} in API response, skipping`)
      skipped++
      continue
    }

    const rateDoc: CurrencyRate = {
      id: code,
      code: code,
      name: currency.name,
      symbol: currency.symbol,
      rate: rate,
      lastUpdated: now,
      isActive: true,
    }

    batch.set(db.collection(COLLECTION_LIVE).doc(code), rateDoc)
    historyRates[code] = rate
    updated++
  }

  await batch.commit()
  console.log(`Updated ${updated} live currency rates (${skipped} skipped)`)

  // 4. Store historical snapshot
  await db.collection(COLLECTION_HISTORY).doc(dateKey).set({
    date: dateKey,
    fetchedAt: admin.firestore.FieldValue.serverTimestamp(),
    source: 'open.er-api.com',
    baseCurrency: 'USD',
    apiLastUpdate: data.time_last_update_utc,
    rates: historyRates,
  })

  console.log(`Stored historical rates snapshot for ${dateKey} with ${Object.keys(historyRates).length} currencies`)

  return { updated, skipped, date: dateKey }
}

/**
 * Scheduled function: runs daily at 04:00 UTC to refresh all currency rates.
 * Stores live rates in currencyRates/{code} and a historical snapshot in
 * currencyRatesHistory/{YYYY-MM-DD}.
 */
export const refreshCurrencyRates = onSchedule(
  {
    region: 'europe-west2',
    schedule: 'every day 04:00',
    timeZone: 'Etc/UTC',
    retryCount: 2,
  },
  async () => {
    try {
      const result = await fetchAndStoreRates()
      console.log(`refreshCurrencyRates completed: ${result.updated} updated, ${result.skipped} skipped for ${result.date}`)
    } catch (error) {
      console.error('refreshCurrencyRates failed:', error)
      throw error // Re-throw so Cloud Scheduler retries
    }
  }
)

/**
 * Callable function: allows admins to manually trigger a currency rate refresh.
 */
export const refreshCurrencyRatesManual = onCall(
  {
    region: 'europe-west2',
  },
  async (request) => {
    // Verify the caller is authenticated
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated to refresh currency rates')
    }

    // Check if the user is an admin
    const db = admin.firestore()
    const userDoc = await db.collection('users').doc(request.auth.uid).get()
    const userData = userDoc.data()

    if (!userData) {
      throw new HttpsError('not-found', 'User not found')
    }

    // Allow admins and org admins
    const isAdmin = userData.role === 'admin' || userData.currentRole === 'admin'
    if (!isAdmin) {
      throw new HttpsError('permission-denied', 'Only admins can manually refresh currency rates')
    }

    try {
      const result = await fetchAndStoreRates()
      return {
        success: true,
        message: `Currency rates refreshed: ${result.updated} updated, ${result.skipped} skipped`,
        ...result,
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error('refreshCurrencyRatesManual failed:', error)
      throw new HttpsError('internal', `Failed to refresh currency rates: ${message}`)
    }
  }
)
