// Account mode: the server authenticates every operation and determines ownership.
(function (root) {
  'use strict';
  let identity;
  const revisions = new Map();
  async function session() {
    if (!identity) {
      const response = await fetch('/api/session/', { credentials: 'same-origin', cache: 'no-store' });
      if (!response.ok) throw new Error('Sign in again to access your saved work.');
      identity = await response.json();
    }
    return identity;
  }
  async function request(url, method = 'GET', value) {
    const auth = await session();
    const headers = { 'X-Account-ID': auth.profile.accountId };
    const options = { method, headers, credentials: 'same-origin', cache: 'no-store' };
    if (method !== 'GET') headers['X-CSRFToken'] = auth.csrfToken;
    if (value instanceof FormData) options.body = value;
    else if (value !== undefined) { headers['Content-Type'] = 'application/json'; options.body = JSON.stringify(value); }
    const response = await fetch(url, options);
    if (!response.ok) {
      let message = 'The request could not be completed. Try again.';
      try { message = (await response.json()).error || message; } catch { /* Non-JSON CSRF/404 response. */ }
      if (response.status === 401 || (response.status === 403 && message.includes('Verify your email'))) {
        root.dispatchEvent(new CustomEvent('account-session-ended'));
        message = 'Sign in again in another tab, then reload after downloading your draft.';
      }
      if (response.status === 409 && message.includes('account changed')) root.dispatchEvent(new CustomEvent('account-session-ended'));
      throw new Error(message);
    }
    return response.status === 204 ? null : response.json();
  }
  async function all(store) {
    if (!['entries', 'images'].includes(store)) throw new Error('Unknown collection.');
    const items = []; let page = 1;
    do {
      const result = await request(`/api/${store}/?page=${page}`);
      items.push(...result.items); page = result.nextPage;
    } while (page);
    if (store === 'entries') for (const item of items) revisions.set(item.id, item.revision);
    return items;
  }
  root.DeblockStorage = {
    accountMode: true, session, request, all,
    async get(store, id) {
      if (store === 'profile') return request('/api/profile/');
      if (store !== 'entries') throw new Error('Unknown collection.');
      const item = await request(`/api/entries/${encodeURIComponent(id)}/`);
      revisions.set(item.id, item.revision); return item;
    },
    async put(store, value) {
      if (store === 'profile') return request('/api/profile/', 'PUT', { name: value.name, avatar: value.avatar });
      if (store === 'entries') {
        const item = await request(`/api/entries/${encodeURIComponent(value.id)}/`, 'PUT',
          { ...value, revision: value.revision ?? revisions.get(value.id) });
        revisions.set(item.id, item.revision); return item;
      }
      if (store === 'images') {
        const form = new FormData();
        form.set('id', value.id); form.set('title', value.title || '');
        form.set('artworkId', value.artwork?.id || ''); form.set('image', value.blob, 'deblock-document.png');
        return request('/api/images/', 'POST', form);
      }
      throw new Error('Unknown collection.');
    },
    async remove(store, id) {
      if (!['entries', 'images'].includes(store)) throw new Error('Unknown collection.');
      await request(`/api/${store}/${encodeURIComponent(id)}/`, 'DELETE');
      revisions.delete(id);
    },
  };
})(window);
