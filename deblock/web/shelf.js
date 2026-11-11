// Profile, library, and gallery use the active storage adapter.
(function () {
  'use strict';
  const get = id => document.getElementById(id);
  const store = window.DeblockStorage;
  let profile;
  let viewedEntry;
  let galleryUrls = [];
  let savingEntry = false;
  let savedDraft;
  const avatarIds = ['1', '2', '3'];
  const avatarId = value => avatarIds.includes(value) ? value : '1';
  const date = value => new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const errorText = error => `${store.accountMode ? 'Couldn’t access your saved work.' : 'Couldn’t access browser storage.'} ${error.message || 'Try again or download your writing.'}`;
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
    if (entry.aphorism) return entry.words.join('') + entry.draft;
    if (entry.story) return window.DeblockWritingTools.storyText(entry.story, entry.arrows);
    const links = [...entry.words];
    if (entry.draft.trim()) links.push(entry.draft.trim());
    return links.join(entry.arrows ? ' → ' : ' ');
  }
  async function viewEntry(entry) {
    viewedEntry = entry;
    get('entry-title').textContent = entry.title || 'Untitled';
    if (!window.DeblockModes.renderStory(get('entry-body'), entry)) get('entry-body').textContent = entryText(entry);
    await window.DeblockAphorisms.render(get('entry-aphorism'), entry.aphorism);
    window.DeblockPoetry?.render(get('entry-body'), entry);
    get('edit-entry').hidden = Boolean(entry.story || entry.blackout || entry.aphorism);
    get('entry-status').textContent = '';
    await window.DeblockArt?.renderSaved(get('entry-art'), entry.artwork);
    showDialog(get('entry-dialog'));
  }
  async function renderLibrary() {
    const bookmarks = ordered(await store.all('aphorisms'));
    const savedList = get('saved-aphorisms-list');
    savedList.replaceChildren();
    if (!bookmarks.length) savedList.append(textElement('p', 'No saved aphorisms yet. Use the bookmark on the aphorism page to keep one here.', 'empty-state'));
    for (const bookmark of bookmarks) {
      const card = document.createElement('article'); card.className = 'saved-aphorism-card';
      const figure = document.createElement('figure'); figure.className = 'aphorism-prompt';
      await window.DeblockAphorisms.render(figure, bookmark);
      const remove = textElement('button', 'remove bookmark'); remove.type = 'button';
      remove.addEventListener('click', async () => {
        remove.disabled = true;
        try { await window.DeblockAphorisms.setSaved(bookmark.id, false); await renderLibrary(); }
        catch (error) { get('library-status').textContent = errorText(error); remove.disabled = false; }
      });
      card.append(figure, remove); savedList.append(card);
    }
    const entries = ordered(await store.all('entries'));
    const list = get('library-list');
    list.replaceChildren();
    if (!entries.length) list.append(textElement('p', 'No entries yet. Choose save → to library when you’re done writing.', 'empty-state'));
    for (const entry of entries) {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'entry-card';
      button.append(textElement('strong', entry.title || 'Untitled'), textElement('time', date(entry.updatedAt)), textElement('span', entryText(entry).slice(0, 150)));
      button.addEventListener('click', async () => {
        try { await viewEntry(store.accountMode ? await store.get('entries', entry.id) : entry); }
        catch (error) { get('library-status').textContent = errorText(error); }
      });
      list.append(button);
    }
  }
  async function renderGallery() {
    const images = ordered(await store.all('images'));
    for (const url of galleryUrls) URL.revokeObjectURL(url);
    galleryUrls = [];
    const list = get('gallery-list'); list.replaceChildren();
    if (!images.length) list.append(textElement('p', 'No pictures yet. Choose save → to gallery to keep an image with your writing.', 'empty-state'));
    for (const item of images) {
      const url = store.accountMode ? item.url : URL.createObjectURL(item.blob);
      if (!store.accountMode) galleryUrls.push(url);
      const link = document.createElement('a'); link.href = url; link.download = 'deblock-document.png';
      link.className = 'gallery-card';
      if (item.artwork) link.title = `${item.artwork.title} — ${item.artwork.artist} · ${item.artwork.museum} · CC0`;
      const image = document.createElement('img'); image.src = url; image.alt = item.title || 'Saved writing'; image.loading = 'lazy';
      link.append(image, textElement('span', item.title || 'Untitled'));
      if (item.caption) link.append(textElement('p', item.caption, 'gallery-caption'));
      link.append(textElement('small', 'download PNG'));
      if (store.accountMode) {
        const container = document.createElement('div'); container.className = 'gallery-item';
        const remove = textElement('button', 'delete'); remove.type = 'button';
        remove.setAttribute('aria-label', `Delete ${item.title || 'image'}`);
        remove.addEventListener('click', async () => {
          if (!window.confirm('Delete this saved picture from Gallery?')) return;
          try { await store.remove('images', item.id); await renderGallery(); }
          catch (error) { get('gallery-status').textContent = errorText(error); }
        });
        container.append(link, remove); list.append(container);
      } else list.append(link);
    }
  }
  async function renderProfile() {
    profile = await localProfile();
    get('profile-name').value = profile.name;
    get('profile-email').value = profile.email;
    for (const id of avatarIds) get(`avatar-${id}`).checked = id === avatarId(profile.avatar);
    get('profile-joined').textContent = date(profile.joinedAt);
    get('profile-count').textContent = String((await store.all('entries')).length);
    get('profile-image').src = `/assets/avatars/portrait-${avatarId(profile.avatar)}.png`;
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
      const updated = { ...profile, name: get('profile-name').value.trim(), email: get('profile-email').value.trim(), avatar: get('avatar-3').checked ? '3' : get('avatar-2').checked ? '2' : '1' };
      await store.put('profile', updated); profile = updated;
      get('profile-image').src = `/assets/avatars/portrait-${updated.avatar}.png`;
      get('avatar-picker').hidden = true;
      get('profile-picture').setAttribute('aria-expanded', 'false');
      status.textContent = store.accountMode ? 'Profile saved.' : 'Profile saved in this browser.';
    } catch (error) { status.textContent = errorText(error); }
  });
  get('save-entry').addEventListener('click', async () => {
    if (savingEntry) return;
    savingEntry = true;
    get('save-entry').closest('details').open = false;
    const status = get('export-status');
    try {
      const entry = window.DeblockDocument.snapshot();
      if (!entry.story && !entry.words.join('').trim() && !entry.draft.trim()) { status.textContent = 'Write something first.'; return; }
      await localProfile();
      // Bind this draft to its own last save, even if Library refreshes another revision.
      if (store.accountMode && !entry.revision && savedDraft?.id === entry.id) entry.revision = savedDraft.revision;
      const saved = await store.put('entries', entry);
      if (store.accountMode) savedDraft = saved;
      window.DeblockDocument.saved?.(saved || entry);
      status.textContent = store.accountMode ? 'Saved to library.' : 'Saved to library in this browser.';
    } catch (error) { status.textContent = errorText(error); }
    finally { savingEntry = false; }
  });
  get('continue-entry').addEventListener('click', async () => {
    try { await window.DeblockModes.openEntry(viewedEntry); }
    catch (error) { get('entry-status').textContent = errorText(error); }
  });
  if (store.accountMode) {
    get('edit-entry').addEventListener('click', () => {
      get('edit-entry-title').value = viewedEntry.title;
      get('edit-entry-text').value = [...viewedEntry.words, viewedEntry.draft].filter(Boolean).join(' ');
      get('edit-entry-status').textContent = '';
      showDialog(get('edit-entry-dialog'));
      window.DeblockResearch?.libraryEdit();
    });
    get('edit-entry-form').addEventListener('submit', async event => {
      event.preventDefault();
      const button = get('edit-entry-form').querySelector('[type="submit"]');
      button.disabled = true;
      try {
        const updated = await store.put('entries', { ...viewedEntry,
          title: get('edit-entry-title').value, words: [get('edit-entry-text').value], draft: '', arrows: false });
        window.DeblockResearch?.end('completed');
        await viewEntry(updated);
        get('edit-entry-dialog').close();
        await renderLibrary();
      } catch (error) { get('edit-entry-status').textContent = errorText(error); }
      finally { button.disabled = false; }
    });
    get('delete-entry').addEventListener('click', async () => {
      if (!window.confirm('Delete this entry from your Library?')) return;
      try {
        await store.remove('entries', viewedEntry.id);
        if (savedDraft?.id === viewedEntry.id) savedDraft = null;
        get('entry-dialog').close(); await renderLibrary();
      } catch (error) { get('entry-status').textContent = errorText(error); }
    });
  }
  window.DeblockShelf = {
    snapshotFor: dialog => dialog.id === 'entry-dialog' ? viewedEntry : window.DeblockDocument.snapshot(),
    async saveImage(blob, entry) {
      const caption = entry.blackout
        ? window.DeblockWritingTools.poemText(entry, entry.blackout)
        : entryText({ ...entry, arrows: false });
      await store.put('images', { id: crypto.randomUUID(), title: entry.title || 'Untitled', caption, artwork: entry.artwork || null, blob, updatedAt: new Date().toISOString() });
    },
  };
})();
