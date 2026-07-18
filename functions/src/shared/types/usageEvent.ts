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
  total: number
  input?: number
  output?: number
  cacheRead?: number
  cacheWrite?: number
  other?: Record<string, number>
  hasBreakdown: boolean
}

export interface UsageEventCost {
  hasCost: boolean
  currency: string
  amountMicros?: number
}

export interface UsageEventSource {
  importId: string
  providerEventId?: string
  fileName?: string
  fileHash?: string
  rowIndex?: number
  fingerprint: string
}

export interface UsageEvent {
  eventId: string
  userId: string
  organizationId?: string
  teamId?: string
  provider: UsageProvider
  sourceType: UsageSourceType
  eventAtMs: number
  periodStartMs?: number
  periodEndMs?: number
  day: string
  model: UsageEventModel
  tokens: UsageEventTokens
  cost: UsageEventCost
  metrics?: Record<string, number>
  labels?: Record<string, string>
  source: UsageEventSource
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

