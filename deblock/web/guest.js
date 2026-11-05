// Guest mode never initializes the account adapter or uploads local writing.
(function () {
  'use strict';
  const get = id => document.getElementById(id);
  get('draft-privacy').textContent = 'Guest saves stay in this browser. Unsaved writing disappears on reload or close.';
  get('email-note').textContent = 'Optional, saved only in this browser. This does not create an account.';
  get('password-note').textContent = 'Guest profile · stored in this browser.';
})();
