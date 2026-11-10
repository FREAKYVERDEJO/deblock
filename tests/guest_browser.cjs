// R.13/SM.13/E2E.13: an anonymous writer can save locally without account requests.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const base = process.env.DEBLOCK_TEST_URL || 'http://127.0.0.1:8003';
const output = '/tmp/deblock-guest-review';
fs.mkdirSync(output, { recursive: true });

async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const width of [1280, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      const errors = [], privateRequests = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      page.on('request', request => {
        const path = new URL(request.url()).pathname;
        if (path.startsWith('/api/') && !path.startsWith('/api/exercises/')) privateRequests.push(path);
      });
      page.on('dialog', dialog => dialog.accept());
      await page.goto(base);
      await page.waitForURL('**/guest/');
      await page.locator('#word:not([disabled])').waitFor();
      await page.locator('#word').focus();
      assert.equal(await page.locator('#word').evaluate(element => getComputedStyle(element).outlineStyle), 'none');
      assert.equal(await page.locator('#word').evaluate(element => getComputedStyle(element).borderTopWidth), '0px');
      assert.equal(await page.locator('.save-reminder').count(), 0);
      assert.equal(await page.locator('main #draft-privacy').count(), 0);
      await page.locator('#guest-sign-in').waitFor({ state: 'visible' });
      const signin = await page.locator('#guest-sign-in').boundingBox();
      assert.ok(signin.x > width / 2 && signin.y < 60, 'sign-in belongs in the top-right corner');
      await page.screenshot({ path: `${output}/${width}-direct.png`, fullPage: true });
      await page.goto(`${base}/accounts/login/?next=/`);
      const skip = page.getByRole('link', { name: 'Continue without signing in' });
      await skip.focus();
      await page.screenshot({ path: `${output}/${width}-skip.png`, fullPage: true });
      await page.keyboard.press('Enter');
      await page.waitForURL('**/guest/');
      await page.locator('#word:not([disabled])').waitFor();
      assert.match(await page.locator('#draft-privacy').textContent(), /Guest saves.*this browser/);
      assert.equal(await page.evaluate(() => Boolean(window.DeblockStorage.accountMode)), false);
      await page.locator('#word').fill('rain glass sea');
      await page.locator('#finish').click();
      await page.locator('#open-poetry').click();
      const characters = page.locator('#poetry-words button');
      for (let index = 0; index < 4; index++) await characters.nth(index).click();
      assert.equal(await page.locator('#poetry-words button[aria-pressed="true"]').count(), 4);
      await page.locator('#poetry-apply').click();
      await page.locator('#document-title').fill('Guest poem');
      await page.locator('#finish-dialog .save-menu > summary').click();
      await page.locator('#save-entry').click();
      await page.waitForFunction(() => document.getElementById('export-status').textContent === 'Saved to library in this browser.');
      await page.reload();
      await page.locator('#word:not([disabled])').waitFor();
      const menu = async id => { await page.locator('#site-menu > summary').click(); await page.locator(id).click(); };
      await menu('#open-library');
      await page.getByRole('button', { name: /Guest poem/ }).click();
      await page.locator('#entry-dialog[open]').waitFor();
      assert.equal(await page.locator('#entry-body .poetry-redacted').count(), 4);
      await page.locator('#continue-entry').click();
      await menu('#open-story');
      await page.locator('#story-outline').fill('i go to the store\ni meet a mysterious stranger\ni go home');
      await page.locator('#story-start').click();
      await page.locator('#word').fill('The bell rings');
      await page.locator('#next-beat').click();
      await page.locator('#previous-beat').click();
      assert.equal(await page.locator('#word').inputValue(), 'rings');
      await page.locator('#finish').click();
      await page.locator('#document-title').fill('Guest story');
      await page.locator('#finish-dialog .save-menu > summary').click();
      await page.locator('#save-entry').click();
      await page.waitForFunction(() => document.getElementById('export-status').textContent === 'Saved to library in this browser.');
      await page.reload();
      await page.locator('#word:not([disabled])').waitFor();
      await menu('#open-library');
      await page.getByRole('button', { name: /Guest story/ }).click();
      await page.locator('#continue-entry').click();
      assert.equal(await page.locator('#word').inputValue(), 'rings');
      assert.equal(await page.locator('#beat-to').innerText(), 'i meet a mysterious stranger');
      await page.screenshot({ path: `${output}/${width}-guest.png`, fullPage: true });
      assert.equal(await page.locator('#guest-sign-in').getAttribute('href'), '/accounts/login/');
      assert.equal(await page.locator('#guest-sign-in').isVisible(), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.deepEqual(privateRequests, []);
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}px: direct writing, top-right sign-in, no input box/helper clutter, keyboard skip, local poem/story save and reopen, no private API requests or console errors`);
      await context.close();
    }
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
