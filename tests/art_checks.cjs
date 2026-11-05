const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { createDeck } = require('../deblock/web/art.js');
const catalog = JSON.parse(fs.readFileSync(require('node:path').join(__dirname, '../deblock/web/assets/art/catalog.json'), 'utf8'));
function element() {
  const classes = new Set();
  return { dataset: {}, hidden: false, children: [], handlers: {}, decode: async () => {},
    classList: { remove(name) { classes.delete(name); }, toggle(name, force) { const add = force ?? !classes.has(name); add ? classes.add(name) : classes.delete(name); return add; } },
    replaceChildren(...children) { this.children = children; }, append(...children) { this.children.push(...children); },
    addEventListener(name, fn) { this.handlers[name] = fn; }, setAttribute(name, value) { this[name] = value; }, blur() {},
  };
}
async function run() {
  const deck = createDeck(catalog, () => .37);
  const first = Array.from({ length: catalog.length }, deck);
  assert.equal(new Set(first.map(item => item.id)).size, catalog.length);
  assert.notEqual(deck().id, first.at(-1).id);
  assert.equal(createDeck([])(), null);
  assert.equal(createDeck([catalog[0]])().id, catalog[0].id);
  const elements = new Map();
  const get = id => { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); };
  const window = {};
  const context = vm.createContext({ window, document: { body: element(), getElementById: get, createElement: element }, fetch: async () => ({ ok: true, json: async () => catalog }) });
  vm.runInContext(fs.readFileSync(require('node:path').join(__dirname, '../deblock/web/art.js'), 'utf8'), context);
  await get('art-toggle').handlers.click();
  const selected = window.DeblockArt.snapshot();
  assert.ok(selected.id); assert.equal(get('writing-art').hidden, false);
  selected.title = 'mutated'; assert.notEqual(window.DeblockArt.snapshot().title, 'mutated');
  await get('art-toggle').handlers.click(); assert.equal(window.DeblockArt.snapshot(), null);
  await get('art-toggle').handlers.click(); assert.equal(window.DeblockArt.snapshot().id, selected.id);
  await get('art-next').handlers.click(); assert.notEqual(window.DeblockArt.snapshot().id, selected.id);
  const saved = element();
  await window.DeblockArt.renderSaved(saved, selected);
  assert.equal(saved.children[0].src, catalog.find(item => item.id === selected.id).src);
  await window.DeblockArt.renderSaved(saved, null); assert.equal(saved.hidden, true);
  await window.DeblockArt.renderSaved(saved, { id:'not-in-pool', src:'https://untrusted.example/image.jpg' });
  assert.equal(saved.dataset.artError, 'true'); assert.equal(saved.children.length, 0);
  console.log('7 artwork checks passed (deck coverage, no boundary repeats, empty/single pool, toggle retention, snapshot isolation, shuffle, saved-image validation)');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
