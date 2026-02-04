export type UsageProvider =
  | 'cursor'
  | 'openai'
  | 'gemini'
  | 'anthropic'
  | 'github_copilot'
  | string

export type UsageSourceType = 'csv' | 'api' | 'manual' | string

export interface UsageEventModel {
  name: string
  family?: string
  version?: string
}

export interface UsageEventTokens {
  /** Total tokens billed/attributed for this event */
  total: number

  /** Provider-reported input tokens (excluding cached reads unless provider defines otherwise) */
  input?: number

  /** Provider-reported output tokens (may include "thinking" tokens depending on provider) */
  output?: number

  /** Cached input tokens read/hit */
  cacheRead?: number

  /** Cached input tokens written/created */
  cacheWrite?: number

  /**
   * Provider-specific additional token buckets.
   * Keep values numeric and low-cardinality keys.
   */
  other?: Record<string, number>

  /**
   * True if at least one of: input/output/cacheRead/cacheWrite/other is present.
   * This allows callers to distinguish "total-only" rows.
   */
  hasBreakdown: boolean
}

export interface UsageEventCost {
  /** True if this event has a known cost from the source. */
  hasCost: boolean

  /** Currency code (typically USD). */
  currency: string

  /**
   * Cost in integer micros (e.g. $2.00 => 2_000_000).
   * Omit when hasCost=false.
   */
  amountMicros?: number
}

export interface UsageEventSource {
  /** A batch identity: CSV upload session, sync run, etc. */
  importId: string

  /** Provider supplied stable event ID (if available). */
  providerEventId?: string

  /** CSV provenance */
  fileName?: string
  fileHash?: string
  rowIndex?: number

  /** Canonical fingerprint used to derive eventId. */
  fingerprint: string
}

export interface UsageEvent {
  eventId: string
  userId: string

  /** Present for org members; omit for individuals */
  organizationId?: string

  /** Present for team members (single team today); omit for individuals */
  teamId?: string

  provider: UsageProvider
  sourceType: UsageSourceType

  /** Primary ordering timestamp */
  eventAtMs: number

  /** Optional aggregation window for APIs that return windowed usage */
  periodStartMs?: number
  periodEndMs?: number

  /** YYYY-MM-DD derived from eventAtMs in UTC */
  day: string

  model: UsageEventModel
  tokens: UsageEventTokens
  cost: UsageEventCost

  /** Additional numeric metrics (requests, images, seconds, etc.) */
  metrics?: Record<string, number>

  /** Low-cardinality labels for slicing */
  labels?: Record<string, string>

  source: UsageEventSource

  /** Provider payload / raw row for maximal retention (keep reasonably small) */
  raw?: Record<string, unknown>
}

export interface ProviderPricingSnapshot {
  snapshotId: string
  provider: UsageProvider
  fetchedAtMs: number
  sourceUrl: string
  sourceEtag?: string
  sourceContentHash: string
  parsed?: Record<string, unknown>
  raw?: Record<string, unknown>
}

export interface PriceRowConditions {
  minBillingInputTokens?: number
  maxBillingInputTokens?: number
  cacheTtlSeconds?: number
  endpointType?: string
  batch?: boolean
  modality?: string
}

export interface PriceRowSource {
  snapshotId: string
  sourceUrl: string
  notes?: string
}

export interface PriceRow {
  priceId: string
  provider: UsageProvider
  modelName: string
  dimension: string
  unit: string
  currency: string
  amountMicros: number
  conditions?: PriceRowConditions
  effectiveStartMs: number
  effectiveEndMs?: number
  observedAtMs: number
  source: PriceRowSource
}

