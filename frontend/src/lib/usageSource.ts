import type { CursorUsageV2 } from '@shared'
const labels: Record<string, string> = {
  cursor: 'Cursor', cursor_csv: 'Cursor', csv: 'Cursor',
  codex: 'Codex', codex_local: 'Codex',
  claude_code_local: 'Claude Code', claude_code: 'Claude Code',
  ccusage: 'Claude Code', ccusage_daily_json: 'Claude Code', claude_code_usage: 'Claude Code',
  'claude code': 'Claude Code', 'openai api': 'OpenAI API', 'anthropic api': 'Anthropic API',
  'github copilot': 'GitHub Copilot', gemini: 'Gemini', codeium: 'Codeium',
  'claude code desktop api': 'Claude Code', anthropic_code_api: 'Claude Code',
  openai_api: 'OpenAI API', openai: 'OpenAI API', anthropic_usage_api: 'Anthropic API',
  github_copilot_api: 'GitHub Copilot', gemini_api: 'Gemini', codeium_api: 'Codeium',
}
/** Tool provenance is independent of the model vendor. Never infer it from a model name. */
export function usageSourceLabel(source: unknown): string {
  const key = typeof source === 'string' ? source.trim().toLowerCase() : ''
  return labels[key] || (key && key !== 'unknown' ? key.replace(/[_-]+/g, ' ') : 'Unknown')
}
export function usageSourceTools(row: CursorUsageV2): string[] {
  const tools = row.raw?.sourceTools
  if (Array.isArray(tools) && tools.length) return tools.filter((v): v is string => typeof v === 'string')
  return [usageSourceLabel(row.source || row.raw?.source)]
}
