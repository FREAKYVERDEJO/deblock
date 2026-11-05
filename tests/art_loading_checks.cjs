// Delayed decoding must never remove the visible image or publish a pending selection.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function element() {
  return { dataset: {}, children: [], handlers: {},
    classList: { remove() {}, toggle() {} },
    replaceChildren(...children) { this.children = children; },
    append(...children) { this.children.push(...children); },
    addEventListener(event, handler) { this.handlers[event] = handler; },
    setAttribute(name, value) { this[name] = value; },
  };
}
const flush = () => new Promise(resolve => setImmediate(resolve));

(async () => {
  const elements = new Map(), decoding = [];
  const get = id => {
    if (!elements.has(id)) elements.set(id, element());
    return elements.get(id);
  };
  const items = ['one', 'two', 'three'].map(id => ({ id, src: `/assets/art/${id}.jpg`, license: 'CC0' }));
  const window = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../deblock/web/art.js'), 'utf8'), {
    window, document: { body: element(), getElementById: get, createElement() {
      const node = element();
      node.decode = () => new Promise((resolve, reject) => decoding.push({ node, resolve, reject }));
      return node;
    } },
    fetch: async () => ({ ok: true, json: async () => items }),
  });
  const toggle = () => get('art-toggle').handlers.click();
  const another = () => get('art-next').handlers.click();
  const visible = () => get('writing-art').children[0];
  const snapshot = () => window.DeblockArt.snapshot();

  const first = toggle();
  await flush();
  assert.equal(snapshot(), null);
  decoding[0].resolve(); await first;
  const original = visible();
  assert.equal(original, decoding[0].node, 'Insert the decoded node itself');
  assert.equal(decoding.length, 2, 'Prepare just one image ahead');

  const pending = another(); await flush();
  await another(); // Rapid repeated clicks must not consume more of the deck.
  assert.equal(decoding.length, 2);
  assert.equal(visible(), original);
  assert.equal(snapshot().src, original.src);
  assert.equal(get('art-status').textContent, '', 'Do not flash a loading label');
  decoding[1].resolve(); await pending;
  assert.equal(visible(), decoding[1].node);
  assert.equal(snapshot().src, visible().src);

  const current = visible();
  decoding[2].reject(new Error('Broken image')); await flush();
  assert.equal(get('art-status').textContent, '', 'Background failures stay quiet');
  await another();
  assert.equal(visible(), current);
  assert.equal(snapshot().src, current.src);
  assert.match(get('art-status').textContent, /Image unavailable/);

  const cancelled = another(); await flush();
  await toggle();
  decoding[3].resolve(); await cancelled;
  assert.equal(snapshot(), null);
  assert.equal(get('writing-art').hidden, true, 'A late image cannot turn images back on');
  await toggle();
  assert.equal(visible(), current, 'Turning images back on retains the selected decoded node');
  await another();
  assert.equal(visible(), decoding[3].node, 'A new click can recover after cancellation');
  console.log('Image loading checks passed (decode-before-swap, preload, rapid clicks, failure retention, cancellation, recovery)');
})().catch(error => { console.error(error); process.exitCode = 1; });
