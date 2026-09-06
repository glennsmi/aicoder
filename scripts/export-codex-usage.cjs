#!/usr/bin/env node
// Build first: npm run functions:build
const { readdir, readFile, writeFile } = require('node:fs/promises')
const { join, resolve } = require('node:path')
const { homedir } = require('node:os')
const { parseCodexFile, codexLedgerCsv } = require('../functions/lib/shared/codexLedger.js')
async function main() {
  const root = resolve(process.argv[2] || join(process.env.CODEX_HOME || join(homedir(), '.codex'), 'sessions'))
  const output = resolve(process.argv[3] || 'codex-usage')
  const rows = new Map()
  let warnings = 0
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) await walk(path)
      else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        const result = parseCodexFile(await readFile(path, 'utf8'))
        result.rows.forEach(row => rows.set(row.event_id, row))
        warnings += result.warnings.length
      }
    }
  }
  await walk(root)
  const sorted = [...rows.values()].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
  if (!sorted.length) throw new Error('No supported Codex token records found')
  await writeFile(`${output}.json`, JSON.stringify({ schema: 'aicoder.codex.v1', rows: sorted }, null, 2), { flag: 'wx', mode: 0o600 })
  await writeFile(`${output}.csv`, codexLedgerCsv(sorted), { flag: 'wx', mode: 0o600 })
  console.log(`Exported ${sorted.length} records. ${warnings} parsing warnings. JSON can be imported using Select Codex files.`)
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
