// Run only against an explicitly enabled, isolated local test writer.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.DEBLOCK_TEST_URL || 'http://127.0.0.1:8049';
assert.equal(new URL(base).hostname, '127.0.0.1');
(async () => {
  const browser = await chromium.launch({channel:'chrome', headless:true});
  try {
    const context = await browser.newContext({viewport:{width:390,height:844}, reducedMotion:'reduce'});
    const p = await context.newPage();
    const records = [], errors = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('dialog', d => d.accept());
    p.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_INTERNET_DISCONNECTED')) errors.push(m.text()); });
    p.on('request', r => {
      if (r.url().includes('/api/research/sessions/')) records.push(r.postDataJSON());
    });
    const menu = async id => { await p.locator('#site-menu summary').click(); await p.locator('#'+id).click(); };
    const settings = () => p.locator('#research-open').click();
    const closeSettings = () => p.locator('#research-dialog .close').click();
    const finish = async mode => {
      const saved = p.waitForResponse(r => r.url().includes('/research/sessions/') &&
        r.request().postDataJSON().mode === mode && r.request().postDataJSON().outcome === 'completed');
      await p.locator(mode === 'blackout' ? '#poetry-apply' : '#finish').click();
      assert.equal((await saved).status(), 200);
    };
    await p.goto(base);
    assert.equal(await p.locator('#personalization-notice').count(), 0);
    assert.equal(await p.evaluate(() => localStorage.getItem('deblock.research.v1')), null);
    await settings();
    await p.locator('#accept-terms').click();
    await p.locator('#terms-accepted').waitFor();
    assert.equal(await p.locator('#research-writing').isChecked(), false);
    await closeSettings();
    await p.locator('#word').fill('private existing draft');
    await p.locator('#finish').click();
    await p.locator('#finish-dialog .save-menu > summary').click();
    await p.locator('#save-entry').click();
    await p.getByText('Saved to library in this browser.').waitFor();
    await p.locator('#resume').click();
    await settings();
    assert.equal(await p.locator('#research-personalize').count(), 0);
    assert.equal(await p.locator('#research-writing').isChecked(), false);
    assert(records.some(r => r.personalize));
    assert(records.every(r => !r.behavior && !r.writing && !JSON.stringify(r).includes('private existing')));
    await p.locator('#research-writing').check();
    await p.locator('#research-save').click();
    await p.getByText('Choices confirmed.').waitFor();
    const identity = await p.evaluate(() => JSON.parse(localStorage.getItem('deblock.research.v1')).id);
    await closeSettings();
    await finish('free');
    assert(!records.some(r => JSON.stringify(r).includes('private existing')));
    await p.reload();
    await p.locator('#research-open').waitFor({state:'attached'});
    await p.waitForFunction(() => document.querySelector('#research-writing').checked);
    await settings();
    await p.locator('#research-writing:checked').waitFor();
    await closeSettings();
    await p.locator('#open-library').click();
    await p.locator('.entry-card').first().click();
    await p.locator('#continue-entry').click();
    await finish('free');
    assert(!records.some(r => JSON.stringify(r).includes('private existing')));
    await p.locator('#resume').click();
    await p.locator('#reset').click();
    await p.locator('#confirm-reset').click();
    await p.locator('#word').pressSequentially('rain ');
    await p.locator('#word').pressSequentially('seax');
    await p.locator('#word').press('Backspace');
    await p.locator('#word').press('Enter');
    await finish('free');
    const chain = records.at(-1);
    assert.equal(chain.writing.text, 'rain sea');
    assert.equal(chain.personalize.word_band, 1);
    assert.equal(chain.personalize.start_within_two_minutes, true);
    assert.equal(chain.personalize.usefulness_rating, null);
    assert(!chain.behavior);
    const rating = p.waitForResponse(r => r.url().includes('/research/sessions/') &&
      r.request().postDataJSON().personalize?.usefulness_rating === 4);
    await p.locator('#pilot-feedback [data-rating="4"]').click();
    assert.equal((await rating).status(), 200);
    await p.locator('#open-poetry').click();
    await p.locator('#poetry-words button').first().press('Space');
    await finish('blackout');
    assert.equal(records.filter(r => r.mode === 'blackout').at(-1).writing.text, 'ain sea');
    await p.locator('#finish-dialog .close').click();
    await menu('open-story');
    await p.locator('#story-outline').fill('one\ntwo\nthree');
    await p.locator('#story-start').click();
    await p.locator('#word').pressSequentially('passage ');
    await p.locator('#next-beat').click();
    await finish('story');
    const story = records.at(-1);
    assert.equal(story.writing.story.beats.length, 3);
    assert.equal(story.personalize.word_band, 1);
    await p.locator('#finish-dialog .close').click();
    await menu('open-aphorism');
    await p.locator('#aphorism-toggle').click();
    await p.locator('#aphorism-text').fill('synthetic response');
    await finish('aphorism');
    assert.equal(records.at(-1).writing.text, 'synthetic response');
    assert(records.at(-1).writing.aphorism.id);
    assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('deblock.research.v1')).id), identity);
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await p.locator('#finish-dialog .close').click();
    // A terminal snapshot survives a failed send and is retried with the same revision.
    await p.locator('#aphorism-text').pressSequentially(' synthetic tail');
    await context.setOffline(true);
    await p.locator('#finish').click();
    await p.waitForFunction(() => Object.keys(localStorage).some(k => k.startsWith('deblock.research.pending.') &&
      JSON.parse(localStorage[k]).data.outcome === 'completed'));
    const replay = p.waitForResponse(r => r.url().includes('/research/sessions/') && r.ok() &&
      r.request().postDataJSON().writing?.text?.includes('synthetic tail'));
    await context.setOffline(false);
    await replay;
    await p.locator('#resume').click();

    if (process.env.DEBLOCK_TEST_SESSION_FILE) {
      // The fixture is a disposable verified Django test account on this loopback server.
      await context.addCookies([{name:'deblock-session', value:fs.readFileSync(process.env.DEBLOCK_TEST_SESSION_FILE, 'utf8').trim(), url:base}]);
      await p.goto(base);
      await p.locator('#word').fill('library fixture');
      await finish('free');
      await p.locator('#finish-dialog .save-menu > summary').click();
      await p.locator('#save-entry').click();
      await p.getByText('Saved to library.', {exact:true}).waitFor();
      await p.locator('#resume').click();
      await p.locator('#open-library').click();
      await p.locator('.entry-card').first().click();
      await p.locator('#edit-entry').click();
      await p.locator('#edit-entry-text').fill('old library revision');
      const privateSave = p.waitForResponse(r => r.url().includes('/research/sessions/') &&
        r.request().postDataJSON().mode === 'library_edit' && r.request().postDataJSON().outcome === 'completed');
      await p.locator('#edit-entry-form button').click();
      assert.equal((await privateSave).status(), 200);
      assert(!records.filter(r => r.mode === 'library_edit').some(r => r.writing));
      await p.locator('#edit-entry').click();
      await p.locator('#research-share-edit').click();
      await p.locator('#edit-entry-text').fill('synthetic revised text');
      const sharedSave = p.waitForResponse(r => r.url().includes('/research/sessions/') &&
        r.request().postDataJSON().writing?.text === 'synthetic revised text');
      await p.locator('#edit-entry-form button').click();
      assert.equal((await sharedSave).status(), 200);
      await p.locator('#entry-dialog .close').click();
      await p.locator('#library-dialog .close').click();
    }
    await settings();
    await p.locator('#research-dialog details summary').click();
    const recoveryKey = await p.locator('#research-key').inputValue();
    const other = await browser.newContext();
    const recovered = await other.newPage();
    recovered.on('dialog', d => d.accept());
    await recovered.goto(base + '/guest/#research');
    await recovered.locator('#research-open').click();
    await recovered.locator('#research-dialog details summary').click();
    await recovered.locator('#research-key').fill(recoveryKey);
    await recovered.locator('#research-recover').click();
    await recovered.getByText('Choices confirmed.').waitFor();
    assert.equal(await recovered.evaluate(() => JSON.parse(localStorage.getItem('deblock.research.v1')).id), identity);
    // An offline withdrawal is durable and prevents collection before acknowledgement.
    await recovered.locator('#research-writing').uncheck();
    await other.setOffline(true);
    await recovered.locator('#research-save').click();
    await recovered.getByText(/Changes are pending/).waitFor();
    await other.setOffline(false);
    await recovered.getByText('Choices confirmed.').waitFor();
    assert.equal(await recovered.locator('#research-writing').isChecked(), false);
    await recovered.locator('#research-delete').click();
    await recovered.getByText('Research records deleted.').waitFor();
    await recovered.goto(base + '/guest/');
    await recovered.locator('#word:not([disabled])').waitFor();
    assert.equal(await recovered.evaluate(() => localStorage.getItem('deblock.personalization.off')), '1');
    assert.equal(await recovered.evaluate(() => localStorage.getItem('deblock.research.v1')), null);
    await other.close();
    assert.deepEqual(errors, []);
    console.log('Research browser checks passed, including offline retry, recovery and withdrawal.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode=1; });
