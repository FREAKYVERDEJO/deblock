// Words remain in memory. Only exercise instructions are fetched from Python.
const byId = (id) => document.getElementById(id);
const input = byId('word');
const words = [];
const previous = byId('previous-word');
const ghost = byId('ghost-word');
const space = byId('word-space');
let exercise = null;

function fitWords() {
  const length = Math.max(input.value.length, previous.textContent.length, 6);
  const size = Math.max(25, Math.min(128, space.clientWidth / (length * .42)));
  space.style.setProperty('--word-size', `${size}px`);
  const range = document.createRange();
  range.selectNodeContents(previous);
  const textWidth = Math.min(space.clientWidth, range.getBoundingClientRect().width + 12);
  byId('scribble').style.width = `${textWidth}px`;
  byId('scribble').style.left = `${(space.clientWidth - textWidth) / 2}px`;
}

function replaceWord() {
  const length = [...input.value.trim()].length;
  const oldLength = [...previous.textContent].length;
  const progress = oldLength ? Math.min(1, length / Math.max(4, Math.min(oldLength, 12))) : 0;
  space.style.setProperty('--progress', progress);
  byId('scribble').style.opacity = String(Math.sin(progress * Math.PI) * .65);
  const points = [];
  for (let i = 0; i < 220; i++) {
    const t = i / 219;
    const x = 30 + t * 540 + Math.sin(t * 150) * 11;
    const y = 48 + Math.cos(t * 150) * 23 + Math.sin(t * 37) * 7;
    points.push(`${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  byId('scribble-line').setAttribute('d', points.join(' '));
  fitWords();
}

input.addEventListener('input', replaceWord);
window.addEventListener('resize', fitWords);
byId('word-form').addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && event.isComposing) event.preventDefault();
});
byId('word-form').addEventListener('submit', (event) => {
  event.preventDefault();
  if (!exercise) return;
  const word = input.value.trim();
  if (!word) {
    byId('announcement').textContent = 'Type a word or phrase first.';
    input.focus();
    return;
  }
  ghost.textContent = previous.textContent;
  ghost.classList.remove('erasing');
  void ghost.offsetWidth;
  ghost.classList.add('erasing');
  words.push(word);
  previous.textContent = word;
  input.value = '';
  input.placeholder = '';
  replaceWord();
  byId('announcement').textContent = `${word}. What comes to mind next?`;
  input.focus();
});

function showDialog(dialog) {
  dialog.showModal();
  window.dispatchEvent(new CustomEvent('writingpause', { detail: true }));
}
for (const dialog of document.querySelectorAll('dialog')) {
  dialog.querySelector('.close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    window.dispatchEvent(new CustomEvent('writingpause', { detail: false }));
    input.focus({ preventScroll: true });
  });
}
byId('about').addEventListener('click', () => showDialog(byId('info-dialog')));
byId('finish').addEventListener('click', () => {
  const summary = [...words];
  if (input.value.trim()) summary.push(`(${input.value} — unfinished)`);
  byId('chain-summary').textContent = summary.length ? summary.join(' → ') : 'Nothing to finish. You can just be here.';
  showDialog(byId('finish-dialog'));
});
byId('resume').addEventListener('click', () => byId('finish-dialog').close());
byId('download').addEventListener('click', () => {
  const sections = [exercise?.title || 'The Signifier Chain', words.join(' → ')];
  if (input.value.trim()) sections.push(`Unfinished link: ${input.value}`);
  const url = URL.createObjectURL(new Blob([sections.join('\n\n') + '\n'], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'deblock-signifier-chain.txt';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
window.addEventListener('beforeunload', (event) => {
  if (words.length || input.value) { event.preventDefault(); event.returnValue = ''; }
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
    byId('hint').textContent = 'type a word · enter · follow it';
    input.disabled = false;
    byId('next').disabled = false;
    if (document.activeElement === document.body) input.focus({ preventScroll: true });
  } catch {
    byId('hint').textContent = 'exercise unavailable · open ? to retry';
    byId('instructions').textContent = 'Check that the local server is running, then try again.';
    byId('retry').hidden = false;
  }
}
byId('retry').addEventListener('click', loadExercise);
loadExercise();
fitWords();
