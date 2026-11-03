// Run with node tests/export_checks.cjs [optional-sample-pdf-path].
const assert = require('node:assert/strict');
const { inflateSync } = require('node:zlib');
const { imagePdf } = require('../deblock/web/export.js');

async function run(fixturePath) {
  const pixels = new Uint8Array([255, 0, 0, 0, 255, 0, 0, 0, 255, 240, 235, 220]);
  const blob = await imagePdf(pixels, 2, 2, 200, 200);
  const bytes = Buffer.from(await blob.arrayBuffer());
  const text = bytes.toString('latin1');
  assert.ok(text.startsWith('%PDF-1.4'));
  assert.match(text, /\/MediaBox \[0 0 200.000 200.000\]/);
  assert.match(text, /\/Width 2 \/Height 2/);
  assert.match(text, /\/DeviceRGB/);
  const imageHeader = /4 0 obj\n[\s\S]*?\/Length (\d+) >>\nstream\n/.exec(text);
  const start = imageHeader.index + imageHeader[0].length;
  assert.deepEqual(inflateSync(bytes.subarray(start, start + Number(imageHeader[1]))), Buffer.from(pixels));
  const xref = Number(/startxref\n(\d+)/.exec(text)[1]);
  assert.equal(text.slice(xref, xref + 4), 'xref');
  const entries = text.slice(xref).split('\n').slice(3, 8);
  entries.forEach((entry, index) => {
    const offset = Number(entry.slice(0, 10));
    assert.ok(text.slice(offset).startsWith(`${index + 1} 0 obj`));
  });
  for (const args of [[pixels, 3, 2, 200, 200], [pixels, 2, 2, NaN, 200], [pixels, 2, 2, 200, 0]]) {
    await assert.rejects(imagePdf(...args), /Invalid image dimensions/);
  }
  if (fixturePath) require('node:fs').writeFileSync(fixturePath, bytes);
  return '4 visual-export checks passed (geometry, lossless pixels, PDF offsets, invalid inputs)';
}
module.exports = { run };
if (require.main === module) run(process.argv[2]).then(console.log).catch(error => { console.error(error); process.exitCode = 1; });
