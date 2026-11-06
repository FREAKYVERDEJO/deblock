// Independent regression checks; existing acceptance checks remain unchanged.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const elements = new Map();
const get = id => {
  if (!elements.has(id)) elements.set(id, {
    value: '', placeholder: '', textContent: '', clientWidth: 600,
    style: { setProperty() {} }, handlers: {},
    addEventListener(name, handler) { this.handlers[name] = handler; },
    focus() {}, showModal() { this.open = true; }, close() { this.open = false; },
  });
  return elements.get(id);
};
const context = vm.createContext({
  document: { body: {}, getElementById: get, querySelectorAll: () => [] },
  window: { addEventListener() {}, dispatchEvent() {} },
  CustomEvent: class {},
  fetch: async () => ({ ok: true, json: async () => ({ title: 'Test', instructions: 'Test' }) }),
});
async function run() {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../deblock/web/app.js'), 'utf8'), context);
  await vm.runInContext('loadExercise()', context);
  get('word').value = 'moon tide';
  get('word').handlers.input({});
  get('reset').handlers.click();
  assert.equal(get('reset-dialog').open, true);
  get('cancel-reset').handlers.click();
  get('finish').handlers.click();
  assert.equal(get('chain-summary').textContent, 'moon → tide');
  get('reset').handlers.click();
  get('confirm-reset').handlers.click();
  assert.equal(get('word').value, '');
  assert.equal(get('word').placeholder, 'a word…');
  assert.equal(get('reset-dialog').open, false);
  get('finish').handlers.click();
  assert.equal(get('chain-summary').textContent, '');
  assert.equal(get('chain-summary').hidden, true);
  get('word').value = 'new ';
  get('word').handlers.input({});
  get('finish').handlers.click();
  assert.equal(get('chain-summary').textContent, 'new');
  assert.equal(get('chain-summary').hidden, false);
  console.log('3 reset checks passed (cancel, clear, new chain)');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
