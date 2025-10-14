export interface TokenBreakdown {
  inputWithCacheWrite: number  // Input tokens with cache write
  inputWithoutCacheWrite: number  // Input tokens without cache write
  cacheRead: number  // Cached input tokens read
  output: number  // Output tokens
  total: number  // Total tokens (sum of all)
}

export interface CursorUsageV2 {
  id: string
  date: string
  timestamp: number
  model: string
  tokens: number  // For backward compatibility - will be total tokens
  tokenBreakdown?: TokenBreakdown  // Detailed token breakdown
  costUsd?: number | null
  raw?: Record<string, unknown>
}

export interface CursorUsageImportSummary {
  filesProcessed: number
  totalRows: number
  acceptedRows: number
  skippedRows: number
  dedupedRows: number
  errors: string[]
}

