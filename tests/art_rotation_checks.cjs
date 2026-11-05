// Retired prompts must remain available to saved documents, but never shuffle in.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const items = [
  { id: 'painting-one', src: '/assets/art/painting-one.jpg', license: 'CC0' },
  { id: 'retired-sculpture', src: '/assets/art/retired-sculpture.jpg', license: 'CC0', inRotation: false },
  { id: 'painting-two', src: '/assets/art/painting-two.jpg', license: 'CC0' },
];
function element() {
  return { dataset: {}, children: [], handlers: {}, classList: { remove() {}, toggle() {} },
    replaceChildren(...children) { this.children = children; }, append(...children) { this.children.push(...children); },
    addEventListener(event, fn) { this.handlers[event] = fn; }, setAttribute() {},
  };
}
(async () => {
  const elements = new Map();
  const get = id => { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); };
  const window = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../deblock/web/art.js'), 'utf8'), {
    window, document: { body: element(), getElementById: get, createElement: element },
    fetch: async () => ({ ok: true, json: async () => items }),
  });
  await get('art-toggle').handlers.click();
  for (let i = 0; i < 6; i++) {
    assert.notEqual(window.DeblockArt.snapshot().id, 'retired-sculpture');
    await get('art-next').handlers.click();
  }
  const saved = element();
  await window.DeblockArt.renderSaved(saved, { id: 'retired-sculpture' });
  assert.equal(saved.children[0].src, '/assets/art/retired-sculpture.jpg');
  assert.equal(saved.hidden, false);
  console.log('2 rotation checks passed (retired prompts excluded, saved artwork preserved)');
})().catch(error => { console.error(error); process.exitCode = 1; });
