// Words remain in memory. Only exercise instructions are fetched from Python.
const byId = (id) => document.getElementById(id);
const input = byId('word');
const words = [];
const space = byId('word-space');
let exercise = null;
let composing = false;
let showArrows = true;
const defaultTitle = 'Untitled';
let entryId = null;
let entryCreatedAt = null;
let entryRevision = null;
let story = null;
let blackout = null;
window.DeblockDocument = {
  snapshot() {
    entryId ||= crypto.randomUUID();
    entryCreatedAt ||= new Date().toISOString();
    if (story) story = window.DeblockWritingTools.captureStory(story, words, input.value);
    if (blackout) {
      const count = window.DeblockWritingTools.poetryTokens({ words, draft: input.value }).length;
      blackout.kept = blackout.kept.filter(index => index < count);
    }
    return { id: entryId, createdAt: entryCreatedAt, updatedAt: new Date().toISOString(),
      title: byId('document-title').textContent.trim(),
      words: story ? window.DeblockWritingTools.storyWords(story) : [...words],
      draft: story ? '' : input.value, arrows: showArrows, artwork: window.DeblockArt?.snapshot(true) || null,
      story: story ? window.DeblockWritingTools.copy(story) : null,
      blackout: blackout ? window.DeblockWritingTools.copy(blackout) : null,
      ...(entryRevision ? { revision: entryRevision } : {}) };
  },
  async load(entry) {
    story = entry.story ? window.DeblockWritingTools.copy(entry.story) : null;
    blackout = entry.blackout ? window.DeblockWritingTools.copy(entry.blackout) : null;
    const passage = story ? story.passages[story.active] : entry;
    words.splice(0, words.length, ...passage.words);
    input.value = passage.draft || '';
    input.placeholder = words.length ? '' : 'a word…';
    entryId = entry.id || null; entryCreatedAt = entry.createdAt || null;
    entryRevision = entry.revision || null;
    byId('document-title').textContent = entry.title || defaultTitle;
    showArrows = entry.arrows ?? true;
    byId('arrows-toggle').ariaPressed = String(showArrows);
    byId('arrows-toggle').textContent = showArrows ? 'arrows on' : 'arrows off';
    byId('export-status').textContent = '';
    composing = false;
    fitWords();
    window.DeblockModes?.refresh();
    await window.DeblockArt?.restore(entry.artwork || null);
  },
  movePassage(active) {
    if (!story || composing) return;
    story = window.DeblockWritingTools.moveStory(window.DeblockWritingTools.captureStory(story, words, input.value), active);
    words.splice(0, words.length, ...story.passages[active].words);
    input.value = story.passages[active].draft;
    input.placeholder = words.length ? '' : 'a word…';
    fitWords(); window.DeblockModes?.refresh(); input.focus({ preventScroll: true });
  },
  setPoetry(value) { blackout = value ? window.DeblockWritingTools.copy(value) : null; renderSummary(); },
  saved(entry) { if (entry.id === entryId) entryRevision = entry.revision || null; },
  review() { renderSummary(); showDialog(byId('finish-dialog')); },
};

function documentBody() {
  if (story) return window.DeblockWritingTools.storyText(window.DeblockWritingTools.captureStory(story, words, input.value), showArrows);
  const summary = [...words];
  if (input.value.trim()) {
    summary.push(input.value.trim());
  }
  return summary.join(showArrows ? ' → ' : ' ');
}

function renderSummary() {
  window.DeblockArt?.renderDocument(byId('finish-art'));
  byId('chain-summary').textContent = documentBody() || 'Nothing to finish. You can just be here.';
  if (blackout) window.DeblockPoetry?.render(byId('chain-summary'), window.DeblockDocument.snapshot());
  window.DeblockModes?.reviewState();
}

function fitWords() {
  const length = Math.max(input.value.length, 6);
  const size = Math.max(25, Math.min(88, space.clientWidth / (length * .6)));
  space.style.setProperty('--word-size', `${size}px`);
}

function remember(completed) {
  if (!completed.length) return;
  words.push(...completed);
  input.placeholder = '';
  byId('announcement').textContent = 'Next word.';
}

function consumeWhitespace() {
  if (!exercise || composing) return;
  if (/\s/u.test(input.value)) {
    const parts = input.value.split(/\s+/u);
    const remainder = parts.pop();
    remember(parts.filter(Boolean));
    input.value = remainder;
  }
  fitWords();
}

function finishWord() {
  if (!exercise || composing) return;
  remember(input.value.split(/\s+/u).filter(Boolean));
  input.value = '';
  fitWords();
}

input.addEventListener('input', (event) => {
  if (!event.isComposing) consumeWhitespace();
});
input.addEventListener('compositionstart', () => { composing = true; });
input.addEventListener('compositionend', () => { composing = false; consumeWhitespace(); });
// A text input would otherwise remove pasted newlines before we could split them.
input.addEventListener('paste', (event) => {
  if (composing || !exercise || !event.clipboardData) return;
  event.preventDefault();
  const text = event.clipboardData.getData('text');
  const combined = input.value.slice(0, input.selectionStart) + text + input.value.slice(input.selectionEnd);
  const parts = combined.split(/\s+/u);
  const remainder = parts.pop();
  remember(parts.filter(Boolean));
  input.value = remainder;
  fitWords();
});
input.addEventListener('keydown', (event) => {
  if (event.isComposing || composing) {
    if (event.key === 'Enter') event.preventDefault();
    return;
  }
  if (event.key === 'Tab' && !story) finishWord(); // Story navigation retains unfinished input.
});
byId('word-form').addEventListener('submit', (event) => {
  event.preventDefault();
  if (composing || !exercise) return;
  finishWord();
  if (story) byId('next-beat').click();
  else input.focus();
});
// Compatibility for older embedded markup; the current page has one plain style.
byId('theme')?.addEventListener('change', (event) => {
  document.body.dataset.theme = event.target.value;
  window.dispatchEvent(new CustomEvent('themechange', { detail: event.target.value }));
  fitWords();
});
window.addEventListener('resize', fitWords);
const siteMenu = byId('site-menu');
window.addEventListener('click', event => {
  if (siteMenu && !siteMenu.contains(event.target)) siteMenu.open = false;
});
window.addEventListener('keydown', event => {
  if (event.key === 'Escape' && siteMenu?.open) {
    siteMenu.open = false;
    siteMenu.querySelector('summary').focus();
  }
});

function showDialog(dialog) {
  dialog.showModal();
  window.dispatchEvent(new CustomEvent('writingpause', { detail: true }));
}
for (const dialog of document.querySelectorAll('dialog')) {
  dialog.querySelector('.close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    window.dispatchEvent(new CustomEvent('writingpause', { detail: false }));
    if (!document.querySelector('dialog[open]')) input.focus({ preventScroll: true });
  });
}
byId('about').addEventListener('click', () => showDialog(byId('info-dialog')));
byId('finish').addEventListener('click', () => {
  renderSummary();
  showDialog(byId('finish-dialog'));
});
byId('arrows-toggle').addEventListener('click', () => {
  showArrows = !showArrows;
  byId('arrows-toggle').ariaPressed = String(showArrows);
  byId('arrows-toggle').textContent = showArrows ? 'arrows on' : 'arrows off';
  renderSummary();
});
byId('reset').addEventListener('click', () => {
  byId('reset-description').textContent = story
    ? 'This clears this story’s beats and passages and opens a new outline. Save under done first if you want to keep it. Your saved entries and free-association draft stay intact.'
    : 'This clears your words in this tab. Save them under done first if you want to keep them. Your Library and Gallery stay saved.';
  showDialog(byId('reset-dialog'));
});
byId('cancel-reset').addEventListener('click', () => byId('reset-dialog').close());
byId('confirm-reset').addEventListener('click', async () => {
  const resetMode = story ? 'story' : 'free';
  story = null;
  blackout = null;
  entryRevision = null;
  words.length = 0;
  entryId = null;
  entryCreatedAt = null;
  input.value = '';
  input.placeholder = 'a word…';
  composing = false;
  byId('chain-summary').textContent = '';
  byId('document-title').textContent = defaultTitle;
  byId('export-status').textContent = '';
  byId('announcement').textContent = 'Cleared. Start with a new word.';
  fitWords();
  byId('reset-dialog').close();
  await window.DeblockModes?.reset?.(resetMode);
  if (resetMode === 'free') input.focus({ preventScroll: true });
});
byId('resume').addEventListener('click', () => byId('finish-dialog').close());
window.addEventListener('beforeunload', (event) => {
  if (words.length || input.value || story || window.DeblockModes?.hasDrafts() || byId('document-title').textContent !== defaultTitle) {
    event.preventDefault(); event.returnValue = '';
  }
});

async function loadExercise() {
  byId('retry').hidden = true;
  try {
    const response = await fetch('/api/exercises/free_association');
    if (!response.ok) throw new Error('Exercise unavailable');
    const data = await response.json();
    if (typeof data.title !== 'string' || typeof data.instructions !== 'string') throw new Error('Invalid exercise');
    exercise = data;
    byId('exercise-title').textContent = exercise.title;
    byId('instructions').textContent = exercise.instructions;
    byId('hint').hidden = true;
    input.disabled = false;
    if (document.activeElement === document.body) input.focus({ preventScroll: true });
  } catch {
    byId('hint').hidden = false;
    byId('hint').textContent = 'exercise unavailable · open ? to retry';
    byId('instructions').textContent = 'Check that the local server is running, then try again.';
    byId('retry').hidden = false;
  }
}
byId('retry').addEventListener('click', loadExercise);
loadExercise();
fitWords();
