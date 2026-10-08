/** Only successful account saves can advance file checkpoints. Cache is an optimization, not authority. */
export interface FileCheckpoint { path: string; size: number; modified: number }
export const usageFilePaths = new WeakMap<File, string>()
export function checkpoint(file: File): FileCheckpoint {
  return { path: usageFilePaths.get(file) || file.webkitRelativePath || file.name, size: file.size, modified: file.lastModified }
}
const key = (account: string, source: string) => `aicoder-file-checkpoints-v1:${JSON.stringify([account, source])}`
export function loadCheckpoints(account?: string, source = ''): Record<string, FileCheckpoint> {
  if (!account) return {}
  try {
    const parsed = JSON.parse(localStorage.getItem(key(account, source)) || '{}')
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch { return {} }
}
export function unchanged(file: FileCheckpoint, saved: Record<string, FileCheckpoint>): boolean {
  const previous = saved[file.path]
  return file.modified > 0 && previous?.size === file.size && previous?.modified === file.modified
}
export function saveCheckpoints(account: string, source: string, files: FileCheckpoint[]): boolean {
  try {
    const saved = loadCheckpoints(account, source)
    files.forEach(file => { saved[file.path] = file })
    localStorage.setItem(key(account, source), JSON.stringify(Object.fromEntries(Object.entries(saved).slice(-5000))))
    return true
  } catch { return false }
}
export async function pendingUsage<T extends { event_id: string; total_tokens: number }>(rows: T[],
  check: (rows: Array<{ event_id: string; total_tokens: number }>) => Promise<string[]>,
  progress: (completed: number) => void): Promise<T[]> {
  const pending: T[] = []
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200)
    const needed = new Set(await check(chunk.map(row => ({ event_id: row.event_id, total_tokens: row.total_tokens }))))
    pending.push(...chunk.filter(row => needed.has(row.event_id)))
    progress(Math.min(i + 200, rows.length))
  }
  return pending
}
