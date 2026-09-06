// Run after npm run functions:build. In-memory Firestore verifies handler behavior, not connectivity.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const { createRequire } = require('node:module')
const vm = require('node:vm')
const { parseClaudeFile } = require('../lib/shared/claudeLedger.js')
function setup(member = true) {
  const docs = new Map([['users/user-1', { currentOrganizationId: 'org-1' }]])
  if (member) docs.set('organizations/org-1/members/user-1', { teamId: 'team-1' })
  const snapshot = path => ({ exists: docs.has(path), data: () => docs.get(path) })
  const ref = path => ({ path, get: async () => snapshot(path), collection: name => ref(`${path}/${name}`), doc: id => ref(`${path}/${id}`) })
  const db = { doc: ref, collection: ref, runTransaction: async fn => {
    const writes = []
    const result = await fn({ get: async r => snapshot(r.path), set: (r, value) => writes.push([r.path, value]) })
    writes.forEach(([path, value]) => docs.set(path, value))
    return result
  } }
  const firestore = () => db
  firestore.FieldValue = { serverTimestamp: () => 'server-time' }
  const path = resolve(__dirname, '../lib/usage/ingestClaudeLedger.js')
  const realRequire = createRequire(path), exports = {}
  vm.runInNewContext(readFileSync(path, 'utf8'), { exports, require: name => {
    if (name === 'firebase-admin') return { firestore }
    if (name === 'firebase-functions/v2/https') return {
      onCall: (_options, handler) => handler,
      HttpsError: class extends Error { constructor(code, message) { super(message); this.code = code } },
    }
    return realRequire(name)
  } })
  return { handler: exports.ingestClaudeLedger, docs }
}
function row(output = 20) {
  return parseClaudeFile(JSON.stringify({ type: 'assistant', sessionId: 'session-1', timestamp: '2026-09-06T12:00:00Z',
    message: { id: 'msg-1', model: 'claude-sonnet-4-6', usage: { input_tokens: 100, cache_read_input_tokens: 40, cache_creation_input_tokens: 10, output_tokens: output } } })).rows[0]
}
test('save, retry, fuller snapshot and stale retry preserve one user/org event', async () => {
  const { handler, docs } = setup()
  const call = r => handler({ auth: { uid: 'user-1' }, data: { rows: [r], userId: 'other-user', organizationId: 'other-org' } })
  assert.equal((await call(row())).saved, 1)
  assert.equal((await call(row())).duplicates, 1)
  assert.equal((await call(row(30))).updated, 1)
  assert.equal((await call(row())).duplicates, 1)
  const events = [...docs.entries()].filter(([path]) => path.includes('/usageEvents/'))
  assert.equal(events.length, 2)
  for (const [path, doc] of events) {
    assert.ok(!path.includes('other-'))
    assert.equal(doc.tokens.total, 180)
    assert.equal(doc.tokens.input, 110)
    assert.equal(doc.cost.hasCost, false)
    assert.equal(doc.organizationId, 'org-1')
    assert.equal(doc.source.label, 'claude_code_local')
  }
})
test('does not materialize organization data without membership', async () => {
  const { handler, docs } = setup(false)
  await handler({ auth: { uid: 'user-1' }, data: { rows: [row()] } })
  const events = [...docs.entries()].filter(([path]) => path.includes('/usageEvents/'))
  assert.equal(events.length, 1)
  assert.equal(events[0][1].organizationId, undefined)
})
test('rejects unauthenticated requests and validates the whole batch before writing', async () => {
  const { handler, docs } = setup()
  await assert.rejects(handler({ data: { rows: [row()] } }), { code: 'unauthenticated' })
  await assert.rejects(handler({ auth: { uid: 'user-1' }, data: { rows: [row(), { ...row(), total_tokens: -1 }] } }), { code: 'invalid-argument' })
  assert.equal([...docs.keys()].filter(path => path.includes('/usageEvents/')).length, 0)
})
