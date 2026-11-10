// Local collection behavior with an isolated store; original tests stay unchanged.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { randomUUID } = require('node:crypto');

function element() {
  return {
    value: '', textContent: '', clientWidth: 600, style: { setProperty() {} }, focus() {}, showModal() {}, close() {}, checked: false, hidden: true, children: [], handlers: {},
    addEventListener(name, handler) { this.handlers[name] = handler; },
    append(...items) { this.children.push(...items); },
    replaceChildren(...items) { this.children = items; },
    setAttribute(name, value) { this[name] = value; },
    closest() { return this; },
  };
}
async function run() {
  const elements = new Map();
  const get = id => { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); };
  const records = { entries: new Map(), images: new Map(), profile: new Map(), aphorisms: new Map() };
  let failSave = false;
  const store = {
    async get(name, id) { return records[name].get(id); },
    async all(name) { return [...records[name].values()]; },
    async put(name, value) { if (failSave) throw new Error('Quota'); records[name].set(value.id, structuredClone(value)); },
  };
  const draft = { id: 'entry-one', title: '<b>Sample</b>', words: ['moon', 'tide'], draft: 'shore', arrows: false, updatedAt: new Date().toISOString() };
  const window = { DeblockStorage: store, DeblockDocument: { snapshot: () => structuredClone(draft) }, DeblockAphorisms: { render: async () => {} } };
  const context = vm.createContext({ window, document: { getElementById: get, createElement: element },
    showDialog(dialog) { dialog.open = true; }, crypto: { randomUUID }, URL: { createObjectURL: () => 'blob:sample', revokeObjectURL() {} },
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../deblock/web/shelf.js'), 'utf8'), context);
  await get('save-entry').handlers.click();
  await get('save-entry').handlers.click();
  assert.equal(records.entries.size, 1, 'Repeated saves update the same entry');
  assert.equal(get('export-status').textContent, 'Saved to library in this browser.');
  await get('open-library').handlers.click();
  const card = get('library-list').children[0];
  assert.equal(card.children[0].textContent, '<b>Sample</b>', 'Titles render as literal text');
  card.handlers.click();
  assert.equal(get('entry-body').textContent, 'moon tide shore');
  assert.equal(window.DeblockShelf.snapshotFor({ id: 'entry-dialog' }).id, 'entry-one');
  await get('open-profile').handlers.click();
  assert.equal(get('profile-count').textContent, '1');
  get('profile-name').value = 'Sample'; get('profile-email').value = 'sample@example.test'; get('avatar-2').checked = true;
  await get('profile-form').handlers.submit({ preventDefault() {} });
  assert.equal(records.profile.get('local').avatar, '2');
  assert.equal(records.profile.get('local').email, 'sample@example.test');
  await window.DeblockShelf.saveImage(new Blob(['png']), draft);
  await get('open-gallery').handlers.click();
  assert.equal(records.images.size, 1);
  assert.equal(get('gallery-list').children[0].children[0].alt, '<b>Sample</b>');
  failSave = true;
  await get('save-entry').handlers.click();
  assert.match(get('export-status').textContent, /Couldn’t access browser storage/);
  assert.equal(draft.draft, 'shore');
  const editorWindow = { addEventListener() {}, dispatchEvent() {} };
  const editorContext = vm.createContext({ window: editorWindow,
    document: { body: {}, getElementById: get, querySelectorAll: () => [] },
    crypto: { randomUUID }, CustomEvent: class {},
    fetch: async () => ({ ok: true, json: async () => ({ title: 'Test', instructions: 'Test' }) }),
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../deblock/web/app.js'), 'utf8'), editorContext);
  await vm.runInContext('loadExercise()', editorContext);
  get('word').value = 'moon tide'; get('word').handlers.input({});
  const first = editorWindow.DeblockDocument.snapshot();
  first.words.push('external mutation');
  const second = editorWindow.DeblockDocument.snapshot();
  assert.equal(second.id, first.id);
  assert.equal(second.words.join(' '), 'moon');
  assert.equal(second.draft, 'tide');
  get('confirm-reset').handlers.click();
  assert.notEqual(editorWindow.DeblockDocument.snapshot().id, first.id);
  console.log('9 collection checks passed (save/update, safe rendering, entry view, profile, gallery, storage failure, stable identity, snapshot isolation, new entry after reset)');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
