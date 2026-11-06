// Current blackout editor and outline gutter: real browser, synthetic writing only.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const base = process.env.DEBLOCK_TEST_URL || 'http://127.0.0.1:8016';
const output = '/tmp/deblock-blackout-outline';
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const width of [1280, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: width < 600, reducedMotion: 'reduce', acceptDownloads: true });
      const page = await context.newPage();
      const errors = [], writes = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      page.on('request', request => { if (!['GET', 'HEAD'].includes(request.method())) writes.push(request.url()); });
      page.on('dialog', dialog => dialog.accept());
      await page.goto(base);
      const word = page.locator('#word');
      await page.locator('#word:not([disabled])').waitFor();
      await word.focus();
      assert.equal(await word.evaluate(el => getComputedStyle(el).caretColor), 'rgb(0, 0, 0)');
      await word.fill('rain glass sea light moon tide shore sky');
      await page.locator('#finish').click();
      await page.locator('#document-title').fill('Blackout example');
      await page.locator('#open-poetry').click();
      const characters = page.locator('#poetry-words button');
      assert.equal(await characters.count(), 40);
      const covered = () => page.locator('#poetry-words button[aria-pressed="true"]').count();
      assert.equal(await covered(), 0, 'new poem starts as normal text');
      const point = async index => {
        const box = await characters.nth(index).boundingBox();
        return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      };
      const drag = async (from, to) => {
        const a = await point(from), b = await point(to);
        await page.mouse.move(a.x, a.y); await page.mouse.down();
        await page.mouse.move(b.x, b.y, { steps: 10 }); await page.mouse.up();
      };
      if (width < 600) {
        const touch = await context.newCDPSession(page);
        await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [await point(4)] });
        await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [await point(9)] });
        await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        assert.equal(await covered(), 6, 'touch drag covers characters and their leading space');
        const center = await point(7);
        await page.touchscreen.tap(center.x, center.y);
        assert.equal(await covered(), 5, 'touch tap restores a character');
        await page.locator('#poetry-help > summary').click();
        await page.locator('#poetry-original').click();
        await page.locator('#poetry-help > summary').click();
        await touch.detach();
      }
      await drag(4, 9);
      assert.equal(await covered(), 6, 'drag blacks out every character in the range');
      assert.equal(await characters.nth(4).getAttribute('aria-label'), 'space, character 5');
      assert.equal(await characters.nth(4).evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(0, 0, 0)');
      await characters.nth(7).click();
      assert.equal(await covered(), 5, 'click restores a covered character');
      await characters.nth(7).focus(); await page.keyboard.press('Space');
      assert.equal(await covered(), 6, 'keyboard can black out a character');
      await page.keyboard.press('Enter');
      assert.equal(await covered(), 5, 'keyboard can restore a character');
      await drag(19, 14);
      assert.equal(await covered(), 11, 'backward drag includes the space before a word');
      await page.screenshot({ path: `${output}/${width}-blackout.png`, fullPage: true });
      await page.locator('#poetry-apply').click();
      await page.waitForFunction(() => document.getElementById('export-status').textContent.startsWith('Saved to library'));
      const saved = await page.evaluate(() => window.DeblockDocument.snapshot());
      assert.deepEqual(saved.blackout, { version: 2, style: 'blackout', covered: [4, 5, 6, 8, 9, 14, 15, 16, 17, 18, 19] });
      assert.equal(saved.blackout.style, 'blackout');
      assert.equal(saved.words.join(' ') + ' ' + saved.draft, 'rain glass sea light moon tide shore sky');
      assert.equal(await page.locator('#chain-summary .poetry-redacted').count(), 11);
      for (const format of ['png', 'pdf']) {
        await page.locator('#finish-dialog .save-menu > summary').click();
        const pending = page.waitForEvent('download');
        await page.locator(`#finish-dialog [data-export="${format}"]`).click();
        const download = await pending;
        const filename = `${output}/${width}-poem.${format}`;
        await download.saveAs(filename);
        assert.ok(fs.statSync(filename).size > 100);
      }
      await page.reload();
      await page.locator('#word:not([disabled])').waitFor();
      await page.locator('#open-library').click();
      await page.getByRole('button', { name: /Blackout example/ }).click();
      assert.equal(await page.locator('#entry-body .poetry-redacted').count(), 11);
      await page.locator('#continue-entry').click();
      await page.locator('#finish').click();
      await page.locator('#open-poetry').click();
      assert.equal(await covered(), 11);
      await page.locator('#poetry-help > summary').click();
      await page.locator('#poetry-original').click();
      assert.equal(await covered(), 0);
      await page.locator('#poetry-dialog .close').click();
      assert.deepEqual(await page.evaluate(() => window.DeblockDocument.snapshot().blackout.covered), [4, 5, 6, 8, 9, 14, 15, 16, 17, 18, 19], 'cancel preserves the saved selection');
      await page.locator('#finish-dialog .close').click();
      await page.locator('#site-menu > summary').click();
      await page.locator('#open-story').click();
      const outline = page.locator('#story-outline');
      for (const selector of ['#story-dialog h1', '#story-outline', '#story-start']) {
        assert.equal(await page.locator(selector).evaluate(el => getComputedStyle(el).fontStyle), 'normal');
      }
      assert.equal(await outline.evaluate(el => getComputedStyle(el).caretColor), 'rgb(0, 0, 0)');
      await outline.fill('Lily leaves'); await outline.press('End'); await outline.press('Enter');
      assert.equal(await page.locator('#outline-mirror > div').count(), 2);
      await outline.press('Enter');
      assert.equal(await page.locator('#outline-mirror > div').count(), 3, 'blank newline gets a marker');
      await outline.press('Backspace');
      assert.equal(await page.locator('#outline-mirror > div').count(), 2);
      const lines = ['Lily decides to visit the pier and watches the distant boats drift slowly past the shore', 'Matt waits', '<script>literal words</script>'];
      await outline.fill(lines.join('\n'));
      assert.equal(await page.locator('#outline-mirror > div').count(), 3, 'wrapping does not create another marker');
      assert.equal(await outline.inputValue(), lines.join('\n'));
      assert.equal(await page.locator('#outline-mirror').getAttribute('aria-hidden'), null);
      assert.equal(await page.locator('.outline-markers').getAttribute('aria-hidden'), 'true');
      const metrics = await page.evaluate(() => {
        const input = document.getElementById('story-outline'), mirror = document.getElementById('outline-mirror');
        return { inputWidth: input.clientWidth, mirrorWidth: mirror.getBoundingClientRect().width, inputHeight: input.scrollHeight, mirrorHeight: mirror.scrollHeight,
          marker: getComputedStyle(mirror.firstElementChild, '::before').content };
      });
      assert.equal(metrics.inputWidth, metrics.mirrorWidth);
      assert.ok(metrics.mirrorHeight <= metrics.inputHeight + 1);
      assert.equal(metrics.marker, '">"');
      await page.screenshot({ path: `${output}/${width}-outline.png`, fullPage: true });
      await outline.fill(Array.from({ length: 25 }, (_, i) => `Passage ${i} with a long thought that may wrap over several lines`).join('\n'));
      await outline.evaluate(el => { el.scrollTop = el.scrollHeight; el.dispatchEvent(new Event('scroll')); });
      assert.equal(await page.locator('#outline-mirror > div').count(), 25);
      assert.equal(await page.evaluate(() => document.getElementById('outline-mirror').style.transform), await outline.evaluate(el => `translateY(${-el.scrollTop}px)`));
      await outline.fill(lines.join('\n'));
      await page.locator('#story-start').click();
      assert.deepEqual(await page.evaluate(() => window.DeblockDocument.snapshot().story.beats.map(beat => beat.text)), lines);
      await word.fill('The boats drift');
      await page.locator('#next-beat').click();
      await word.fill('They meet');
      await page.locator('#finish').click();
      assert.equal(await page.locator('#chain-summary').innerText(), 'The boats drift\n\nThey meet');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.deepEqual(writes, [], 'writing and guest saves stay local');
      assert.deepEqual(errors, [], 'no browser or console errors');
      console.log(`PASS ${width}px: character and space drag, toggle/keyboard, save/reload/cancel, PNG/PDF, plain beats, newline/wrap/scroll markers, black carets, stop/review, no writes/errors`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
