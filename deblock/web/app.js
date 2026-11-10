// Unsaved words remain in memory; prompts are fetched from local assets.
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
let aphorism = null;
const textInput = byId('aphorism-text');
function focusWriter() {
  (aphorism?.mode === 'text' ? textInput : input).focus({ preventScroll: true });
}
function captureText() {
  if (aphorism?.mode === 'text') { words.splice(0, words.length, textInput.value); input.value = ''; }
}
window.DeblockDocument = {
  snapshot() {
    captureText();
    entryId ||= crypto.randomUUID();
    entryCreatedAt ||= new Date().toISOString();
    if (story) story = window.DeblockWritingTools.captureStory(story, words, input.value);
    if (blackout) {
      if (blackout.version === 2) {
        const count = window.DeblockWritingTools.poetryCharacters({ words, draft: input.value }).length;
        blackout.covered = blackout.covered.filter(index => index < count);
      } else {
        const count = window.DeblockWritingTools.poetryTokens({ words, draft: input.value }).length;
        blackout.kept = blackout.kept.filter(index => index < count);
      }
    }
    return { id: entryId, createdAt: entryCreatedAt, updatedAt: new Date().toISOString(),
      title: byId('document-title').textContent.trim(),
      words: story ? window.DeblockWritingTools.storyWords(story) : [...words],
      draft: story ? '' : input.value, arrows: showArrows, artwork: window.DeblockArt?.snapshot() || null,
      aphorism: aphorism ? { ...aphorism } : null,
      story: story ? window.DeblockWritingTools.copy(story) : null,
      blackout: blackout ? window.DeblockWritingTools.copy(blackout) : null,
      ...(entryRevision ? { revision: entryRevision } : {}) };
  },
  async load(entry) {
    // Resolve the prompt before replacing the current draft, so failed loads are safe.
    await window.DeblockAphorisms.render(byId('aphorism-prompt'), entry.aphorism);
    aphorism = entry.aphorism ? { ...entry.aphorism } : null;
    story = entry.story ? window.DeblockWritingTools.copy(entry.story) : null;
    blackout = entry.blackout ? window.DeblockWritingTools.copy(entry.blackout) : null;
    const passage = story ? story.passages[story.active] : entry;
    words.splice(0, words.length, ...passage.words);
    input.value = passage.draft || '';
    textInput.value = aphorism ? words.join('') + input.value : '';
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
  toggleText() {
    if (!aphorism || composing) return;
    if (aphorism.mode === 'word') {
      textInput.value = words.join('') + input.value;
      aphorism.mode = 'text';
    } else {
      captureText();
      aphorism.mode = 'word';
    }
    window.DeblockModes.refresh(); fitWords(); focusWriter();
  },
  focus: focusWriter,
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
  captureText();
  if (aphorism) return words.join('') + input.value;
  if (story) return window.DeblockWritingTools.storyText(window.DeblockWritingTools.captureStory(story, words, input.value), showArrows);
  const summary = [...words];
  if (input.value.trim()) {
    summary.push(input.value.trim());
  }
  return summary.join(showArrows ? ' → ' : ' ');
}

function renderSummary() {
  window.DeblockAphorisms.render(byId('finish-aphorism'), aphorism).catch(error => { byId('export-status').textContent = error.message; });
  window.DeblockArt?.renderDocument(byId('finish-art'));
  const summary = byId('chain-summary');
  summary.textContent = documentBody();
  summary.hidden = !summary.textContent;
  if (blackout) window.DeblockPoetry?.render(summary, window.DeblockDocument.snapshot());
  window.DeblockModes?.reviewState();
}

function fitWords() {
  const length = Math.max(input.value.length, 6);
  const size = Math.max(25, Math.min(88, space.clientWidth / (length * .6)));
  space.style.setProperty('--word-size', `${size}px`);
}

function remember(completed) {
  if (!completed.length) return;
  words.push(...(aphorism ? [completed.join(' ') + ' '] : completed));
  input.placeholder = '';
  byId('announcement').textContent = 'Next word.';
}

function consumeWhitespace() {
  if (!exercise || composing) return;
  if (aphorism) {
    // Add a boundary only when new writing follows prose without trailing space.
    if (input.value && words.length && /\S$/u.test(words.at(-1)) && /^\S/u.test(input.value)) words.push(' ');
    const end = input.value.search(/[^\s]*$/u);
    if (end > 0) { words.push(input.value.slice(0, end)); input.value = input.value.slice(end); }
    fitWords(); return;
  }
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
  if (aphorism) {
    if (combined && words.length && /\S$/u.test(words.at(-1)) && /^\S/u.test(combined)) words.push(' ');
    const end = combined.search(/[^\s]*$/u);
    if (end > 0) words.push(combined.slice(0, end));
    input.value = combined.slice(end); fitWords(); return;
  }
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
  if (event.key === 'Tab' && !story && !aphorism) finishWord(); // Story navigation retains unfinished input.
});
textInput.addEventListener('compositionstart', () => { composing = true; });
textInput.addEventListener('compositionend', () => { composing = false; });
byId('aphorism-toggle').addEventListener('click', () => window.DeblockDocument.toggleText());
byId('word-form').addEventListener('submit', (event) => {
  event.preventDefault();
  if (composing || !exercise || aphorism?.mode === 'text') return;
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
    if (!document.querySelector('dialog[open]')) focusWriter();
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
  const resetMode = story ? 'story' : aphorism ? 'aphorism' : 'free';
  if (aphorism) aphorism.mode = 'word';
  textInput.value = '';
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
  if (words.some(Boolean) || input.value || textInput.value || story || window.DeblockModes?.hasDrafts() || byId('document-title').textContent !== defaultTitle) {
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
    window.DeblockModes?.refresh();
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
