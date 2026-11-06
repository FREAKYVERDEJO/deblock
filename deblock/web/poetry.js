// Blackout changes presentation only; the writer's original words stay intact.
(function (root) {
  'use strict';
  const get = id => document.getElementById(id);
  const tools = root.DeblockWritingTools;
  const surface = get('poetry-words');
  let source, selection, drag;
  let buttons = [];
  function render(container, entry) {
    if (!entry.blackout) return false;
    if (entry.blackout.version === 2) {
      const covered = new Set(entry.blackout.covered);
      container.replaceChildren();
      tools.poetryCharacters(entry).forEach((character, index) => {
        const span = document.createElement('span'); span.textContent = character;
        if (covered.has(index)) {
          span.className = 'poetry-redacted'; span.setAttribute('aria-hidden', 'true');
        }
        container.append(span);
      });
      return true;
    }
    const kept = new Set(entry.blackout.kept);
    container.replaceChildren();
    tools.poetryTokens(entry).forEach((word, index) => {
      const span = document.createElement('span'); span.textContent = word;
      if (kept.has(index) && entry.blackout.style === 'highlight') span.className = 'poetry-highlight';
      if (!kept.has(index) && entry.blackout.style === 'blackout') {
        span.className = 'poetry-redacted'; span.setAttribute('aria-hidden', 'true');
      }
      container.append(span, document.createTextNode(' '));
    });
    return true;
  }
  function refresh() {
    const covered = new Set(selection.covered);
    buttons.forEach((button, index) => button.setAttribute('aria-pressed', String(covered.has(index))));
    get('poetry-count').textContent = `${covered.size} characters blacked out. ${buttons.length - covered.size} characters visible.`;
  }
  function toggle(index) {
    if (selection.covered.includes(index)) selection.covered = selection.covered.filter(value => value !== index);
    else selection.covered = [...selection.covered, index].sort((a, b) => a - b);
    refresh();
  }
  function indexAt(element) {
    const button = element?.closest('button[data-character]');
    return button && surface.contains(button) ? Number(button.dataset.character) : null;
  }
  function coverRange(end) {
    const first = Math.min(drag.start, end), last = Math.max(drag.start, end);
    selection.covered = [...new Set([
      ...drag.covered,
      ...Array.from({ length: last - first + 1 }, (_, offset) => first + offset),
    ])].sort((a, b) => a - b);
    refresh();
  }
  surface.addEventListener('pointerdown', event => {
    const start = indexAt(event.target);
    if (start === null || event.button !== 0 || !event.isPrimary) return;
    event.preventDefault();
    buttons[start].focus({ preventScroll: true });
    drag = { start, end: start, covered: [...selection.covered], id: event.pointerId };
    surface.setPointerCapture(event.pointerId);
    toggle(start);
  });
  surface.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const end = indexAt(document.elementFromPoint(event.clientX, event.clientY));
    if (end === null || end === drag.end) return;
    drag.end = end;
    coverRange(end);
  });
  surface.addEventListener('pointerup', event => {
    if (!drag || drag.id !== event.pointerId) return;
    drag = null;
    surface.releasePointerCapture(event.pointerId);
  });
  function cancelDrag() {
    if (!drag) return;
    selection.covered = drag.covered; drag = null; refresh();
  }
  surface.addEventListener('pointercancel', cancelDrag);
  surface.addEventListener('lostpointercapture', cancelDrag);
  // Native button activation keeps the same operation available to keyboards and AT.
  surface.addEventListener('click', event => {
    const index = indexAt(event.target);
    if (index !== null && event.detail === 0) toggle(index);
  });
  function picker() {
    surface.replaceChildren();
    buttons = tools.poetryCharacters(source).map((character, index) => {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = character; button.dataset.character = index;
      if (character === ' ') {
        button.className = 'poetry-space';
        button.setAttribute('aria-label', `space, character ${index + 1}`);
      }
      surface.append(button);
      return button;
    });
    refresh();
  }
  get('open-poetry').addEventListener('click', () => {
    source = root.DeblockDocument.snapshot();
    if (source.story) return;
    const characters = tools.poetryCharacters(source);
    if (!characters.length) { get('export-status').textContent = 'Write a few words first, then choose a poem from them.'; return; }
    selection = tools.characterSelection(source, source.blackout);
    drag = null;
    get('poetry-help').open = false;
    picker(); showDialog(get('poetry-dialog'));
  });
  get('poetry-apply').addEventListener('click', () => {
    root.DeblockDocument.setPoetry(selection);
    get('poetry-dialog').close(); get('open-poetry').focus();
    get('save-entry').click();
  });
  get('poetry-original').addEventListener('click', () => {
    selection.covered = []; refresh();
  });
  root.DeblockPoetry = { render };
})(window);
