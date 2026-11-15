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
  function createResponsiveDeck(items, orientation, random = Math.random) {
    const decks = new Map();
    return () => {
      const shape = orientation();
      if (!decks.has(shape)) {
        decks.set(shape, createDeck(items.filter(item => item.inRotation !== false &&
          (!item.orientation || item.orientation === shape)), random));
      }
      return decks.get(shape)();
    };
  }
  function textSampleBounds(field, textWidth, fontSize) {
    const width = Math.min(field.width, Math.max(1, textWidth));
    const height = Math.min(field.height, fontSize * .8);
    return { left: field.left + (field.width - width) / 2,
      top: field.top + (field.height - height) / 2, width, height };
  }
  function chooseTextInk(luminances, preferWhite = false) {
    if (!luminances.length) return '#fff';
    const score = white => luminances.reduce((sum, light) => {
      const ratio = white ? 1.05 / (light + .05) : (light + .05) / .05;
      return sum + Math.min(ratio, 7);
    }, 0);
    // Thin writing looks clearer in white on busy midtones. Keep white for
    // close choices; use black when it provides a substantial contrast gain.
    return score(true) >= score(false) * (preferWhite ? .8 : 1) ? '#fff' : '#000';
  }
  if (typeof module !== 'undefined') module.exports = { createDeck, createResponsiveDeck, textSampleBounds, chooseTextInk };
  if (typeof document === 'undefined') return;
  const get = id => document.getElementById(id);
  let catalogPromise, next, selected = null, enabled = false, busy = false;
  let available = true;
  let selectedImage = null, upcoming = null, upcomingOrientation = null, requestId = 0;
  const screenOrientation = () => root.matchMedia?.('(orientation: portrait)').matches ? 'portrait' : 'landscape';
  let failedRestore = null;
  let infoId = 0;
  const contrastCanvas = document.createElement('canvas');
  const contrastContext = contrastCanvas.getContext?.('2d', { willReadFrequently: true });
  let contrastFrame = 0;
  function updateContrast() {
    contrastFrame = 0;
    const image = get('writing-art').querySelector('img');
    if (!enabled || !available || !image?.naturalWidth || !contrastContext) return;
    // Sample only the local artwork. Text is measured for layout only; its
    // contents and the image samples are never retained or transmitted.
    // Match the centered object-fit: cover crop at the current viewport size.
    const bounds = image.getBoundingClientRect();
    const width = 240, height = Math.max(1, Math.round(width * bounds.height / bounds.width));
    contrastCanvas.width = width; contrastCanvas.height = height;
    const scale = Math.max(bounds.width / image.naturalWidth, bounds.height / image.naturalHeight);
    const cropWidth = bounds.width / scale, cropHeight = bounds.height / scale;
    contrastContext.drawImage(image, (image.naturalWidth - cropWidth) / 2, (image.naturalHeight - cropHeight) / 2,
      cropWidth, cropHeight, 0, 0, width, height);
    const pixels = contrastContext.getImageData(0, 0, width, height).data;
    const linear = value => { const c = value / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; };
    const targets = document.querySelectorAll('#word, footer .signature, footer button, .collection-nav > button, .collection-nav > a, .site-menu > summary, #art-status');
    for (const target of targets) {
      let rect = target.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      if (target.id === 'word') {
        const style = getComputedStyle(target);
        contrastContext.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        const textWidth = contrastContext.measureText(target.value || target.placeholder || 'M').width;
        rect = textSampleBounds(rect, textWidth, parseFloat(style.fontSize));
      }
      const luminances = [];
      for (let row = 0; row < 5; row++) for (let col = 0; col < 25; col++) {
        const x = Math.max(0, Math.min(width - 1, Math.floor((rect.left + rect.width * (col + .5) / 25 - bounds.left) / bounds.width * width)));
        const y = Math.max(0, Math.min(height - 1, Math.floor((rect.top + rect.height * (row + .5) / 5 - bounds.top) / bounds.height * height)));
        const i = (y * width + x) * 4;
        luminances.push(.2126 * linear(pixels[i]) + .7152 * linear(pixels[i + 1]) + .0722 * linear(pixels[i + 2]));
      }
      target.style.setProperty('--art-ink', chooseTextInk(luminances, target.id === 'word'));
    }
  }
  function scheduleContrast() {
    if (contrastContext && !contrastFrame && root.requestAnimationFrame) contrastFrame = root.requestAnimationFrame(updateContrast);
  }
  root.addEventListener?.('resize', scheduleContrast);
  get('word').addEventListener('input', scheduleContrast);
  document.fonts?.ready.then(scheduleContrast);
  document.addEventListener?.('visibilitychange', () => { if (!document.hidden) scheduleContrast(); });
  function catalog() {
    if (!catalogPromise) catalogPromise = fetch('/assets/art/catalog.json').then(response => {
      if (!response.ok) throw new Error('The image pool could not load.');
      return response.json();
    }).then(items => {
      if (!Array.isArray(items) || !items.length || items.some(item => item.license !== 'CC0' || !/^\/assets\/art\/[a-z0-9-]+\.jpg$/.test(item.src))) throw new Error('The image pool is invalid.');
      // Retired prompts stay resolvable for previously saved documents.
      next = createResponsiveDeck(items, screenOrientation); return items;
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
    // A resize changes the next prompt, while the chosen artwork stays with the writing.
    const orientation = screenOrientation();
    if (upcomingOrientation !== orientation) {
      upcoming = null; upcomingOrientation = orientation;
    }
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
    scheduleContrast();
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
