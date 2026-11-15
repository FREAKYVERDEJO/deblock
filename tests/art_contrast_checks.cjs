// Regression: bright edges outside a centered word must not choose its ink.
const assert = require('node:assert/strict');
const { textSampleBounds, chooseTextInk } = require('../deblock/web/art.js');
const field = { left: 0, top: 300, width: 1000, height: 130 };
const area = textSampleBounds(field, 200, 88);
assert.equal(area.left, 400);
assert.equal(area.width, 200);
assert.ok(area.top >= field.top && area.top + area.height <= field.top + field.height);
assert.equal(textSampleBounds(field, 2000, 88).width, 1000, 'Long text remains clipped to its field');
assert.equal(chooseTextInk([.01, .03, .05], true), '#fff', 'Dark paintings need white');
assert.equal(chooseTextInk([.65, .8, .95], true), '#000', 'Clearly bright backgrounds still need black');
assert.equal(chooseTextInk([.2, .2, .2], true), '#fff', 'Prefer white for a close serif-text decision');
assert.equal(chooseTextInk([.2, .2, .2], false), '#000', 'Small controls retain the stronger numerical choice');
assert.equal(chooseTextInk([], true), '#fff');
console.log('PASS text contrast: visible word bounds, clipping, dark/light backgrounds, white preference for close choices, independent controls');
