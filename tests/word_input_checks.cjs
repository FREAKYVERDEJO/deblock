// Run with `node tests/word_input_checks.cjs`. No browser or third-party packages.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

async function editor() {
  const elements = new Map();
  const events = [];
  const document = { body: { dataset: { theme: 'pixel' } }, querySelectorAll: () => [] };
  document.activeElement = document.body;
  document.getElementById = (id) => {
    if (!elements.has(id)) elements.set(id, {
      value: '', textContent: '', placeholder: 'a word…', clientWidth: 600,
      style: { setProperty() {} }, handlers: {}, selectionStart: 0, selectionEnd: 0,
      addEventListener(name, handler) { this.handlers[name] = handler; },
      focus() { document.activeElement = this; },
      showModal() {}, close() {},
    });
    return elements.get(id);
  };
  const context = vm.createContext({
    document,
    window: { addEventListener() {}, dispatchEvent(event) { events.push(event); } },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    fetch: async () => ({ ok: true, json: async () => ({ title: 'Test', instructions: 'Test' }) }),
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../deblock/web/app.js'), 'utf8'), context);
  await vm.runInContext('loadExercise()', context);
  const get = document.getElementById;
  const input = get('word');
  return {
    get, input, document, events,
    type(value) { input.value = value; input.handlers.input({ isComposing: false }); },
    summary() { get('finish').handlers.click(); return get('chain-summary').textContent; },
  };
}

async function run() {
  const checks = [
    ['space commits and clears without a ghost word', async () => {
      const e = await editor(); e.type('moon ');
      assert.equal(e.input.value, ''); assert.equal(e.summary(), 'moon');
      assert.equal(e.get('announcement').textContent, 'Next word.');
    }],
    ['repeated and Unicode whitespace never create empty links', async () => {
      const e = await editor(); e.type('  moon\t\n tide\u00a0');
      assert.equal(e.input.value, ''); assert.equal(e.summary(), 'moon → tide');
    }],
    ['pasted newlines split words and retain only the unfinished suffix', async () => {
      const e = await editor();
      let prevented = false;
      e.input.handlers.paste({ preventDefault() { prevented = true; }, clipboardData: { getData: () => 'river\nstone\tcloud' } });
      assert.ok(prevented); assert.equal(e.input.value, 'cloud');
      assert.equal(e.summary(), 'river → stone → (cloud — unfinished)');
    }],
    ['composition waits for committed text', async () => {
      const e = await editor(); e.input.handlers.compositionstart(); e.type('海 ');
      assert.equal(e.input.value, '海 ');
      e.input.handlers.compositionend();
      assert.equal(e.input.value, ''); assert.equal(e.summary(), '海');
    }],
    ['Enter and Tab commit while keeping normal navigation', async () => {
      const e = await editor(); e.type('moon');
      e.get('word-form').handlers.submit({ preventDefault() {} });
      e.type('tide'); e.input.handlers.keydown({ key: 'Tab', isComposing: false });
      assert.equal(e.input.value, ''); assert.equal(e.summary(), 'moon → tide');
    }],
    ['theme changes preserve both the chain and unfinished input', async () => {
      const e = await editor(); e.type('moon tide');
      e.get('theme').handlers.change({ target: { value: 'plain' } });
      assert.equal(e.document.body.dataset.theme, 'plain'); assert.equal(e.input.value, 'tide');
      assert.equal(e.summary(), 'moon → (tide — unfinished)');
      assert.ok(e.events.some(event => event.type === 'themechange' && event.detail === 'plain'));
    }],
  ];
  for (const [name, check] of checks) { await check(); }
  return `${checks.length} word-input checks passed`;
}
module.exports = { run };
if (require.main === module) run().then(console.log).catch(error => { console.error(error); process.exitCode = 1; });
