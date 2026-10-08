const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const { createRequire } = require('node:module')
const vm = require('node:vm')
function setup(snapshots) {
  const paths = []
  const ref = path => ({ collection: name => ref(`${path}/${name}`), doc: name => ref(`${path}/${name}`), path })
  const db = { collection: ref, getAll: async (...refs) => { paths.push(...refs.map(r => r.path)); return snapshots } }
  const path = resolve(__dirname, '../lib/usage/ledgerPreflight.js'), realRequire = createRequire(path), exports = {}
  vm.runInNewContext(readFileSync(path, 'utf8'), { exports, require: name => {
    if (name === 'firebase-admin') return { firestore: () => db }
    if (name === 'firebase-functions/v2/https') return { HttpsError: class extends Error {} }
    return realRequire(name)
  } })
  return { check: exports.ledgerPreflight, paths }
}
test('Codex preflight checks only authenticated user docs and returns missing IDs', async () => {
  const { check, paths } = setup([{ exists: true }, { exists: false }])
  const result = await check('alice', 'codex_local', [{ event_id: 'old', total_tokens: 5 }, { event_id: 'new', total_tokens: 3 }])
  assert.equal(JSON.stringify(result.needed), '["new"]')
  assert.equal(paths.length, 2)
  assert.ok(paths.every(p => p.startsWith('users/alice/usageEvents/')))
})
test('Claude preflight includes a fuller snapshot but skips equal and stale snapshots', async () => {
  const { check } = setup([5, 10, 20].map(total => ({ exists: true, data: () => ({ tokens: { total } }) })))
  const result = await check('alice', 'claude_code_local', ['newer', 'equal', 'older'].map(event_id => ({ event_id, total_tokens: 10 })))
  assert.equal(JSON.stringify(result.needed), '["newer"]')
})
test('invalid checkpoints do not query Firestore', async () => {
  const { check, paths } = setup([])
  await assert.rejects(check('alice', 'codex_local', [{ event_id: 'x', total_tokens: -1 }]))
  assert.equal(paths.length, 0)
})
