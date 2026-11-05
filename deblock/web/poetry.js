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
    const kept = new Set(selection.kept);
    buttons.forEach((button, index) => button.setAttribute('aria-pressed', String(!kept.has(index))));
    get('poetry-count').textContent = `${buttons.length - kept.size} words blacked out. ${kept.size} words kept.`;
  }
  function toggle(index) {
    if (selection.kept.includes(index)) selection.kept = selection.kept.filter(value => value !== index);
    else selection.kept = [...selection.kept, index].sort((a, b) => a - b);
    refresh();
  }
  function indexAt(element) {
    const button = element?.closest('button[data-word]');
    return button && surface.contains(button) ? Number(button.dataset.word) : null;
  }
  function coverRange(end) {
    const first = Math.min(drag.start, end), last = Math.max(drag.start, end);
    selection.kept = drag.kept.filter(index => index < first || index > last);
    refresh();
  }
  surface.addEventListener('pointerdown', event => {
    const start = indexAt(event.target);
    if (start === null || event.button !== 0 || !event.isPrimary) return;
    event.preventDefault();
    buttons[start].focus({ preventScroll: true });
    drag = { start, end: start, kept: [...selection.kept], id: event.pointerId };
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
    selection.kept = drag.kept; drag = null; refresh();
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
    buttons = tools.poetryTokens(source).map((word, index) => {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = word; button.dataset.word = index;
      surface.append(button, document.createTextNode(' '));
      return button;
    });
    refresh();
  }
  get('open-poetry').addEventListener('click', () => {
    source = root.DeblockDocument.snapshot();
    if (source.story) return;
    const tokens = tools.poetryTokens(source);
    if (!tokens.length) { get('export-status').textContent = 'Write a few words first, then choose a poem from them.'; return; }
    selection = source.blackout ? tools.copy(source.blackout) : { version: 1, kept: tokens.map((_, index) => index) };
    selection.style = 'blackout';
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
    selection.kept = buttons.map((_, index) => index); refresh();
  });
  root.DeblockPoetry = { render };
})(window);
