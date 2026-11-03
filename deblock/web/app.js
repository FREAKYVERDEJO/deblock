// Words remain in memory. Only exercise instructions are fetched from Python.
const byId = (id) => document.getElementById(id);
const input = byId('word');
const words = [];
const space = byId('word-space');
let exercise = null;
let composing = false;
let showArrows = true;
const defaultTitle = 'leave it here.';
let entryId = null;
let entryCreatedAt = null;
window.DeblockDocument = {
  snapshot() {
    entryId ||= crypto.randomUUID();
    entryCreatedAt ||= new Date().toISOString();
    return { id: entryId, createdAt: entryCreatedAt, updatedAt: new Date().toISOString(),
      title: byId('document-title').textContent.trim(), words: [...words], draft: input.value, arrows: showArrows };
  },
};

function documentBody() {
  const summary = [...words];
  if (input.value.trim()) {
    summary.push(showArrows ? `(${input.value} — unfinished)` : input.value.trim());
  }
  return summary.join(showArrows ? ' → ' : ' ');
}

function renderSummary() {
  byId('chain-summary').textContent = documentBody() || 'Nothing to finish. You can just be here.';
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
  if (event.key === 'Tab') finishWord(); // Preserve normal keyboard navigation.
});
byId('word-form').addEventListener('submit', (event) => {
  event.preventDefault();
  finishWord();
  input.focus();
});
// Compatibility for older embedded markup; the current page has one plain style.
byId('theme')?.addEventListener('change', (event) => {
  document.body.dataset.theme = event.target.value;
  window.dispatchEvent(new CustomEvent('themechange', { detail: event.target.value }));
  fitWords();
});
window.addEventListener('resize', fitWords);

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
byId('reset').addEventListener('click', () => showDialog(byId('reset-dialog')));
byId('cancel-reset').addEventListener('click', () => byId('reset-dialog').close());
byId('confirm-reset').addEventListener('click', () => {
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
  input.focus({ preventScroll: true });
});
byId('resume').addEventListener('click', () => byId('finish-dialog').close());
window.addEventListener('beforeunload', (event) => {
  if (words.length || input.value || byId('document-title').textContent !== defaultTitle) {
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
