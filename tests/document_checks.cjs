// Document formatting checks, independent of the original acceptance tests.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

async function editor() {
  const elements = new Map();
  const get = id => {
    if (!elements.has(id)) elements.set(id, {
      value: '', textContent: id === 'document-title' ? 'Untitled' : '',
      clientWidth: 600, style: { setProperty() {} }, handlers: {},
      addEventListener(name, handler) { this.handlers[name] = handler; },
      focus() {}, showModal() {}, close() {},
    });
    return elements.get(id);
  };
  const context = vm.createContext({
    document: { body: {}, getElementById: get, querySelectorAll: () => [] },
    window: { addEventListener() {}, dispatchEvent() {}, DeblockAphorisms: { render: async () => {} } },
    CustomEvent: class {},
    fetch: async () => ({ ok: true, json: async () => ({ title: 'Test', instructions: 'Test' }) }),
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../deblock/web/app.js'), 'utf8'), context);
  await vm.runInContext('loadExercise()', context);
  return { get, body: () => vm.runInContext('documentBody()', context), type(value) { get('word').value = value; get('word').handlers.input({}); } };
}

async function run() {
  const e = await editor();
  e.type('moon tide shore');
  e.get('finish').handlers.click();
  assert.equal(e.get('chain-summary').textContent, 'moon → tide → shore');
  e.get('arrows-toggle').handlers.click();
  assert.equal(e.get('chain-summary').textContent, 'moon tide shore');
  assert.equal(e.get('arrows-toggle').ariaPressed, 'false');
  e.get('arrows-toggle').handlers.click();
  assert.equal(e.get('chain-summary').textContent, 'moon → tide → shore');
  e.get('document-title').textContent = 'A quiet shore';
  e.get('resume').handlers.click();
  e.get('finish').handlers.click();
  assert.equal(e.get('document-title').textContent, 'A quiet shore');
  e.get('arrows-toggle').handlers.click();
  assert.equal(e.body(), 'moon tide shore');
  e.get('arrows-toggle').handlers.click();
  assert.equal(e.body(), 'moon → tide → shore');
  e.get('confirm-reset').handlers.click();
  assert.equal(e.get('document-title').textContent, 'Untitled');
  e.get('finish').handlers.click();
  assert.equal(e.get('chain-summary').textContent, '');
  assert.equal(e.get('chain-summary').hidden, true);
  console.log('5 document checks passed (toggle, preservation, plain text, arrow text, reset)');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
