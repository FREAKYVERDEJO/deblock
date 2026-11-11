// Regression: done → resume → image off → done must export without artwork.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.env.DEBLOCK_TEST_URL || 'http://127.0.0.1:8023';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const width of [1280, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'reduce', acceptDownloads: true });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      await page.goto(base);
      await page.locator('#word:not([disabled])').waitFor();
      await page.locator('#word').fill('moon tide');
      await page.locator('#art-toggle').click();
      await page.waitForFunction(() => document.getElementById('art-toggle').ariaPressed === 'true');
      const selected = await page.evaluate(() => window.DeblockDocument.snapshot().artwork.id);
      await page.locator('#finish').click();
      assert.equal(await page.locator('#finish-art img').count(), 1);
      await page.locator('#resume').click();
      await page.locator('#word').press('End');
      await page.locator('#word').pressSequentially(' shore');
      await page.locator('#art-toggle').focus();
      await page.keyboard.press('Enter');
      await page.locator('#finish').click();
      assert.equal(await page.locator('#finish-art img').count(), 0, 'image off removes artwork from review');
      assert.equal(await page.evaluate(() => window.DeblockDocument.snapshot().artwork), null, 'saved/exported snapshot omits artwork');
      assert.match(await page.locator('#chain-summary').textContent(), /moon.*tide.*shore/);
      await page.locator('#finish-dialog .save-menu > summary').click();
      const download = page.waitForEvent('download');
      await page.locator('#finish-dialog [data-export="png"]').click();
      assert.equal((await download).suggestedFilename(), 'deblock-document.png');
      assert.equal(await page.locator('#finish-art img').count(), 0, 'export does not reattach the hidden selection');
      await page.locator('#resume').click();
      await page.locator('#art-toggle').click();
      await page.waitForFunction(() => document.getElementById('art-toggle').ariaPressed === 'true');
      assert.equal(await page.evaluate(() => window.DeblockDocument.snapshot().artwork.id), selected, 'image on restores the same selection');
      await page.locator('#finish').click();
      assert.equal(await page.locator('#finish-art img').count(), 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}px: resumed writing, keyboard image toggle, image-free review/PNG, same image restored, no console errors`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
