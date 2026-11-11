// Story completion and chapter presentation, with detached synthetic writing.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { randomUUID } = require('node:crypto');

function element() {
  let text = '';
  const classes = new Set();
  return {
    value: '', children: [], dataset: {}, handlers: {}, clientWidth: 600,
    classList: {
      toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); },
      contains(name) { return classes.has(name); },
    },
    style: { setProperty() {} },
    get textContent() { return text + this.children.map(child => child.textContent).join(''); },
    set textContent(value) { text = String(value); this.children = []; },
    addEventListener(type, handler) { this.handlers[type] = handler; },
    append(...nodes) { this.children.push(...nodes); },
    replaceChildren(...nodes) { text = ''; this.children = nodes; },
    setAttribute(name, value) { this[name] = value; },
    focus() {}, close() { this.open = false; },
    showModal() { this.open = true; },
    click() { if (!this.disabled) return this.handlers.click?.(); },
  };
}

module.exports = (async () => {
  const elements = new Map();
  const get = id => {
    if (!elements.has(id)) elements.set(id, element());
    return elements.get(id);
  };
  get('document-title').textContent = 'Untitled';
  const window = {
    addEventListener() {}, dispatchEvent() {},
    DeblockAphorisms: { render: async () => {} },
    DeblockArt: { snapshot: () => null, restore: async () => {}, renderDocument() {}, setAvailable() {} },
  };
  const document = { body: element(), getElementById: get, querySelectorAll: () => [], createElement: element };
  const context = vm.createContext({ window, document, crypto: { randomUUID }, CustomEvent: class {},
    fetch: async () => ({ ok: true, json: async () => ({ title: 'The Signifier Chain', instructions: 'Write freely.' }) }),
  });
  for (const name of ['writing-tools', 'app', 'modes']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../deblock/web', `${name}.js`), 'utf8'), context);
  }
  await vm.runInContext('loadExercise()', context);
  const tools = window.DeblockWritingTools;
  const load = story => window.DeblockDocument.load({ words: [], draft: '', arrows: false, story });
  const enter = () => get('word-form').handlers.submit({ preventDefault() {} });

  await load(tools.createStory('Leaving <script>literal</script>\nStation\nArrival'));
  get('word').value = 'first connection'; enter();
  assert.equal(window.DeblockDocument.snapshot().story.active, 1);
  assert.equal(Boolean(get('finish-dialog').open), false);
  assert.equal(get('next-beat').disabled, false);
  assert.match(get('next-beat').textContent, /finish story/);
  get('word').value = 'the last word'; enter();
  assert.equal(get('finish-dialog').open, true, 'final Enter must open the finished story');
  const chapters = get('chain-summary').children;
  assert.equal(chapters.length, 2);
  assert.equal(chapters[0].children[0].textContent, 'Leaving <script>literal</script> → Station');
  assert.equal(chapters[0].children[0].children.length, 0, 'event titles are literal text');
  assert.equal(chapters[0].children[1].textContent, 'first connection');
  assert.equal(chapters[1].children[0].textContent, 'Station → Arrival');
  assert.equal(chapters[1].children[1].textContent, 'the last word');
  assert.equal(window.DeblockDocument.snapshot().story.passages[1].words.at(-1), 'word');

  const savedView = element();
  window.DeblockModes.renderStory(savedView, window.DeblockDocument.snapshot());
  assert.equal(savedView.textContent, get('chain-summary').textContent, 'saved stories use the same chapters');
  get('arrows-toggle').click();
  assert.equal(get('chain-summary').children[1].children[1].textContent, 'the → last → word');
  get('resume').click();
  get('previous-beat').click();
  assert.equal(window.DeblockDocument.snapshot().story.active, 0);
  get('word').value = 'unfinished'; get('finish').click();
  assert.equal(get('chain-summary').children[0].children[1].textContent, 'first → connection → unfinished');

  get('resume').click();
  await load(tools.createStory('Beginning\nMiddle\nEnd'));
  get('finish').click();
  assert.equal(get('chain-summary').hidden, false, 'early review includes empty chapters');
  assert.equal(get('chain-summary').children.length, 2);
  assert.ok(get('chain-summary').children.every(chapter => chapter.children[1].textContent === ''));

  get('resume').click();
  await load(tools.createStory('Start\nEnd'));
  get('word').value = '変換中';
  get('word').handlers.compositionstart(); enter();
  assert.equal(get('finish-dialog').open, false, 'IME confirmation must not finish the story');
  get('word').handlers.compositionend(); enter();
  assert.equal(get('finish-dialog').open, true);
  assert.equal(get('chain-summary').children[0].children[1].textContent, '変換中');

  get('resume').click();
  await load(null);
  get('word').value = 'free association'; enter();
  assert.equal(get('finish-dialog').open, false, 'free association keeps its existing Enter behavior');
  get('finish').click();
  assert.equal(get('chain-summary').textContent, 'free association');
  assert.equal(get('chain-summary').classList.contains('story-chapters'), false);
  console.log('PASS: final Enter, last word, ordered/literal chapters, saved presentation, arrows, resume, empty chapters, IME, free association');
})();
if (require.main === module) module.exports.catch(error => { console.error(error); process.exitCode = 1; });
