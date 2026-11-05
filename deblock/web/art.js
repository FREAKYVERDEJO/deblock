// A reviewed, local CC0 pool. No museum requests are made while writing.
(function (root) {
  'use strict';
  function createDeck(items, random = Math.random) {
    let bag = [], previous = null;
    return () => {
      if (!items.length) return null;
      if (!bag.length) {
        bag = [...items];
        for (let i = bag.length - 1; i > 0; i--) {
          const j = Math.floor(random() * (i + 1));
          [bag[i], bag[j]] = [bag[j], bag[i]];
        }
        if (bag.length > 1 && bag[bag.length - 1].id === previous) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
      }
      const item = bag.pop(); previous = item.id;
      return item;
    };
  }
  if (typeof module !== 'undefined') module.exports = { createDeck };
  if (typeof document === 'undefined') return;
  const get = id => document.getElementById(id);
  let catalogPromise, next, selected = null, enabled = false, busy = false;
  let infoId = 0;
  function catalog() {
    if (!catalogPromise) catalogPromise = fetch('/assets/art/catalog.json').then(response => {
      if (!response.ok) throw new Error('The image pool could not load.');
      return response.json();
    }).then(items => {
      if (!Array.isArray(items) || !items.length || items.some(item => item.license !== 'CC0' || !/^\/assets\/art\/[a-z0-9-]+\.jpg$/.test(item.src))) throw new Error('The image pool is invalid.');
      // Retired prompts stay resolvable for previously saved documents.
      next = createDeck(items.filter(item => item.inRotation !== false)); return items;
    }).catch(error => { catalogPromise = null; throw error; });
    return catalogPromise;
  }
  function addInfo(container, item) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'art-info'; button.textContent = 'ⓘ';
    button.setAttribute('aria-label', 'About this image'); button.setAttribute('aria-expanded', 'false');
    button.dataset.html2canvasIgnore = 'true';
    const info = document.createElement('figcaption');
    info.className = 'art-credit'; info.id = `art-credit-${++infoId}`;
    info.dataset.html2canvasIgnore = 'true';
    button.setAttribute('aria-controls', info.id);
    const title = document.createElement('strong'); title.textContent = item.title;
    const text = document.createElement('span');
    text.textContent = `${item.artist} · ${item.date}\n${item.culture}\n${item.museum}\nCC0 · ${item.credit}`;
    const source = document.createElement('a'); source.href = item.sourceUrl; source.textContent = 'museum record ↗'; source.target = '_blank'; source.rel = 'noopener noreferrer';
    info.append(title, text, source);
    button.addEventListener('click', () => {
      container.classList.remove('info-dismissed');
      const open = container.classList.toggle('info-open');
      button.setAttribute('aria-expanded', String(open));
      if (!open) { container.classList.toggle('info-dismissed', true); button.blur(); }
    });
    container.addEventListener('keydown', event => {
      if (event.key === 'Escape') { container.classList.remove('info-open'); button.setAttribute('aria-expanded', 'false'); container.classList.toggle('info-dismissed', true); button.blur(); event.stopPropagation(); }
    });
    container.addEventListener('pointerleave', () => container.classList.remove('info-dismissed'));
    button.addEventListener('focus', () => container.classList.remove('info-dismissed'));
    container.append(button, info);
  }
  function render(container, item) {
    container.replaceChildren(); container.hidden = !item;
    delete container.dataset.artError;
    container.classList.remove('info-open', 'info-dismissed');
    if (!item) return;
    const image = document.createElement('img');
    image.src = item.src; image.alt = `${item.title} — ${item.artist}`;
    image.addEventListener('error', () => { get('art-status').textContent = 'Image unavailable. Try another image, or switch images off.'; });
    container.append(image); addInfo(container, item);
  }
  function refresh() {
    get('art-toggle').ariaPressed = String(enabled);
    get('art-toggle').textContent = enabled ? 'image on' : 'image off';
    get('art-next').hidden = !enabled;
    document.body.classList.toggle('has-art', enabled);
    render(get('writing-art'), enabled ? selected : null);
    render(get('finish-art'), enabled ? selected : null);
  }
  async function change(shuffle) {
    if (busy) return;
    if (!shuffle && enabled) { enabled = false; refresh(); return; }
    busy = true; get('art-status').textContent = 'Loading image…';
    try {
      await catalog();
      if (shuffle || !selected) selected = next();
      enabled = true; refresh(); get('art-status').textContent = '';
    } catch (error) { get('art-status').textContent = error.message; }
    finally { busy = false; }
  }
  get('art-toggle').addEventListener('click', () => change(false));
  get('art-next').addEventListener('click', () => change(true));
  root.DeblockArt = {
    snapshot: () => enabled && selected ? { ...selected } : null,
    renderDocument: container => render(container, enabled ? selected : null),
    async renderSaved(container, item) {
      // Resolve saved IDs against the reviewed catalog, never arbitrary saved URLs.
      render(container, null);
      container.dataset.artId = item?.id || '';
      if (!item) return;
      try {
        const found = (await catalog()).find(work => work.id === item.id);
        if (container.dataset.artId !== item.id) return;
        if (!found) throw new Error('This saved image is no longer in the local pool.');
        render(container, found);
      } catch (error) {
        if (container.dataset.artId !== item.id) return;
        container.hidden = false; container.textContent = error.message;
        container.dataset.artError = 'true';
      }
    },
  };
})(typeof window === 'undefined' ? globalThis : window);
