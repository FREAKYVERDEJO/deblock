// Screen shape selects a separate deck; archived images remain resolvable elsewhere.
const assert = require('node:assert/strict');
const { createResponsiveDeck } = require('../deblock/web/art.js');
const items = [
  { id: 'wide-one', orientation: 'landscape' },
  { id: 'wide-two', orientation: 'landscape' },
  { id: 'tall-one', orientation: 'portrait' },
  { id: 'tall-two', orientation: 'portrait' },
  { id: 'archived', orientation: 'landscape', inRotation: false },
];
let orientation = 'landscape';
const next = createResponsiveDeck(items, () => orientation, () => .37);
const first = next();
orientation = 'portrait';
const phone = [next(), next()];
assert.deepEqual(new Set(phone.map(item => item.id)), new Set(['tall-one', 'tall-two']));
assert.notEqual(next().id, phone.at(-1).id, 'Portrait deck must not repeat at its boundary');
orientation = 'landscape';
assert.notEqual(next().id, first.id, 'Returning to landscape continues its existing deck');
for (let n = 0; n < 20; n++) {
  const item = next();
  assert.equal(item.orientation, 'landscape');
  assert.notEqual(item.id, 'archived');
}
assert.equal(createResponsiveDeck([], () => 'portrait')(), null);
console.log('PASS responsive artwork: separate decks, rotation changes, coverage, no boundary repeats, retired exclusion, empty pool');
