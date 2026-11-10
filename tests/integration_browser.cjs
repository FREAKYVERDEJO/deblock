// Cross-feature regression: browser storage upgrades, appearance, and aphorism exports.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const base = process.env.DEBLOCK_TEST_URL || 'http://127.0.0.1:8063';
assert.equal(new URL(base).hostname, '127.0.0.1');
const output = process.env.DEBLOCK_TEST_OUTPUT || '/tmp/deblock-integration-browser';
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const width of [1280, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'reduce', acceptDownloads: true });
      const page = await context.newPage();
      const errors = [], writes = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(`${message.text()} ${message.location().url}`); });
      page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
      page.on('request', request => { if (!['GET', 'HEAD'].includes(request.method())) writes.push(request.url()); });
      // Establish the same origin without loading the writing/storage modules yet.
      await page.goto(base + '/accounts/login/');
      await page.evaluate(() => new Promise((resolve, reject) => {
        const request = indexedDB.open('deblock-local', 1);
        request.onupgradeneeded = () => {
          for (const name of ['entries', 'images', 'profile']) request.result.createObjectStore(name, { keyPath: 'id' });
        };
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(['entries', 'images', 'profile'], 'readwrite');
          transaction.objectStore('entries').put({ id: 'upgrade-entry', title: 'Upgrade ✓', words: ['rain'], draft: '雨', arrows: false, artwork: null, updatedAt: '2026-11-10T12:00:00Z' });
          transaction.objectStore('images').put({ id: 'upgrade-image', title: 'Original image', blob: new Blob(['unchanged-image-bytes'], { type: 'image/png' }), updatedAt: '2026-11-10T12:00:00Z' });
          transaction.objectStore('profile').put({ id: 'local', name: 'Synthetic writer', avatar: '2' });
          transaction.oncomplete = () => { db.close(); resolve(); };
          transaction.onerror = () => reject(transaction.error);
        };
      }));
      await page.goto(base + '/guest/');
      await page.locator('#word:not([disabled])').waitFor();
      const upgraded = await page.evaluate(async () => {
        const store = window.DeblockStorage;
        await store.put('aphorisms', { id: 'aotd-001', updatedAt: '2026-11-10T12:00:00Z' });
        return { entry: await store.get('entries', 'upgrade-entry'), profile: await store.get('profile', 'local'),
          image: await (await store.get('images', 'upgrade-image')).blob.text(), bookmarks: await store.all('aphorisms') };
      });
      assert.deepEqual(upgraded.entry.words, ['rain']);
      assert.equal(upgraded.entry.draft, '雨');
      assert.equal(upgraded.entry.title, 'Upgrade ✓');
      assert.deepEqual(upgraded.profile, { id: 'local', name: 'Synthetic writer', avatar: '2' });
      assert.equal(upgraded.image, 'unchanged-image-bytes');
      assert.equal(upgraded.bookmarks[0].id, 'aotd-001');
      await page.locator('#word').fill('moon tide');
      const before = await page.evaluate(() => window.DeblockDocument.snapshot());
      for (const theme of ['light', 'dark']) {
        await page.locator('#site-menu > summary').click();
        const button = page.locator(`[data-theme-option="${theme}"]`);
        await button.focus(); await page.keyboard.press('Enter');
        assert.equal(await button.getAttribute('aria-pressed'), 'true');
        assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), theme);
        assert.equal(await page.locator('#word').evaluate(el => getComputedStyle(el).caretColor), await page.locator('body').evaluate(el => getComputedStyle(el).color));
        const after = await page.evaluate(() => window.DeblockDocument.snapshot());
        assert.deepEqual(after.words, before.words); assert.equal(after.draft, before.draft); assert.equal(after.id, before.id);
        const contrast = await page.evaluate(() => {
          const channels = value => value.match(/[\d.]+/g).slice(0, 3).map(Number).map(n => n / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4);
          const luminance = value => channels(value).reduce((sum, n, i) => sum + n * [.2126, .7152, .0722][i], 0);
          const style = getComputedStyle(document.body), a = luminance(style.color), b = luminance(style.backgroundColor);
          return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
        });
        assert.ok(contrast >= 4.5, `${theme} text contrast is readable`);
        await page.locator('#site-menu > summary').click();
        await page.screenshot({ path: `${output}/${width}-${theme}.png`, fullPage: true });
      }
      await page.reload(); await page.locator('#word:not([disabled])').waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
      assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true);
      assert.equal(await page.evaluate(() => document.getAnimations().filter(animation => animation.playState === 'running').length), 0);
      await page.locator('#site-menu > summary').click(); await page.locator('#open-aphorism').click();
      await page.locator('#aphorism-heading').waitFor({ state: 'visible' });
      await page.locator('#word').fill('moon tide');
      await page.locator('#aphorism-toggle').click();
      await page.locator('#aphorism-text').waitFor({ state: 'visible' });
      assert.equal(await page.locator('#aphorism-text').inputValue(), 'moon tide');
      await page.locator('#aphorism-text').fill('moon tide\nshore');
      await page.locator('#aphorism-toggle').click();
      await page.locator('#finish').click();
      assert.equal(await page.locator('#chain-summary').innerText(), 'moon tide\nshore');
      const quote = await page.locator('#finish-aphorism').innerText();
      assert.ok(quote.length > 20);
      await page.locator('#finish-dialog .save-menu > summary').click(); await page.locator('#save-entry').click();
      await page.waitForFunction(() => document.getElementById('export-status').textContent.startsWith('Saved to library'));
      for (const format of ['png', 'pdf']) {
        await page.locator('#finish-dialog .save-menu > summary').click();
        const pending = page.waitForEvent('download');
        await page.locator(`#finish-dialog [data-export="${format}"]`).click();
        const download = await pending, file = `${output}/${width}-aphorism.${format}`;
        await download.saveAs(file);
        const bytes = fs.readFileSync(file);
        assert.ok(bytes.length > 100);
        assert.equal(bytes.subarray(format === 'png' ? 1 : 0, format === 'png' ? 4 : 5).toString(), format === 'png' ? 'PNG' : '%PDF-');
        assert.equal(await page.locator('#finish-aphorism').innerText(), quote);
      }
      assert.deepEqual(writes, [], 'local saves, themes, and exports never upload writing without permission');
      assert.deepEqual(errors, []);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await context.close();
      console.log(`PASS ${width}px: v1 storage upgrade preserves writing/images/profile, keyboard themes/contrast/persistence, reduced motion, aphorism mode switching and PNG/PDF, no uploads/errors`);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
