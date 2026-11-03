// Profile selection regression: retain old identity and persist the third portrait.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const elements = new Map();
const get = id => {
  if (!elements.has(id)) elements.set(id, {
    value: '', checked: false, handlers: {},
    addEventListener(event, handler) { this.handlers[event] = handler; },
    setAttribute() {},
  });
  return elements.get(id);
};
let profile = { id: 'local', name: 'Sample', email: '', avatar: '1', joinedAt: '2026-11-01T12:00:00Z' };
const context = vm.createContext({
  document: { getElementById: get }, showDialog() {},
  window: { DeblockStorage: {
    async get() { return structuredClone(profile); },
    async all() { return []; },
    async put(_, value) { profile = structuredClone(value); },
  } },
});
vm.runInContext(fs.readFileSync(path.join(__dirname, '../deblock/web/shelf.js'), 'utf8'), context);
(async () => {
  await get('open-profile').handlers.click();
  assert.equal(get('avatar-1').checked, true);
  assert.match(get('profile-image').src, /portrait-1.png$/);
  get('avatar-1').checked = false;
  get('avatar-3').checked = true;
  await get('profile-form').handlers.submit({ preventDefault() {} });
  assert.equal(profile.avatar, '3');
  await get('open-profile').handlers.click();
  assert.equal(get('avatar-3').checked, true);
  assert.equal(get('avatar-1').checked, false);
  assert.match(get('profile-image').src, /portrait-3.png$/);
  profile.avatar = 'unrecognized';
  await get('open-profile').handlers.click();
  assert.equal(get('avatar-1').checked, true);
  assert.equal(get('avatar-3').checked, false);
  console.log('3 avatar checks passed (existing identity, third portrait persistence, unknown-ID fallback)');
})().catch(error => { console.error(error); process.exitCode = 1; });
