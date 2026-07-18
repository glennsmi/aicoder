export type ModelMappingSourceKey =
  | 'cursor_csv'
  | 'ccusage_daily_json'
  | 'anthropic_usage_api'
  | 'anthropic_code_api'
  | 'openai_api'
  | 'github_copilot_api'
  | 'gemini_api'
  | 'codeium_api'
  | 'unknown'

export type ModelAliasesBySource = {
  cursorCsvAliases: string[]
  ccusageDailyJsonAliases: string[]
  anthropicUsageApiAliases: string[]
  anthropicCodeApiAliases: string[]
  openaiApiAliases: string[]
  githubCopilotApiAliases: string[]
  geminiApiAliases: string[]
  codeiumApiAliases: string[]
}

export type CanonicalModelMappingDocument = {
  canonicalName: string
  displayName: string
  aliasesBySource: ModelAliasesBySource
  allAliases: string[]
  sources: ModelMappingSourceKey[]
  version: number
}

export type ModelResolutionMatchType =
  | 'canonical_exact'
  | 'source_alias'
  | 'seed_alias_other_source'
  | 'heuristic'
  | 'empty'

export type ModelResolutionDiagnostics = {
  canonicalName: string
  normalizedInput: string
  sourceKey: ModelMappingSourceKey
  isSeedMatch: boolean
  matchType: ModelResolutionMatchType
}

export const MODEL_MAPPING_VERSION = 1

const EMPTY_ALIASES_BY_SOURCE: ModelAliasesBySource = {
  cursorCsvAliases: [],
  ccusageDailyJsonAliases: [],
  anthropicUsageApiAliases: [],
  anthropicCodeApiAliases: [],
  openaiApiAliases: [],
  githubCopilotApiAliases: [],
  geminiApiAliases: [],
  codeiumApiAliases: [],
}

const MODEL_MAPPING_SEEDS: CanonicalModelMappingDocument[] = [
  {
    canonicalName: 'claude-4.5-sonnet',
    displayName: 'Claude 4.5 Sonnet',
    aliasesBySource: {
      ...EMPTY_ALIASES_BY_SOURCE,
      cursorCsvAliases: [
        'claude-4.5-sonnet',
        'claude-4-5-sonnet',
        'claude-4.5-sonnet-thinking',
        'claude-4.5-sonnet-high-thinking',
      ],
      ccusageDailyJsonAliases: [
        'claude-sonnet-4-5',
        'claude-sonnet-4-5-20250929',
        'claude-4-5-sonnet',
      ],
      anthropicUsageApiAliases: ['claude-sonnet-4-5', 'claude-sonnet-4-5-latest'],
      anthropicCodeApiAliases: ['claude-sonnet-4-5', 'claude-sonnet-4-5-latest'],
    },
    allAliases: [],
    sources: [],
    version: MODEL_MAPPING_VERSION,
  },
  {
    canonicalName: 'claude-4.5-opus',
    displayName: 'Claude 4.5 Opus',
    aliasesBySource: {
      ...EMPTY_ALIASES_BY_SOURCE,
      cursorCsvAliases: [
        'claude-4.5-opus',
        'claude-4-5-opus',
        'claude-4.5-opus-thinking',
        'claude-4.5-opus-high-thinking',
      ],
      ccusageDailyJsonAliases: [
        'claude-opus-4-5',
        'claude-opus-4-5-20251101',
        'claude-4-5-opus',
      ],
      anthropicUsageApiAliases: ['claude-opus-4-5', 'claude-opus-4-5-latest'],
      anthropicCodeApiAliases: ['claude-opus-4-5', 'claude-opus-4-5-latest'],
    },
    allAliases: [],
    sources: [],
    version: MODEL_MAPPING_VERSION,
  },
  {
    canonicalName: 'claude-4.6-opus',
    displayName: 'Claude 4.6 Opus',
    aliasesBySource: {
      ...EMPTY_ALIASES_BY_SOURCE,
      cursorCsvAliases: [
        'claude-4.6-opus',
        'claude-4-6-opus',
        'claude-4.6-opus-thinking',
        'claude-4.6-opus-thinking-fast',
        'claude-4.6-opus-fast',
      ],
      ccusageDailyJsonAliases: [
        'claude-opus-4-6',
        'claude-opus-4-6-20251101',
        'claude-4-6-opus',
      ],
      anthropicUsageApiAliases: ['claude-opus-4-6', 'claude-opus-4-6-latest'],
      anthropicCodeApiAliases: ['claude-opus-4-6', 'claude-opus-4-6-latest'],
    },
    allAliases: [],
    sources: [],
    version: MODEL_MAPPING_VERSION,
  },
  {
    canonicalName: 'claude-4.5-haiku',
    displayName: 'Claude 4.5 Haiku',
    aliasesBySource: {
      ...EMPTY_ALIASES_BY_SOURCE,
      cursorCsvAliases: ['claude-4.5-haiku', 'claude-4-5-haiku'],
      ccusageDailyJsonAliases: ['claude-haiku-4-5', 'claude-haiku-4-5-20251001', 'claude-4-5-haiku'],
      anthropicUsageApiAliases: ['claude-haiku-4-5', 'claude-haiku-4-5-latest'],
      anthropicCodeApiAliases: ['claude-haiku-4-5', 'claude-haiku-4-5-latest'],
    },
    allAliases: [],
    sources: [],
    version: MODEL_MAPPING_VERSION,
  },
  {
    canonicalName: 'gpt-5.2',
    displayName: 'GPT-5.2',
    aliasesBySource: {
      ...EMPTY_ALIASES_BY_SOURCE,
      cursorCsvAliases: ['gpt-5.2'],
      openaiApiAliases: ['gpt-5.2'],
    },
    allAliases: [],
    sources: [],
    version: MODEL_MAPPING_VERSION,
  },
  {
    canonicalName: 'gemini-3-flash-preview',
    displayName: 'Gemini 3 Flash Preview',
    aliasesBySource: {
      ...EMPTY_ALIASES_BY_SOURCE,
      cursorCsvAliases: ['gemini-3-flash-preview'],
      geminiApiAliases: ['gemini-3-flash-preview'],
    },
    allAliases: [],
    sources: [],
    version: MODEL_MAPPING_VERSION,
  },
]

function normalizeAliasValue(input: string): string {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/^["']|["']$/g, '')
    .replace(/^claude[_-]?code\//, '')
    .replace(/\s+/g, '-')
    .replace(/_/g, '-')
}

function normalizeClaudeCanonical(input: string): string {
  const raw = normalizeAliasValue(input).replace(/-\d{8}$/, '')
  if (!raw.startsWith('claude-')) return raw

  let m = raw.match(/^claude-(sonnet|opus|haiku)-(\d)-(\d)(?:-.+)?$/)
  if (m) return `claude-${m[2]}.${m[3]}-${m[1]}`

  m = raw.match(/^claude-(\d)-(\d)-(sonnet|opus|haiku)(?:-.+)?$/)
  if (m) return `claude-${m[1]}.${m[2]}-${m[3]}`

  m = raw.match(/^claude-(sonnet|opus|haiku)-(\d+)(?:-.+)?$/)
  if (m) return `claude-${m[2]}-${m[1]}`

  m = raw.match(/^claude-(\d+)-(sonnet|opus|haiku)(?:-.+)?$/)
  if (m) return `claude-${m[1]}-${m[2]}`

  m = raw.match(/^claude-(\d+)\.(\d+)-(sonnet|opus|haiku)(?:-.+)?$/)
  if (m) return `claude-${m[1]}.${m[2]}-${m[3]}`

  m = raw.match(/^claude-(sonnet|opus|haiku)-(\d+)\.(\d+)(?:-.+)?$/)
  if (m) return `claude-${m[2]}.${m[3]}-${m[1]}`

  return raw
}

export function normalizeModelMappingSourceKey(rawSource: string): ModelMappingSourceKey {
  const s = String(rawSource || '').trim().toLowerCase()
  const known: Record<string, ModelMappingSourceKey> = {
    cursor_csv: 'cursor_csv',
    csv: 'cursor_csv',
    ccusage_daily_json: 'ccusage_daily_json',
    claude_code_usage: 'ccusage_daily_json',
    anthropic_usage: 'anthropic_usage_api',
    anthropic_usage_api: 'anthropic_usage_api',
    anthropic_code: 'anthropic_code_api',
    anthropic_code_api: 'anthropic_code_api',
    openai: 'openai_api',
    openai_usage: 'openai_api',
    openai_api: 'openai_api',
    github_copilot: 'github_copilot_api',
    github_copilot_api: 'github_copilot_api',
    gemini: 'gemini_api',
    gemini_api: 'gemini_api',
    codeium: 'codeium_api',
    codeium_api: 'codeium_api',
  }
  return known[s] || 'unknown'
}

export function sourceAliasFieldName(source: ModelMappingSourceKey): keyof ModelAliasesBySource | null {
  const bySource: Record<ModelMappingSourceKey, keyof ModelAliasesBySource | null> = {
    cursor_csv: 'cursorCsvAliases',
    ccusage_daily_json: 'ccusageDailyJsonAliases',
    anthropic_usage_api: 'anthropicUsageApiAliases',
    anthropic_code_api: 'anthropicCodeApiAliases',
    openai_api: 'openaiApiAliases',
    github_copilot_api: 'githubCopilotApiAliases',
    gemini_api: 'geminiApiAliases',
    codeium_api: 'codeiumApiAliases',
    unknown: null,
  }
  return bySource[source]
}

export function toModelMappingDocId(canonicalName: string): string {
  return normalizeAliasValue(canonicalName).replace(/[^a-z0-9._-]/g, '_')
}

export function toDisplayModelName(canonicalName: string): string {
  const n = String(canonicalName || '').trim()
  if (!n) return 'Unknown Model'
  if (n.startsWith('claude-')) {
    const m = n.match(/^claude-(\d+(?:\.\d+)?)-(sonnet|opus|haiku)$/)
    if (m) return `Claude ${m[1]} ${m[2][0]!.toUpperCase()}${m[2].slice(1)}`
  }
  if (n.startsWith('gpt-')) return n.toUpperCase()
  if (n.startsWith('gemini-')) return n.replace(/^gemini-/, 'Gemini ').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  return n
}

function finalizeSeed(seed: CanonicalModelMappingDocument): CanonicalModelMappingDocument {
  const allAliasSet = new Set<string>([normalizeAliasValue(seed.canonicalName)])
  const sources = new Set<ModelMappingSourceKey>()
  ;(Object.keys(seed.aliasesBySource) as Array<keyof ModelAliasesBySource>).forEach((field) => {
    const vals = seed.aliasesBySource[field]
      .map((v) => normalizeAliasValue(v))
      .filter(Boolean)
    seed.aliasesBySource[field] = Array.from(new Set(vals)).sort()
    if (seed.aliasesBySource[field].length > 0) {
      const key = field
      if (key === 'cursorCsvAliases') sources.add('cursor_csv')
      if (key === 'ccusageDailyJsonAliases') sources.add('ccusage_daily_json')
      if (key === 'anthropicUsageApiAliases') sources.add('anthropic_usage_api')
      if (key === 'anthropicCodeApiAliases') sources.add('anthropic_code_api')
      if (key === 'openaiApiAliases') sources.add('openai_api')
      if (key === 'githubCopilotApiAliases') sources.add('github_copilot_api')
      if (key === 'geminiApiAliases') sources.add('gemini_api')
      if (key === 'codeiumApiAliases') sources.add('codeium_api')
    }
    seed.aliasesBySource[field].forEach((v) => allAliasSet.add(v))
  })
  seed.allAliases = Array.from(allAliasSet).sort()
  seed.sources = Array.from(sources)
  return seed
}

const FINALIZED_SEEDS = MODEL_MAPPING_SEEDS.map((seed) =>
  finalizeSeed({
    ...seed,
    aliasesBySource: {
      ...EMPTY_ALIASES_BY_SOURCE,
      ...seed.aliasesBySource,
    },
  })
)

export function getModelMappingSeeds(): CanonicalModelMappingDocument[] {
  return FINALIZED_SEEDS.map((seed) => ({
    ...seed,
    aliasesBySource: {
      ...seed.aliasesBySource,
    },
    allAliases: [...seed.allAliases],
    sources: [...seed.sources],
  }))
}

export function resolveCanonicalModelName(rawName: string, source: string): string {
  return resolveCanonicalModelNameWithDiagnostics(rawName, source).canonicalName
}

export function resolveCanonicalModelNameWithDiagnostics(
  rawName: string,
  source: string
): ModelResolutionDiagnostics {
  const sourceKey = normalizeModelMappingSourceKey(source)
  const alias = normalizeAliasValue(rawName)
  if (!alias) {
    return {
      canonicalName: '',
      normalizedInput: '',
      sourceKey,
      isSeedMatch: false,
      matchType: 'empty',
    }
  }

  for (const seed of FINALIZED_SEEDS) {
    if (seed.canonicalName === alias) {
      return {
        canonicalName: seed.canonicalName,
        normalizedInput: alias,
        sourceKey,
        isSeedMatch: true,
        matchType: 'canonical_exact',
      }
    }
    const sourceField = sourceAliasFieldName(sourceKey)
    if (sourceField && seed.aliasesBySource[sourceField].includes(alias)) {
      return {
        canonicalName: seed.canonicalName,
        normalizedInput: alias,
        sourceKey,
        isSeedMatch: true,
        matchType: 'source_alias',
      }
    }
    if (seed.allAliases.includes(alias)) {
      return {
        canonicalName: seed.canonicalName,
        normalizedInput: alias,
        sourceKey,
        isSeedMatch: true,
        matchType: 'seed_alias_other_source',
      }
    }
  }

  return {
    canonicalName: alias.startsWith('claude-') ? normalizeClaudeCanonical(alias) : alias,
    normalizedInput: alias,
    sourceKey,
    isSeedMatch: false,
    matchType: 'heuristic',
  }
}

export function createModelMappingDocument(input: {
  canonicalName: string
  source: string
  alias?: string
}): CanonicalModelMappingDocument {
  const canonicalName = resolveCanonicalModelName(input.canonicalName, input.source)
  const sourceKey = normalizeModelMappingSourceKey(input.source)
  const field = sourceAliasFieldName(sourceKey)
  const alias = normalizeAliasValue(input.alias || input.canonicalName)

  const aliasesBySource: ModelAliasesBySource = {
    ...EMPTY_ALIASES_BY_SOURCE,
  }
  if (field && alias) aliasesBySource[field] = [alias]

  const base: CanonicalModelMappingDocument = {
    canonicalName,
    displayName: toDisplayModelName(canonicalName),
    aliasesBySource,
    allAliases: [normalizeAliasValue(canonicalName), alias].filter(Boolean),
    sources: field ? [sourceKey] : [],
    version: MODEL_MAPPING_VERSION,
  }

  return finalizeSeed(base)
}
