// Account-only controls. The original browser-only prototype remains usable.
(function (root) {
  'use strict';
  const store = root.DeblockStorage;
  if (!store?.accountMode) return;
  const get = id => document.getElementById(id);
  document.body.classList.add('account-mode');
  for (const element of document.querySelectorAll('[data-account-only]')) element.hidden = false;
  get('profile-email').readOnly = true;
  get('email-note').replaceChildren();
  const emailLink = document.createElement('a'); emailLink.href = '/accounts/email/'; emailLink.textContent = 'change email';
  get('email-note').append(emailLink);
  const password = get('profile-form').querySelector('[aria-describedby="password-note"]');
  const passwordLink = document.createElement('a'); passwordLink.href = '/accounts/password/change/'; passwordLink.textContent = 'change password';
  password.replaceWith(passwordLink); get('password-note').hidden = true;
  get('info-dialog').querySelector('.fine-print').textContent = 'Save to keep an entry in your account. PNG exports also appear in Gallery. Unsaved writing stays in this tab until you close it.';
  get('import-browser').addEventListener('click', async () => {
    const button = get('import-browser'), status = get('profile-status');
    button.disabled = true;
    try {
      if (!root.DeblockLocalStorage) await new Promise((resolve, reject) => {
        const script = document.createElement('script'); script.src = '/local-storage.js';
        script.onload = resolve; script.onerror = () => reject(new Error('Couldn’t open browser entries.'));
        document.head.append(script);
      });
      const entries = await root.DeblockLocalStorage.all('entries');
      const images = await root.DeblockLocalStorage.all('images');
      if (!entries.length && !images.length) { status.textContent = 'No browser-saved work to import on this address.'; return; }
      const profile = await store.get('profile');
      if (!root.confirm(`Copy ${entries.length} entries and ${images.length} images into ${profile.email}? The browser copies will stay here.`)) return;
      const knownEntries = new Set((await store.all('entries')).map(item => item.id));
      const knownImages = new Set((await store.all('images')).map(item => item.id));
      let copied = 0;
      for (const entry of entries) if (!knownEntries.has(entry.id)) {
        await store.put('entries', entry); status.textContent = `Imported ${++copied} items…`;
      }
      for (const image of images) if (!knownImages.has(image.id)) {
        await store.put('images', image); status.textContent = `Imported ${++copied} items…`;
      }
      get('profile-count').textContent = String((await store.all('entries')).length);
      status.textContent = `Imported ${copied} items. Browser copies are unchanged.`;
    } catch (error) { status.textContent = `${error.message} You can retry; already imported items will be skipped.`; }
    finally { button.disabled = false; }
  });
  get('delete-account').addEventListener('click', () => {
    get('delete-account-password').value = '';
    showDialog(get('delete-account-dialog'));
  });
  get('delete-account-form').addEventListener('submit', async event => {
    event.preventDefault();
    const status = get('delete-account-status');
    const button = get('delete-account-form').querySelector('[type="submit"]');
    button.disabled = true;
    try {
      await store.request('/api/account/', 'DELETE', { password: get('delete-account-password').value });
      get('delete-account-password').value = '';
      root.location.assign('/accounts/login/');
    } catch (error) { status.textContent = error.message; }
    finally { button.disabled = false; }
  });
  root.addEventListener('account-session-ended', () => { get('account-session-warning').hidden = false; });
  root.addEventListener('pageshow', event => { if (event.persisted) root.location.reload(); });
  store.session().catch(() => { get('account-session-warning').hidden = false; });
})(window);
