// Painting details have an explicit toolbar control; the backdrop is not a control.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function element() {
  return { dataset: {}, children: [], handlers: {}, decode: async () => {},
    classList: { remove() {}, toggle() {} },
    replaceChildren(...children) { this.children = children; },
    append(...children) { this.children.push(...children); },
    addEventListener(name, handler) { this.handlers[name] = handler; },
    setAttribute(name, value) { this[name] = value; },
  };
}
(async () => {
  const elements = new Map();
  const get = id => { if (!elements.has(id)) elements.set(id, { ...element(), id }); return elements.get(id); };
  const window = {};
  const items = ['one', 'two'].map(id => ({ id, title: id, license: 'CC0', src: `/assets/art/${id}.jpg` }));
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../deblock/web/art.js'), 'utf8'), {
    window, document: { body: element(), getElementById: get, createElement: element },
    fetch: async () => ({ ok: true, json: async () => items }),
  });
  await get('art-toggle').handlers.click();
  assert.equal(get('art-info').hidden, false);
  const [image, info] = get('writing-art').children;
  assert.equal(image.tabIndex, undefined, 'The fullscreen image is no longer a hidden focus target');
  assert.equal(image.onfocus, undefined);
  assert.equal(get('writing-art').onkeydown, undefined);
  assert.equal(info.id, 'painting-info');
  assert.equal(info.popover, 'auto');
  assert.equal(info.children[0].textContent, window.DeblockArt.snapshot().title);
  await get('art-next').handlers.click();
  assert.notEqual(get('writing-art').children[1].children[0].textContent, info.children[0].textContent);
  await get('art-toggle').handlers.click();
  assert.equal(get('art-info').hidden, true);
  assert.equal(get('writing-art').children.length, 0);
  await get('art-toggle').handlers.click();
  window.DeblockArt.setAvailable(false);
  assert.equal(get('art-info').hidden, true, 'Other writing modes must hide the painting control');
  console.log('PASS painting info: explicit control, no backdrop focus trigger, correct and refreshed credits, image-off/mode hiding');
})().catch(error => { console.error(error); process.exitCode = 1; });
