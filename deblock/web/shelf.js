// The sketch's three sections share the same browser-local collection.
(function () {
  'use strict';
  const get = id => document.getElementById(id);
  const store = window.DeblockStorage;
  let profile;
  let viewedEntry;
  let galleryUrls = [];
  let savingEntry = false;
  const date = value => new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const errorText = error => `Couldn’t access browser storage. ${error.message || 'Try again or download your writing.'}`;
  const ordered = items => items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  async function localProfile() {
    const saved = await store.get('profile', 'local');
    if (saved) return saved;
    const value = { id: 'local', name: '', email: '', avatar: '1', joinedAt: new Date().toISOString() };
    await store.put('profile', value);
    return value;
  }
  function textElement(tag, text, className) {
    const element = document.createElement(tag);
    element.textContent = text;
    if (className) element.className = className;
    return element;
  }
  function entryText(entry) {
    const links = [...entry.words];
    if (entry.draft.trim()) links.push(entry.arrows ? `(${entry.draft} — unfinished)` : entry.draft.trim());
    return links.join(entry.arrows ? ' → ' : ' ');
  }
  async function viewEntry(entry) {
    viewedEntry = entry;
    get('entry-title').textContent = entry.title || 'Untitled';
    get('entry-body').textContent = entryText(entry);
    get('entry-status').textContent = '';
    await window.DeblockArt?.renderSaved(get('entry-art'), entry.artwork);
    showDialog(get('entry-dialog'));
  }
  async function renderLibrary() {
    const entries = ordered(await store.all('entries'));
    const list = get('library-list');
    list.replaceChildren();
    if (!entries.length) list.append(textElement('p', 'No entries yet. Choose save → to library when you’re done writing.', 'empty-state'));
    for (const entry of entries) {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'entry-card';
      button.append(textElement('strong', entry.title || 'Untitled'), textElement('time', date(entry.updatedAt)), textElement('span', entryText(entry).slice(0, 150)));
      button.addEventListener('click', () => viewEntry(entry));
      list.append(button);
    }
  }
  async function renderGallery() {
    const images = ordered(await store.all('images'));
    for (const url of galleryUrls) URL.revokeObjectURL(url);
    galleryUrls = [];
    const list = get('gallery-list'); list.replaceChildren();
    if (!images.length) list.append(textElement('p', 'No pictures yet. Save a document as PNG to add it here.', 'empty-state'));
    for (const item of images) {
      const url = URL.createObjectURL(item.blob); galleryUrls.push(url);
      const link = document.createElement('a'); link.href = url; link.download = 'deblock-document.png';
      link.className = 'gallery-card';
      if (item.artwork) link.title = `${item.artwork.title} — ${item.artwork.artist} · ${item.artwork.museum} · CC0`;
      const image = document.createElement('img'); image.src = url; image.alt = item.title || 'Saved writing'; image.loading = 'lazy';
      link.append(image, textElement('span', item.title || 'Untitled'), textElement('small', 'download PNG'));
      list.append(link);
    }
  }
  async function renderProfile() {
    profile = await localProfile();
    get('profile-name').value = profile.name;
    get('profile-email').value = profile.email;
    get(`avatar-${profile.avatar === '2' ? '2' : '1'}`).checked = true;
    get('profile-joined').textContent = date(profile.joinedAt);
    get('profile-count').textContent = String((await store.all('entries')).length);
    get('profile-image').src = `/assets/avatars/portrait-${profile.avatar === '2' ? '2' : '1'}.png`;
  }
  for (const section of ['profile', 'library', 'gallery']) {
    get(`open-${section}`).addEventListener('click', async () => {
      get('site-menu').open = false;
      const status = get(`${section}-status`); status.textContent = 'Loading…';
      showDialog(get(`${section}-dialog`));
      try {
        await ({ profile: renderProfile, library: renderLibrary, gallery: renderGallery })[section]();
        status.textContent = '';
      } catch (error) { status.textContent = errorText(error); }
    });
  }
  get('profile-picture').addEventListener('click', () => {
    get('avatar-picker').hidden = !get('avatar-picker').hidden;
    get('profile-picture').setAttribute('aria-expanded', String(!get('avatar-picker').hidden));
  });
  get('profile-form').addEventListener('submit', async event => {
    event.preventDefault();
    const status = get('profile-status');
    try {
      profile = profile || await localProfile();
      const updated = { ...profile, name: get('profile-name').value.trim(), email: get('profile-email').value.trim(), avatar: get('avatar-2').checked ? '2' : '1' };
      await store.put('profile', updated); profile = updated;
      get('profile-image').src = `/assets/avatars/portrait-${updated.avatar}.png`;
      get('avatar-picker').hidden = true;
      get('profile-picture').setAttribute('aria-expanded', 'false');
      status.textContent = 'Profile saved in this browser.';
    } catch (error) { status.textContent = errorText(error); }
  });
  get('save-entry').addEventListener('click', async () => {
    if (savingEntry) return;
    savingEntry = true;
    get('save-entry').closest('details').open = false;
    const status = get('export-status');
    try {
      const entry = window.DeblockDocument.snapshot();
      if (!entry.words.length && !entry.draft.trim()) { status.textContent = 'Write something first.'; return; }
      await localProfile();
      await store.put('entries', entry);
      status.textContent = 'Saved to library in this browser.';
    } catch (error) { status.textContent = errorText(error); }
    finally { savingEntry = false; }
  });
  window.DeblockShelf = {
    snapshotFor: dialog => dialog.id === 'entry-dialog' ? viewedEntry : window.DeblockDocument.snapshot(),
    async saveImage(blob, entry) {
      await store.put('images', { id: crypto.randomUUID(), title: entry.title, artwork: entry.artwork || null, blob, updatedAt: new Date().toISOString() });
    },
  };
})();
