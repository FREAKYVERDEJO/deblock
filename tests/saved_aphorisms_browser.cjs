// Run against an isolated local writer with research enabled, using synthetic data.
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const base = process.env.DEBLOCK_TEST_URL || 'http://127.0.0.1:8057';
assert.equal(new URL(base).hostname, '127.0.0.1');
(async () => {
  const browser = await chromium.launch({channel: 'chrome', headless: true});
  try {
    for (const width of [1280, 390]) {
      const context = await browser.newContext({viewport: {width, height: 844}, reducedMotion: 'reduce'});
      const page = await context.newPage();
      const errors = [], collected = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', msg => {if (msg.type() === 'error') errors.push(msg.text());});
      page.on('request', req => {if (req.url().endsWith('/api/research/aphorism/')) collected.push(req.postDataJSON());});
      const menu = async id => {await page.locator('#site-menu summary').click(); await page.locator('#' + id).click();};
      await page.goto(base + '/guest/');
      await page.locator('#word:not([disabled])').waitFor();
      await menu('open-aphorism');
      const bookmark = page.locator('#bookmark-aphorism');
      await bookmark.waitFor();
      await page.waitForFunction(() => document.activeElement.id === 'word');
      await bookmark.focus(); await page.keyboard.press('Enter');
      await page.locator('#bookmark-aphorism[aria-pressed="true"]').waitFor();
      assert.equal(collected.length, 0, 'saving needs no collection permission');
      await page.locator('#open-library').click();
      await page.locator('.saved-aphorism-card').waitFor();
      assert.equal(await page.locator('.saved-aphorism-card').count(), 1);
      await page.locator('#library-dialog .close').click();
      await page.reload(); await menu('open-aphorism');
      await page.locator('#bookmark-aphorism[aria-pressed="true"]').waitFor();
      await page.locator('#research-open').click();
      await page.locator('#accept-terms').click();
      await page.locator('#terms-accepted').waitFor();
      await page.locator('#research-dialog .close').click();
      assert.equal(collected.length, 0, 'existing bookmarks are not silently collected');
      let response = page.waitForResponse(r => r.url().endsWith('/api/research/aphorism/'));
      await bookmark.click(); assert.equal((await response).status(), 200);
      response = page.waitForResponse(r => r.url().endsWith('/api/research/aphorism/'));
      await bookmark.click(); assert.equal((await response).status(), 200);
      assert.deepEqual(collected.map(r => r.saved), [false, true]);
      assert(collected.every(r => /^aotd-\d+$/.test(r.id) && !('writing' in r)));
      await page.locator('#word').pressSequentially('moon ');
      await page.locator('#word').pressSequentially('tide');
      await page.locator('#finish').click();
      await page.locator('#finish-dialog[open]').waitFor();
      assert.match(await page.locator('#chain-summary').textContent(), /moon.*tide/);
      await page.locator('#resume').click();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.evaluate(() => document.documentElement.dataset.theme = 'light');
      await page.screenshot({path: `/tmp/deblock-bookmarks-${width}.png`, fullPage: true});
      await page.locator('#open-library').click();
      response = page.waitForResponse(r => r.url().endsWith('/api/research/aphorism/'));
      await page.locator('.saved-aphorism-card button').click();
      assert.equal((await response).status(), 200);
      await page.locator('.saved-aphorism-card').waitFor({state: 'detached'});
      assert.equal(await page.locator('.saved-aphorism-card').count(), 0);
      await page.locator('#library-dialog .close').click();
      assert.equal(await bookmark.getAttribute('aria-pressed'), 'false');
      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log('Saved aphorisms: desktop/mobile, keyboard, persistence, library removal, consent and collection passed.');
  } finally {await browser.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
