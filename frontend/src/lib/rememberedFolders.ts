import { usageFilePaths } from './incrementalUsage'
export interface UsageDirectory {
  kind: 'directory'
  name: string
  values(): AsyncIterable<UsageDirectory | { kind: 'file'; name: string; getFile(): Promise<File> }>
  requestPermission(options: { mode: 'read' }): Promise<PermissionState>
}
export type DirectoryPickerWindow = Window & { showDirectoryPicker?: (options: { mode: 'read'; id: string }) => Promise<UsageDirectory> }
export function folderKey(accountId: string, source: string) { return JSON.stringify([accountId, source]) }
async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('aicoder-usage-folders', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('folders')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
export async function storedFolder(key: string, operation: 'get' | 'put' | 'delete', handle?: UsageDirectory): Promise<UsageDirectory | undefined> {
  const db = await database()
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('folders', operation === 'get' ? 'readonly' : 'readwrite')
      const store = tx.objectStore('folders')
      const request = operation === 'get' ? store.get(key) : operation === 'put' ? store.put(handle, key) : store.delete(key)
      tx.oncomplete = () => resolve(operation === 'get' ? request.result : undefined)
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally { db.close() }
}
export async function readUsageDirectory(directory: UsageDirectory, extension: 'csv' | 'jsonl', active: () => boolean = () => true): Promise<File[]> {
  const files: File[] = []
  async function walk(dir: UsageDirectory, path = directory.name) {
    for await (const entry of dir.values()) {
      if (!active()) throw new DOMException('Cancelled', 'AbortError')
      if (entry.kind === 'directory') await walk(entry, `${path}/${entry.name}`)
      else if (entry.name.toLowerCase().endsWith(`.${extension}`)) {
        const file = await entry.getFile()
        usageFilePaths.set(file, `${path}/${entry.name}`)
        files.push(file)
      }
    }
  }
  await walk(directory)
  return files
}
