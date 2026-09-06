#!/usr/bin/env node
// Build first: npm run functions:build
const { readdir, readFile, writeFile } = require('node:fs/promises')
const { join, resolve } = require('node:path')
const { homedir } = require('node:os')
const { parseClaudeFile, claudeLedgerCsv, mergeClaudeRows } = require('../functions/lib/shared/claudeLedger.js')
async function main() {
  const root = resolve(process.argv[2] || join(process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude'), 'projects'))
  const output = resolve(process.argv[3] || 'claude-usage')
  const rows = []
  let warnings = 0
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) await walk(path)
      else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        const result = parseClaudeFile(await readFile(path, 'utf8'))
        rows.push(...result.rows)
        warnings += result.warnings.length
      }
    }
  }
  await walk(root)
  const sorted = mergeClaudeRows(rows)
  if (!sorted.length) throw new Error('No supported Claude token records found')
  await writeFile(`${output}.json`, JSON.stringify({ schema: 'aicoder.claude.v1', rows: sorted }, null, 2), { flag: 'wx', mode: 0o600 })
  await writeFile(`${output}.csv`, claudeLedgerCsv(sorted), { flag: 'wx', mode: 0o600 })
  console.log(`Exported ${sorted.length} records. ${warnings} parsing warnings. JSON can be imported using Select Claude Code files.`)
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
