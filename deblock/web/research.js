// Django supplies this script only on the same-origin writer.
(() => {
  'use strict';
  const get = id => document.getElementById(id);
  const bootstrap = document.querySelector('meta[name="research"]');
  const enabled = bootstrap.dataset.enabled === '1';
  const identityKey = 'deblock.research.v1';
  const defaultsOff = 'deblock.personalization.off';
  const scopesInSettings = ['behavior', 'writing'];
  const newKey = () => Array.from(crypto.getRandomValues(new Uint8Array(32)),
    n => n.toString(16).padStart(2, '0')).join('');
  const prefix = 'deblock.research.pending.';
  const writer = window.DeblockDocument;
  const tools = window.DeblockWritingTools;
  const count = value => (value.match(/\S+/gu) || []).length;
  const status = message => { get('research-status').textContent = message; };
  let person, session, before, freshOutline = false, ready = false, busy = false;
  const allowed = new Map();
  const seenDrafts = new Set();
  let reviewSnapshot;
  const feedback = get('pilot-feedback');
  const include = id => { if (!allowed.has(id)) allowed.set(id, crypto.randomUUID()); };
  const sending = new Set();
  const volatile = new Map();
  const dialog = get('research-dialog');
  const selected = scope => ready && person?.scopes.includes(scope);
  let libraryEditId;
  function snap() {
    if (!libraryEditId) return writer.snapshot();
    return {id: libraryEditId, words: [], draft: get('edit-entry-text').value,
      title: get('edit-entry-title').value, arrows: false};
  }
  const snapshotText = e => e.story ? tools.storyText(e.story, false)
    : e.aphorism ? e.words.join('') + e.draft : tools.poetryText(e);
  function stored() {
    try { return JSON.parse(localStorage.getItem(identityKey)); } catch { return null; }
  }
  function pendingKeys() {
    return [...new Set([...Object.keys(localStorage), ...volatile.keys()])].filter(k => k.startsWith(prefix));
  }
  function drop(key) { localStorage.removeItem(key); volatile.delete(key); }
  async function post(path, data, key) {
    const response = await fetch('/api/research/' + path + '/', {method: 'POST', credentials: 'same-origin',
      headers: {'Content-Type': 'application/json', 'X-CSRFToken': bootstrap.content, 'X-Research-Key': key},
      body: JSON.stringify(data)});
    if (!response.ok) throw Object.assign(new Error('Research request failed.'), {status: response.status});
    return response.json();
  }
  async function flush() {
    if (!ready || !enabled || !person || stored()?.pending) return;
    for (const key of pendingKeys()) {
      if (!ready || !person || stored()?.pending) return;
      if (sending.has(key)) continue;
      const raw = volatile.get(key) ?? localStorage.getItem(key);
      if (!raw) continue;
      const item = JSON.parse(raw);
      if (item.owner !== person.id || item.data.generation !== person.generation) { drop(key); continue; }
      sending.add(key);
      try {
        await post(item.path || 'sessions/' + key.slice(prefix.length), item.data, person.key);
        if ((volatile.get(key) ?? localStorage.getItem(key)) === raw) drop(key);
      } catch (e) {
        status('Research save pending. Open settings to check your choices or retry.');
        if (e.status === 403) { ready = false; session = null; }
      } finally { sending.delete(key); }
    }
  }
  function foreground() {
    if (document.hidden) return false;
    if (session?.mode === 'library_edit') return get('edit-entry-dialog').open;
    return session?.mode === 'blackout' ? get('poetry-dialog').open :
      !document.querySelector('dialog[open]');
  }
  function tick() {
    const now = performance.now();
    if (session.running) session.elapsed += now - session.tick;
    session.tick = now;
    session.running = foreground();
    if (!session.running) session.measure.pause();
    return Math.round(session.elapsed);
  }
  function begin(mode, e) {
    if (!enabled || !ready || !person?.scopes?.length) return;
    if (!selected('personalize') && !selected('behavior') && !allowed.has(e.id)) return;
    const now = performance.now();
    session = {id: crypto.randomUUID(), mode, start: new Date().toISOString(), origin: now,
      revision: 0, elapsed: 0, tick: now, running: false, measure: new ResearchMetrics(),
      beat: e.story?.active, beatSince: 0, dirty: true};
    session.running = foreground();
  }
  function loaded(freshOpening = true) {
    if (!ready || !enabled || session) return;
    const e = snap();
    if (libraryEditId) { begin('library_edit', e); return; }
    if (selected('writing') && !e.story && !e.blackout && !e.words.some(Boolean) && !e.draft && e.title === 'Untitled') include(e.id);
    begin(e.story ? 'story' : e.aphorism ? 'aphorism' : 'free', e);
    if (session?.mode === 'free' && freshOpening && (selected('personalize') || selected('behavior')) && !seenDrafts.has(e.id)
        && !e.words.some(Boolean) && !e.draft && !e.blackout && e.title === 'Untitled') {
      session.pilot = {origin: null, firstInput: null, windowSaved: false};
      observeOpening();
    }
    seenDrafts.add(e.id);
  }
  function ensure() { if (!session) loaded(false); return session; }
  function observeOpening() {
    const pilot = session?.pilot;
    if (pilot && pilot.origin === null && foreground() && !get('word').disabled) {
      pilot.origin = performance.now();
      checkpoint();
    }
  }
  function observeInput(inserted) {
    const pilot = session?.pilot;
    if (pilot && pilot.origin !== null && pilot.firstInput === null && /\S/u.test(inserted || '')) {
      pilot.firstInput = Math.round(performance.now() - pilot.origin);
    }
  }
  function edit(deleted = 0) {
    if (!ensure()) return;
    session.dirty = true;
    if (selected('behavior')) session.measure.edit(tick(), deleted);
  }
  function words(n) {
    if (!n || !ensure()) return;
    session.dirty = true;
    if (selected('behavior')) session.measure.words(n, tick());
  }
  function accrueBeat(t) {
    if (session.beat === undefined) return;
    const times = session.measure.events.passage_ms;
    while (times.length <= session.beat) times.push(0);
    times[session.beat] += t - session.beatSince;
    session.beatSince = t;
  }
  function checkpoint(outcome = 'open') {
    if (!session || !ready || (!session.dirty && outcome === 'open')) return;
    const e = snap(), t = tick(), m = session.measure;
    const elapsed = Math.round(performance.now() - session.origin);
    const data = {schema: 1, app_version: bootstrap.dataset.app, participant: person.id, generation: person.generation, mode: session.mode, revision: ++session.revision,
      start: session.start, end: outcome === 'open' ? null : new Date(Date.parse(session.start) + elapsed).toISOString(), outcome};
    let text = libraryEditId ? e.draft : snapshotText(e);
    const writing = {title: e.title};
    const extras = {};
    const pilot = session.pilot;
    if (pilot && pilot.origin !== null) {
      extras.first_input_ms = pilot.firstInput;
      extras.observation_ms = Math.round(performance.now() - pilot.origin);
      pilot.windowSaved = extras.observation_ms >= 120000;
      if (outcome === 'completed') extras.usefulness_rating = null;
    }
    if (session.mode === 'blackout') {
      const source = session.source;
      writing.source = tools.poetryText(source);
      writing.blackout = session.selection;
      text = tools.poemText(source, session.selection);
      const covered = new Set(session.selection.covered);
      let i = 0;
      const tokens = tools.poetryTokens(source);
      extras.available_words = tokens.length;
      extras.concealed_words = tokens.filter(token => {
        const full = Array.from(token).map(() => covered.has(i++)).every(Boolean);
        i++; return full;
      }).length;
      extras.selection_changes = m.selectionChanges;
    } else if (e.story) {
      writing.story = e.story;
      extras.beats = e.story.beats.length;
      extras.passages_written = e.story.passages.filter(p => p.words.length || p.draft.trim()).length;
      accrueBeat(t);
    } else if (e.aphorism) {
      writing.aphorism = e.aphorism;
      extras.response_chars = Array.from(text).length;
    }
    if (selected('behavior')) data.behavior = {metrics: {...m.summary(elapsed, count(text)), ...extras},
      events: m.events, configuration: {arrows: e.arrows, ...(e.aphorism ? {aphorism: e.aphorism} : {})}};
    if (selected('personalize')) {
      const n = count(text);
      data.personalize = {
        word_band: [1, 10, 50, 200].filter(bound => n >= bound).length,
        duration_band: [30000, 120000, 300000, 900000].filter(bound => elapsed >= bound).length,
        start_within_two_minutes: pilot?.origin != null && pilot.firstInput !== null
          ? pilot.firstInput <= 120000 : pilot?.windowSaved ? false : null,
        usefulness_rating: null
      };
      if (!selected('behavior') && !selected('writing') && outcome === 'open') {
        const summary = JSON.stringify(data.personalize);
        if (session.lastSummary === summary) { session.dirty = false; return; }
        session.lastSummary = summary;
      }
      if (!selected('behavior')) {
        const minute = date => new Date(Math.floor(Date.parse(date) / 60000) * 60000).toISOString();
        data.start = minute(data.start);
        if (data.end) data.end = minute(data.end);
      }
    }
    if (selected('writing') && allowed.has(e.id)) {
      if (session.mode === 'free') Object.assign(writing, {words: e.words, draft: e.draft});
      data.writing = {...writing, text, document_ref: allowed.get(e.id)};
    }
    if (!data.personalize && !data.behavior && !data.writing) return;
    queue(session.id, data);
    session.dirty = false;
    return data;
  }
  function queue(id, data) {
    const key = prefix + id, raw = JSON.stringify({owner: person.id, data});
    try { localStorage.setItem(key, raw); volatile.delete(key); }
    catch { volatile.set(key, raw); status('Browser storage is full. Keep this tab open for pending research saves.'); }
    void flush();
  }
  function end(outcome) {
    const data = checkpoint(outcome);
    reviewSnapshot = null;
    if (outcome === 'completed' && session?.pilot?.origin != null && (data?.behavior || data?.personalize)) {
      reviewSnapshot = {id: session.id, data};
    }
    feedback.hidden = !reviewSnapshot;
    session = null;
    before = null;
  }
  feedback.addEventListener('click', event => {
    const value = event.target.closest('[data-rating]')?.dataset.rating;
    if (!value || !reviewSnapshot || !(selected('personalize') || selected('behavior'))) return;
    const {id, data} = reviewSnapshot;
    if (person.id !== data.participant || person.generation !== data.generation) return;
    if (data.behavior) data.behavior.metrics.usefulness_rating = Number(value);
    if (data.personalize) data.personalize.usefulness_rating = Number(value);
    data.revision++;
    queue(id, data);
    feedback.hidden = true;
    reviewSnapshot = null;
  });
  get('finish-dialog').addEventListener('close', () => { feedback.hidden = true; reviewSnapshot = null; });
  window.DeblockResearch = {end, loaded, words, observeOpening,
    bookmark(id, saved) {
      if (!enabled || !selected('personalize') || stored()?.pending) return;
      const key = prefix + 'aphorism.' + id;
      const item = {owner: person.id, path: 'aphorism', data: {
        participant: person.id, generation: person.generation, personalize: true, id, saved}};
      const raw = JSON.stringify(item);
      try { localStorage.setItem(key, raw); } catch { volatile.set(key, raw); }
      void flush();
    },
    libraryEdit() {
      if (!ready || !person?.scopes?.length) return;
      end('interrupted');
      libraryEditId = crypto.randomUUID();
      get('research-share-edit').hidden = !selected('writing');
      loaded();
    },
    outline() { freshOutline = false; },
    privateEntry(id) { allowed.delete(id); seenDrafts.add(id); },
    newStory() {
      if (freshOutline && selected('writing')) { include(snap().id); loaded(); }
      freshOutline = false;
    },
    transition(index) {
      if (!ensure() || !selected('behavior')) return;
      const t = tick();
      accrueBeat(t);
      session.beat = index;
      session.measure.pause();
      session.measure.events.transition_ms.push(t);
      session.measure.events.transition_to.push(index);
      session.dirty = true;
    },
    paste(field, inserted) { edit(Array.from(field.value.slice(field.selectionStart, field.selectionEnd)).length); observeInput(inserted); },
    blackout(source, selection) {
      end('interrupted');
      begin('blackout', source);
      if (session) { session.source = source; session.selection = tools.copy(selection); }
    },
    selection(value) {
      if (session?.mode !== 'blackout' || JSON.stringify(value.covered) === JSON.stringify(session.selection.covered)) return;
      session.selection = tools.copy(value);
      session.measure.selectionChanges++;
      edit();
    }
  };
  get('research-share-edit').addEventListener('click', () => {
    if (!selected('writing') || !libraryEditId) return;
    include(libraryEditId); loaded();
    if (session) session.dirty = true;
    checkpoint();
    get('research-share-edit').hidden = true;
  });
  get('edit-entry-dialog').addEventListener('close', () => {
    if (session?.mode === 'library_edit') end('interrupted');
    allowed.delete(libraryEditId);
    libraryEditId = null;
  });
  document.addEventListener('beforeinput', e => {
    const f = e.target;
    if (f.id === 'story-outline' && !f.value && selected('writing')) freshOutline = true;
    if (!ready || !['word','aphorism-text','edit-entry-text'].includes(f.id) || (e.isComposing && before)) return;
    ensure();
    if (!selected('behavior')) return;
    before = {field: f, length: Array.from(f.value).length,
      selected: Array.from(f.value.slice(f.selectionStart, f.selectionEnd)).length,
      boundaries: (f.value.match(/\S+\s+/gu) || []).length};
  }, true);
  function captureEdit(e) {
    const f = e.target;
    if (!ready || !['word','aphorism-text','edit-entry-text'].includes(f.id)) return;
    if (e.isComposing) return;
    const old = before?.field === f ? before : null;
    edit(old ? Math.max(old.selected, old.length - Array.from(f.value).length, 0) : 0);
    if (f.id === 'word' && (e.type === 'compositionend' || e.inputType?.startsWith('insert'))) {
      observeInput(e.data ?? f.value);
    }
    if (f.id !== 'word' && old && !e.isComposing) words(Math.max(0, (f.value.match(/\S+\s+/gu) || []).length - old.boundaries));
    before = null;
  }
  document.addEventListener('input', captureEdit, true);
  document.addEventListener('compositionend', e => { if (before) captureEdit(e); }, true);
  get('document-title').addEventListener('input', () => {
    if (selected('writing') && ensure()) session.dirty = true;
  });
  document.addEventListener('click', e => {
    const feature = e.target.closest('button')?.id;
    if (session && selected('behavior') && ['arrows-toggle','aphorism-toggle','art-toggle','art-next','edit-outline'].includes(feature)) {
      const features = session.measure.events.features;
      features[feature] = (features[feature] || 0) + 1;
      session.dirty = true;
    }
  }, true);
  get('poetry-dialog').addEventListener('close', () => { if (session?.mode === 'blackout') end('interrupted'); });
  window.addEventListener('writingpause', () => { if (session) { tick(); observeOpening(); } });
  document.addEventListener('visibilitychange', () => { if (session) { tick(); observeOpening(); if (document.hidden) checkpoint(); } });
  window.addEventListener('pagehide', () => end('interrupted'));
  window.addEventListener('pageshow', () => { if (ready) loaded(); });
  window.addEventListener('online', () => { if (stored()?.pending) void restore(); else void flush(); });
  setInterval(() => {
    const pilot = session?.pilot;
    if (pilot && pilot.origin !== null && !pilot.windowSaved && performance.now() - pilot.origin >= 120000) session.dirty = true;
    if (session && !document.hidden) checkpoint();
    void flush();
  }, 5000);

  function render() {
    get('research-open').hidden = !enabled && !person && location.hash !== '#research';
    get('research-share-edit').hidden = !libraryEditId || !selected('writing') || allowed.has(libraryEditId);
    get('other-recovery-key').hidden = !person;
    get('research-key').readOnly = !!person;
    get('accept-terms').hidden = !enabled || !!person?.scopes?.includes('personalize');
    get('terms-accepted').hidden = !person?.scopes?.includes('personalize');
    get('legacy-research').hidden = !person?.scopes?.includes('behavior');
    for (const s of scopesInSettings) get('research-' + s).checked = !!person?.scopes?.includes(s);
    get('research-key').value = person?.key || '';
    get('research-delete').hidden = !person;
    get('research-include').hidden = !selected('writing') || allowed.has(snap().id);
  }
  function stop() { feedback.hidden = true; reviewSnapshot = null; session = null; before = null; allowed.clear(); freshOutline = false; ready = false; }
  function purgeQueue(identity) {
    for (const k of pendingKeys()) {
      const item = JSON.parse(volatile.get(k) ?? localStorage.getItem(k));
      if (!identity || item.owner !== identity.id || item.data.generation !== identity.generation) drop(k);
    }
  }
  async function synchronize() {
    const local = stored();
    if (!local) { person = null; render(); return; }
    const {key, pending} = local;
    let state;
    try {
      state = await post(pending?.path || 'state', pending?.body || {}, key);
    } catch (e) {
      if (e.status === 404 && (!pending || pending.path === 'delete')) state = {deleted: true};
      else if (e.status === 409 && pending?.path === 'consent') {
        state = await post('state', {}, key);
        // A second browser changed consent. Honor pending removals without
        // re-granting anything withdrawn by that browser.
        const removed = local.scopes.filter(scope => !pending.body.scopes.includes(scope));
        const scopes = state.scopes.filter(scope => !removed.includes(scope));
        state = await post('consent', {version: pending.body.version, participant: state.id, generation: state.generation, scopes}, key);
      }
      else throw e;
    }
    // Another tab may have changed choices while this request was in flight.
    if (JSON.stringify(local) !== JSON.stringify(stored())) return;
    if (!state.scopes?.includes('personalize')) {
      for (const k of pendingKeys()) {
        const item = JSON.parse(volatile.get(k) ?? localStorage.getItem(k));
        if (item.data.personalize) drop(k);
      }
    }
    if (state.deleted) localStorage.setItem(defaultsOff, '1');
    person = state.deleted ? null : {...state, key};
    if (person) {
      if (JSON.stringify(person) !== JSON.stringify(local)) localStorage.setItem(identityKey, JSON.stringify(person));
    } else localStorage.removeItem(identityKey);
    purgeQueue(person);
    ready = true;
    loaded(); render(); void flush();
    status(state.deleted ? 'Research records deleted.' : 'Choices confirmed.');
  }
  async function update(action, scopes) {
    if (busy) return;
    busy = true;
    try {
      const local = stored();
      if (action === 'save' && local?.scopes?.includes('personalize')) scopes.push('personalize');
      if (local?.pending) {
        stop(); await synchronize(); return;
      }
      if (action === 'save' && !local && !scopes.length) { status('Research is off.'); return; }
      if (action === 'delete' && !confirm('Permanently delete all research records for this key?')) return;
      if (action === 'recover') {
        const key = get(local ? 'recover-other-key' : 'research-key').value.trim();
        if (!/^[0-9a-f]{64}$/.test(key)) { status('Enter the full private recovery key.'); return; }
        const state = await post('state', {}, key);
        if (local && local.key !== key && !confirm('Use this recovery key in this browser? Keep your current key if you want to manage its records later.')) return;
        stop();
        get('recover-other-key').value = '';
        localStorage.setItem(identityKey, JSON.stringify({...state, key}));
      } else {
        if (JSON.stringify(local) !== JSON.stringify(person)) { await restore(); return; }
        const key = local?.key || newKey();
        const path = action === 'terms' ? 'accept' : action === 'save' ? (local ? 'consent' : 'enroll') : 'delete';
        const body = {version: '3', scopes: action === 'terms' ? ['personalize'] : scopes, participant: local?.id, generation: local?.generation || 0};
        // Keep withdrawal pending across refreshes and tell other tabs to stop.
        stop();
        localStorage.setItem(identityKey, JSON.stringify({...local, key, pending: {path, body}}));
        if ((local && local.scopes.some(s => !scopes.includes(s))) || action === 'delete') purgeQueue(null);
      }
      await synchronize();
    } catch {
      status('Changes are pending. Research is paused. Reconnect and reopen settings to retry.');
    } finally { busy = false; }
  }
  async function restore() {
    stop(); person = stored(); render();
    if (!person) return;
    try { await synchronize(); }
    catch { status('Research is paused. Check your connection and reopen settings to retry.'); }
  }
  function openSettings() {
    get('site-menu').open = false; render(); showDialog(dialog);
    if (!ready && person) void restore();
  }
  get('research-open').addEventListener('click', openSettings);

  for (const action of ['terms','save','delete','recover']) {
    (action === 'terms' ? get('accept-terms') : get('research-' + action)).addEventListener('click', () => {
      const scopes = scopesInSettings.filter(s => get('research-' + s).checked);
      if (navigator.locks) void navigator.locks.request(identityKey, () => update(action, scopes));
      else void update(action, scopes);
    });
  }
  get('research-include').addEventListener('click', () => {
    if (selected('writing')) { include(snap().id); loaded(); if (session) session.dirty = true; checkpoint(); render(); status('This draft is included.'); }
  });
  window.addEventListener('storage', e => { if (e.key === identityKey || e.key === null) void restore(); });
  async function initialize() {
    try {
      const old = stored();
      if (old?.pending?.path === 'defaults') {
        // Resolve any previously created identity without replaying automatic enrollment.
        delete old.pending;
        localStorage.setItem(identityKey, JSON.stringify(old));
      }
      await restore();
    } catch { status('Browser storage is unavailable. Data collection is paused.'); }
  }
  if (enabled) get('draft-privacy').append(' See privacy in the footer for data use and writing research.');
  if (navigator.locks) void navigator.locks.request(identityKey, initialize);
  else void initialize();
})();
