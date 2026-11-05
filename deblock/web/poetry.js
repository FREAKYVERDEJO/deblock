// R.12: choose a poem from the writer's own words; the original stays intact.
(function (root) {
  'use strict';
  const get = id => document.getElementById(id);
  const tools = root.DeblockWritingTools;
  let source, selection;
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
  function preview() {
    selection.style = get('poetry-style').value;
    render(get('poetry-preview'), { ...source, blackout: selection });
    get('poetry-count').textContent = `${selection.kept.length} words kept`;
    get('poetry-line').textContent = tools.poemText(source, selection) || 'Choose a word to begin your poem.';
  }
  function picker() {
    get('poetry-words').replaceChildren();
    tools.poetryTokens(source).forEach((word, index) => {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = word;
      button.setAttribute('aria-pressed', String(selection.kept.includes(index)));
      button.addEventListener('click', () => {
        if (selection.kept.includes(index)) selection.kept = selection.kept.filter(value => value !== index);
        else selection.kept = [...selection.kept, index].sort((a, b) => a - b);
        button.setAttribute('aria-pressed', String(selection.kept.includes(index))); preview();
      });
      get('poetry-words').append(button);
    });
    preview();
  }
  get('open-poetry').addEventListener('click', () => {
    source = root.DeblockDocument.snapshot();
    if (source.story) return;
    if (!tools.poetryTokens(source).length) { get('export-status').textContent = 'Write a few words first, then choose a poem from them.'; return; }
    selection = source.blackout ? tools.copy(source.blackout) : { version: 1, style: 'highlight', kept: [] };
    get('poetry-style').value = selection.style;
    picker(); showDialog(get('poetry-dialog'));
  });
  get('poetry-style').addEventListener('change', preview);
  get('poetry-clear').addEventListener('click', () => { selection.kept = []; picker(); });
  get('poetry-apply').addEventListener('click', () => {
    root.DeblockDocument.setPoetry(selection); get('poetry-dialog').close(); get('open-poetry').focus();
  });
  get('poetry-original').addEventListener('click', () => {
    root.DeblockDocument.setPoetry(null); get('poetry-dialog').close(); get('open-poetry').focus();
  });
  root.DeblockPoetry = { render };
})(window);
