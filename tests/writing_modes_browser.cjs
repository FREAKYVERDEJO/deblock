// SM.11/SM.12, E2E.11/E2E.12: synthetic writing only; mock or real account HTTP.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const base = process.env.DEBLOCK_TEST_URL || 'http://127.0.0.1:8014';
const output = process.env.DEBLOCK_TEST_OUTPUT || '/tmp/deblock-writing-modes';
const runTag = Date.now();
fs.mkdirSync(output, { recursive: true });

async function run() {
  const browser = await chromium.launch({ headless: true, ...(process.env.DEBLOCK_BROWSER_CHANNEL ? { channel: process.env.DEBLOCK_BROWSER_CHANNEL } : {}) });
  try {
    for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
      const label = viewport.width < 600 ? 'phone' : 'laptop';
      const context = await browser.newContext({ viewport, reducedMotion: 'reduce', acceptDownloads: true });
      if (process.env.DEBLOCK_TEST_SESSION_FILE) {
        const value = fs.readFileSync(process.env.DEBLOCK_TEST_SESSION_FILE, 'utf8').trim();
        await context.addCookies([{ name: 'deblock-session', value, url: base, httpOnly: true, sameSite: 'Lax' }]);
      }
      const page = await context.newPage();
      const errors = [], writes = [], consoleErrors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => {
        if (message.type() === 'error' && !/Failed to load resource.*(?:400|503)/.test(message.text())) consoleErrors.push(message.text());
      });
      page.on('request', request => { if (!['GET', 'HEAD'].includes(request.method())) writes.push(request.url()); });
      page.on('dialog', dialog => dialog.accept());
      // Same account-storage requests as production; private responses stay in memory.
      if (!process.env.DEBLOCK_TEST_SESSION_FILE) {
        const entries = new Map();
        const profile = { id: 'local', accountId: 'fictional-writer', name: 'Mara', email: 'mara@example.test', avatar: '1', joinedAt: '2026-11-05T10:00:00Z' };
        await page.route('**/storage.js', route => route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(__dirname, '../deblock/web/account-storage.js'), 'utf8') }));
        await page.route('**/api/**', route => {
          const request = route.request(), url = new URL(request.url()), method = request.method();
          const send = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
          if (url.pathname.startsWith('/api/exercises/')) return route.continue();
          if (url.pathname === '/api/session/') return send({ profile, csrfToken: 'fictional-csrf' });
          if (url.pathname === '/api/profile/') return send(profile);
          if (url.pathname === '/api/entries/') return send({ items: [...entries.values()], nextPage: null });
          if (url.pathname.startsWith('/api/entries/')) {
            const id = url.pathname.split('/')[3];
            if (method === 'PUT') {
              const value = request.postDataJSON(), previous = entries.get(id);
              if (previous && value.revision !== previous.revision) return send({ error: 'This entry changed in another tab.' }, 409);
              const item = { ...value, id, revision: (previous?.revision || 0) + 1 };
              entries.set(id, item); return send(item, previous ? 200 : 201);
            }
            return entries.has(id) ? send(entries.get(id)) : send({ error: 'Not found.' }, 404);
          }
          return send({ error: 'No mock for this operation.' }, 400);
        });
      }
      await page.goto(base);
      await page.locator('#word:not([disabled])').waitFor();
      const menu = async id => { await page.locator('#site-menu > summary').click(); await page.locator(id).click(); };
      const shot = name => page.screenshot({ path: path.join(output, `${label}-${name}.png`), fullPage: true });
      const snapshot = () => page.evaluate(() => window.DeblockDocument.snapshot());
      await page.locator('#word').fill('rain glass sea light');
      assert.equal(writes.length, 0, 'typing must not upload');
      await menu('#open-story');
      await page.locator('#story-outline').fill('one beat');
      await page.locator('#story-start').click();
      assert.match(await page.locator('#story-outline-status').innerText(), /two/i);
      await shot('outline-correction');
      await page.locator('#story-outline').fill('i go to the store\ni meet a mysterious stranger\ni go home');
      await page.locator('#story-start').click();
      assert.equal(await page.locator('#beat-to').innerText(), 'i meet a mysterious stranger');
      await page.locator('#next-beat').click();
      assert.equal((await snapshot()).story.passages[0].words.length, 0);
      await page.locator('#previous-beat').click();
      await page.locator('#word').fill('The bell rings');
      await page.locator('#next-beat').click();
      assert.equal(await page.locator('#word').inputValue(), '');
      await page.locator('#word').fill('I walk home');
      await page.locator('#previous-beat').click();
      assert.equal(await page.locator('#word').inputValue(), 'rings');
      await page.locator('#word').press('Tab');
      assert.equal(await page.locator('#word').inputValue(), 'rings');
      await shot('story-writing');
      await menu('#open-free');
      assert.equal(await page.locator('#word').inputValue(), 'light');
      await menu('#open-story');
      assert.equal(await page.locator('#word').inputValue(), 'rings');
      assert.equal(writes.length, 0, 'mode changes must not upload');
      await page.locator('#finish').click();
      assert.equal(await page.locator('#chain-summary').innerText(), 'The bell rings\n\nI walk home');
      await page.locator('#document-title').fill(`Story ${label} ${runTag}`);
      await shot('story-review');
      const failSave = route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Saving is temporarily unavailable. Try again.' }) });
      await page.route('**/api/entries/*/', failSave);
      await page.locator('#finish-dialog .save-menu > summary').click();
      await page.locator('#save-entry').click();
      await page.waitForFunction(() => document.getElementById('export-status').textContent.includes('temporarily unavailable'));
      assert.equal((await snapshot()).story.passages[0].draft, 'rings');
      await shot('save-recovery');
      await page.unroute('**/api/entries/*/', failSave);
      await page.locator('#finish-dialog .save-menu > summary').click();
      await page.locator('#save-entry').click();
      await page.waitForFunction(() => document.getElementById('export-status').textContent.startsWith('Saved to library'));
      const savedStory = await snapshot();
      assert.equal(savedStory.story.active, 0);
      await page.reload();
      await page.locator('#word:not([disabled])').waitFor();
      await menu('#open-library');
      await page.getByRole('button', { name: new RegExp(`Story ${label} ${runTag}`) }).click();
      await page.locator('#continue-entry').click();
      assert.deepEqual((await snapshot()).story, savedStory.story);
      assert.equal(await page.locator('#word').inputValue(), 'rings');
      await menu('#open-free');
      await page.locator('#word').fill('rain glass sea light');
      await page.locator('#finish').click();
      await page.locator('#document-title').fill(`Poem ${label} ${runTag}`);
      await page.locator('#open-poetry').click();
      await page.getByRole('button', { name: 'rain', exact: true }).focus();
      await page.keyboard.press('Space');
      await page.getByRole('button', { name: 'sea', exact: true }).click();
      assert.equal(await page.locator('#poetry-line').innerText(), 'rain sea');
      await shot('highlight');
      await page.locator('#poetry-style').selectOption('blackout');
      assert.equal(await page.locator('#poetry-preview .poetry-redacted').count(), 2);
      await page.locator('#poetry-apply').click();
      assert.equal(await page.locator('#chain-summary .poetry-redacted').count(), 2);
      await shot('blackout');
      await page.locator('#finish-dialog .save-menu > summary').click();
      await page.locator('#save-entry').click();
      await page.waitForFunction(() => document.getElementById('export-status').textContent.startsWith('Saved to library'));
      for (const format of ['png', 'pdf']) {
        await page.locator('#finish-dialog .save-menu > summary').click();
        const pendingDownload = page.waitForEvent('download');
        await page.locator(`#finish-dialog [data-export="${format}"]`).click();
        const download = await pendingDownload;
        const file = path.join(output, `${label}-blackout-export.${format}`);
        await download.saveAs(file);
        const bytes = fs.readFileSync(file);
        assert.ok(bytes.length > 100);
        if (format === 'pdf') assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
        else assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
      }
      await page.reload();
      await page.locator('#word:not([disabled])').waitFor();
      await menu('#open-library');
      await page.getByRole('button', { name: new RegExp(`Poem ${label} ${runTag}`) }).click();
      await page.locator('#entry-dialog[open]').waitFor();
      assert.equal(await page.locator('#entry-body .poetry-redacted').count(), 2);
      await page.locator('#continue-entry').click();
      assert.deepEqual((await snapshot()).blackout, { version: 1, style: 'blackout', kept: [0, 2] });
      await page.locator('#finish').click();
      await page.locator('#open-poetry').click();
      await page.locator('#poetry-clear').click();
      await page.locator('#poetry-dialog .close').click();
      assert.deepEqual((await snapshot()).blackout.kept, [0, 2], 'cancel keeps the applied poem');
      await page.locator('#open-poetry').click();
      await page.locator('#poetry-original').click();
      assert.equal(await page.locator('#chain-summary').innerText(), 'rain → glass → sea → light');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.deepEqual(errors, [], 'no uncaught browser errors');
      assert.deepEqual(consoleErrors, [], 'no unexpected console errors');
      console.log(`PASS ${label}: outline correction, passages, pending words, keyboard, mode retention, save failure/retry/reopen, highlight, blackout, PNG/PDF, restore, no draft uploads, no unexpected console errors`);
      await context.close();
    }
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
