// Request security, optimistic concurrency, pagination, and expired sessions.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
async function run() {
  const calls = [], events = [], replies = [];
  const window = { dispatchEvent: event => events.push(event.type) };
  const context = vm.createContext({ window, FormData, CustomEvent: class { constructor(type) { this.type = type; } },
    fetch: async (url, options) => {
      calls.push({ url, options });
      if (url === '/api/session/') return { ok: true, json: async () => ({ profile: { accountId: '42' }, csrfToken: 'masked-token' }) };
      const reply = replies.shift(); assert.ok(reply, 'Unexpected request');
      return { ok: reply.status < 400, status: reply.status, json: async () => reply.data };
    },
  });
  vm.runInContext(fs.readFileSync('deblock/web/account-storage.js', 'utf8'), context);
  const store = window.DeblockStorage;
  replies.push({ status: 201, data: { id: 'entry', revision: 1 } });
  await store.put('entries', { id: 'entry', words: ['moon'] });
  assert.equal(calls[1].options.headers['X-CSRFToken'], 'masked-token');
  assert.equal(calls[1].options.headers['X-Account-ID'], '42');
  assert.equal(calls[1].options.credentials, 'same-origin');
  replies.push({ status: 200, data: { id: 'entry', revision: 2 } });
  await store.put('entries', { id: 'entry', words: ['moon', 'tide'] });
  assert.equal(JSON.parse(calls.at(-1).options.body).revision, 1);
  replies.push({ status: 409, data: { error: 'This entry changed in another tab.' } });
  await assert.rejects(store.put('entries', { id: 'entry', revision: 1 }), /changed in another tab/);
  assert.equal(JSON.parse(calls.at(-1).options.body).revision, 1, 'Explicit stale revisions must not be overwritten');
  replies.push({ status: 200, data: { items: [{ id: 'one' }], nextPage: 2 } }, { status: 200, data: { items: [{ id: 'two' }], nextPage: null } });
  assert.equal((await store.all('images')).length, 2);
  assert.equal(calls.at(-1).url, '/api/images/?page=2');
  replies.push({ status: 403, data: { error: 'The password was not correct.' } });
  await assert.rejects(store.request('/api/account/', 'DELETE', { password: 'wrong' }), /password was not correct/);
  assert.equal(events.length, 0);
  replies.push({ status: 401, data: { error: 'Sign in' } });
  await assert.rejects(store.all('entries'), /Sign in again/);
  assert.equal(events[0], 'account-session-ended');
  replies.push({ status: 204 }); await store.remove('entries', 'entry');
  assert.equal(calls.at(-1).options.method, 'DELETE');
  console.log('Account storage checks passed (CSRF, identity binding, revisions, pagination, errors, session expiry, delete)');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
