// Writing lives only in this tab. Only exercise metadata is requested from Python.
const byId = (id) => document.getElementById(id);
const words = [];
const input = byId('word');
const form = byId('word-form');
const chain = byId('chain');
let exercise = null;
let finished = false;

async function loadExercise() {
  byId('retry').hidden = true;
  try {
    const response = await fetch('/api/exercises/free_association');
    if (!response.ok) throw new Error('Exercise unavailable');
    const data = await response.json();
    if (typeof data.title !== 'string' || typeof data.instructions !== 'string') {
      throw new Error('Invalid exercise');
    }
    exercise = data;
    byId('exercise-title').textContent = exercise.title;
    byId('instructions').textContent = exercise.instructions;
    input.disabled = false;
    byId('add-word').disabled = false;
    byId('finish').disabled = false;
  } catch {
    byId('exercise-title').textContent = 'Your exercise couldn’t load.';
    byId('instructions').textContent = 'Check that the local deblock server is running, then try again.';
    byId('retry').hidden = false;
    byId('announcement').textContent = 'The exercise could not load. Use Try loading again.';
  }
}

form.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && event.isComposing) event.preventDefault();
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!exercise || finished) return;
  const word = input.value.trim();
  if (!word) {
    byId('announcement').textContent = 'Type a word or phrase to begin your next link.';
    input.focus();
    return;
  }
  words.push(word);
  const link = document.createElement('li');
  link.textContent = word;
  chain.append(link);
  chain.scrollTop = chain.scrollHeight;
  byId('empty-chain').hidden = true;
  byId('current-word').textContent = word;
  byId('current-word').scrollTop = 0;
  byId('prompt-label').textContent = 'ONE THING LEADS TO ANOTHER';
  byId('prompt-hint').textContent = 'What does this bring to mind? Follow that.';
  byId('chain-count').textContent = `${String(words.length).padStart(2, '0')} ${words.length === 1 ? 'LINK' : 'LINKS'}`;
  byId('chain-caption').textContent = 'Follow a sound, a feeling, a stray thought.';
  byId('announcement').textContent = `Link ${words.length} added. What does ${word} bring to mind?`;
  input.value = '';
  input.placeholder = 'And then…';
  input.focus();
});

byId('finish').addEventListener('click', () => {
  finished = true;
  byId('writing-area').hidden = true;
  byId('finished').hidden = false;
  byId('finish').hidden = true;
  byId('saved-draft').hidden = !input.value.trim();
  byId('session-label').textContent = 'ROOM TO PAUSE';
  byId('finished-title').focus({ preventScroll: true });
});

byId('resume').addEventListener('click', () => {
  finished = false;
  byId('finished').hidden = true;
  byId('writing-area').hidden = false;
  byId('finish').hidden = false;
  byId('session-label').textContent = 'YOUR OWN PACE';
  input.focus({ preventScroll: true });
});

byId('download').addEventListener('click', () => {
  const sections = [exercise.title, words.join(' → ')];
  if (input.value.trim()) sections.push(`Unfinished link: ${input.value}`);
  if (byId('reflection').value.trim()) sections.push(byId('reflection').value);
  const url = URL.createObjectURL(new Blob([sections.join('\n\n') + '\n'], { type: 'text/plain;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'deblock-signifier-chain.txt';
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  byId('announcement').textContent = 'Your writing download has been requested.';
});

// Keep the writer in control if they accidentally refresh or close a filled tab.
window.addEventListener('beforeunload', (event) => {
  if (words.length || input.value || byId('reflection').value) {
    event.preventDefault();
    event.returnValue = '';
  }
});

byId('retry').addEventListener('click', loadExercise);
loadExercise();
