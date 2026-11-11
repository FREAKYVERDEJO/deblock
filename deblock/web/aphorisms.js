// The bundled catalog is the only source of prompt text and attribution.
(function (root) {
  'use strict';
  let catalog;
  function daily(items, date = new Date()) {
    // Calendar arithmetic avoids DST changing the rotation halfway through a day.
    const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
    return items[((day % items.length) + items.length) % items.length];
  }
  async function load() {
    if (!catalog) {
      const response = await fetch('/assets/deblock_aotd_100_curated.json');
      if (!response.ok) throw new Error('Aphorisms are unavailable. Open the menu to try again.');
      const data = await response.json();
      if (!Array.isArray(data.items) || !data.items.length) throw new Error('The aphorism collection is empty.');
      catalog = data.items;
    }
    return catalog;
  }
  async function create() {
    const item = daily(await load());
    return { title: 'Untitled', words: [], draft: '', arrows: false, artwork: null,
      story: null, blackout: null, aphorism: { version: 1, id: item.id, mode: 'word' } };
  }
  async function render(container, value) {
    if (!value) { container.replaceChildren(); container.hidden = true; return; }
    const items = await load();
    const item = items.find(item => item.id === value.id);
    if (!item) throw new Error('This saved aphorism is unavailable. Your writing is still intact.');
    const quote = document.createElement('blockquote');
    quote.textContent = `“${item.text}”`;
    const caption = document.createElement('figcaption');
    caption.append(document.createTextNode(`— ${item.author}, `));
    const source = document.createElement('a');
    source.textContent = [item.work, item.source_locator].filter(Boolean).join(', ');
    const url = item.citation?.source_url;
    if (url && /^https?:\/\//.test(url)) { source.href = url; source.target = '_blank'; source.rel = 'noopener noreferrer'; }
    caption.append(source);
    container.replaceChildren(quote, caption);
    container.hidden = false;
    if (container.id === 'aphorism-prompt') {
      try { await refreshBookmark(value.id); }
      catch { document.getElementById('bookmark-status').textContent = 'Bookmarks are unavailable. Try again when storage is accessible.'; }
    }
  }
  let activeId, bookmarkBusy = false;
  async function refreshBookmark(id = activeId) {
    activeId = id;
    const button = document.getElementById('bookmark-aphorism');
    if (!button || !id) return;
    const saved = Boolean(await root.DeblockStorage.get('aphorisms', id));
    if (id !== activeId) return;
    button.setAttribute('aria-pressed', String(saved));
    button.setAttribute('aria-label', saved ? 'Remove saved aphorism' : 'Save aphorism');
    button.title = saved ? 'Remove aphorism from library' : 'Save aphorism to library';
  }
  async function setSaved(id, saved) {
    const store = root.DeblockStorage;
    if (saved) await store.put('aphorisms', {id, updatedAt: new Date().toISOString()});
    else await store.remove('aphorisms', id);
    root.DeblockResearch?.bookmark(id, saved);
    await refreshBookmark();
  }
  if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('bookmark-aphorism');
    button.addEventListener('click', async () => {
      if (bookmarkBusy || !activeId) return;
      bookmarkBusy = true; button.disabled = true;
      const id = activeId;
      const status = document.getElementById('bookmark-status');
      try {
        const saved = !await root.DeblockStorage.get('aphorisms', id);
        await setSaved(id, saved);
        status.textContent = saved ? 'Aphorism saved to library.' : 'Aphorism removed from library.';
      } catch (error) { status.textContent = 'Couldn’t save the aphorism. ' + error.message; }
      finally { bookmarkBusy = false; button.disabled = false; }
    });
  });
  root.DeblockAphorisms = { create, render, daily, setSaved };
  if (typeof module !== 'undefined') module.exports = { daily };
})(typeof window === 'undefined' ? globalThis : window);
