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
  let available = true;
  let selectedImage = null, upcoming = null, requestId = 0;
  let failedRestore = null;
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
  async function prepare(item) {
    const image = document.createElement('img');
    image.alt = `${item.title} — ${item.artist}`;
    image.src = item.src;
    try {
      await image.decode();
      return { item, image };
    } catch {
      // Keep background preload failures quiet until this image is requested.
      return { error: 'Image unavailable. Try another image, or switch images off.' };
    }
  }
  function preloadNext() {
    if (!upcoming) {
      const item = next();
      if (item) upcoming = prepare(item);
    }
  }
  function render(container, item, preparedImage = null) {
    container.replaceChildren(); container.hidden = !item;
    delete container.dataset.artError;
    container.classList.remove('info-open', 'info-dismissed');
    if (!item) return;
    const image = preparedImage || document.createElement('img');
    if (!preparedImage) { image.src = item.src; image.alt = `${item.title} — ${item.artist}`; }
    image.addEventListener('error', () => { get('art-status').textContent = 'Image unavailable. Try another image, or switch images off.'; });
    container.append(image); addInfo(container, item);
  }
  function refresh() {
    get('art-toggle').hidden = !available;
    get('art-toggle').ariaPressed = String(enabled);
    get('art-toggle').textContent = enabled ? 'image on' : 'image off';
    get('art-next').hidden = !available || !enabled;
    document.body.classList.toggle('has-art', available && enabled);
    render(get('writing-art'), available && enabled ? selected : null, selectedImage);
    root.DeblockArt.renderDocument(get('finish-art'));
  }
  async function change(shuffle) {
    if (!available) return;
    if (!shuffle && (enabled || busy)) {
      requestId++; busy = false; enabled = false;
      get('art-next').setAttribute('aria-disabled', 'false');
      get('art-status').textContent = '';
      refresh(); return;
    }
    if (busy) return;
    const request = ++requestId;
    busy = true;
    get('art-next').setAttribute('aria-disabled', 'true');
    get('art-status').textContent = '';
    try {
      await catalog();
      if (request !== requestId) return;
      if (shuffle || !selected) {
        preloadNext();
        if (!upcoming) throw new Error('No images are available.');
        const prepared = await upcoming;
        if (request !== requestId) return;
        upcoming = null;
        if (prepared.error) throw new Error(prepared.error);
        selected = prepared.item; selectedImage = prepared.image;
      }
      failedRestore = null;
      enabled = true; refresh(); get('art-status').textContent = '';
      preloadNext();
    } catch (error) {
      if (request === requestId) get('art-status').textContent = error.message;
    } finally {
      if (request === requestId) {
        busy = false; get('art-next').setAttribute('aria-disabled', 'false');
      }
    }
  }
  get('art-toggle').addEventListener('click', () => change(false));
  get('art-next').addEventListener('click', () => change(true));
  root.DeblockArt = {
    setAvailable(value) {
      if (available === Boolean(value)) return;
      available = Boolean(value);
      if (!available) {
        requestId++; busy = false;
        get('art-status').textContent = '';
      }
      refresh();
    },
    async restore(item) {
      const request = ++requestId;
      busy = true;
      failedRestore = null;
      try {
        if (!item) { selected = null; selectedImage = null; enabled = false; refresh(); return; }
        const found = (await catalog()).find(work => work.id === item.id);
        if (!found) throw new Error('This saved image is no longer in the local pool.');
        const prepared = await prepare(found);
        if (request !== requestId) return;
        if (prepared.error) throw new Error(prepared.error);
        selected = found; selectedImage = prepared.image; enabled = true; refresh();
      } catch (error) {
        if (request === requestId) {
          // Preserve the saved artwork reference; failed decoding must not erase it on save.
          failedRestore = { id: item.id, error: error.message };
          selected = null; selectedImage = null; enabled = true; refresh();
          get('art-status').textContent = error.message;
        }
      } finally { if (request === requestId) busy = false; }
    },
    // Keep the selection for toggling back on, but omit it from image-off saves.
    snapshot: () => enabled && failedRestore ? { id: failedRestore.id } : enabled && selected ? { ...selected } : null,
    renderDocument(container) {
      render(container, enabled ? selected : null);
      if (enabled && failedRestore) {
        container.hidden = false; container.textContent = failedRestore.error;
        container.dataset.artError = 'true';
      }
    },
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
