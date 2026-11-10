// Menu navigation owns tab-only drafts; writing state remains behind Document.
(function (root) {
  'use strict';
  const get = id => document.getElementById(id);
  const tools = root.DeblockWritingTools;
  const drafts = new Map();
  let editingOutline = false;
  const modeOf = entry => entry.story ? 'story' : entry.aphorism ? 'aphorism' : 'free';
  const hasContent = entry => Boolean(entry.story || entry.words.some(Boolean) || entry.draft || entry.blackout);
  const blank = story => ({ title: 'Untitled', words: [], draft: '', arrows: !story, story, artwork: null, blackout: null });
  const outlineInput = get('story-outline');
  const outlineMirror = get('outline-mirror');
  function syncOutlineMarkers() {
    outlineMirror.replaceChildren();
    for (const text of (outlineInput.value || outlineInput.placeholder || '').split('\n')) {
      const line = document.createElement('div');
      line.textContent = text || '\u200b';
      outlineMirror.append(line);
    }
    outlineMirror.style.width = `${outlineInput.clientWidth}px`;
    outlineMirror.style.transform = `translateY(${-outlineInput.scrollTop || 0}px)`;
  }
  outlineInput.addEventListener('input', syncOutlineMarkers);
  outlineInput.addEventListener('scroll', () => {
    outlineMirror.style.transform = `translateY(${-outlineInput.scrollTop}px)`;
  });
  if (root.ResizeObserver) new root.ResizeObserver(syncOutlineMarkers).observe(outlineInput);
  function closeMenu() { get('site-menu').open = false; }
  let switching = false;
  async function switchMode(mode) {
    if (switching) return;
    switching = true;
    closeMenu();
    get('art-status').textContent = '';
    try {
      const current = root.DeblockDocument.snapshot();
      drafts.set(modeOf(current), current);
      if (mode === 'story' && !drafts.has('story')) { outline(false); return; }
      if (modeOf(current) !== mode) {
        const next = drafts.get(mode) || (mode === 'aphorism' ? await root.DeblockAphorisms.create() : blank(null));
        await root.DeblockDocument.load(next);
      }
      root.DeblockDocument.focus();
    } catch (error) { get('art-status').textContent = error.message; }
    finally { switching = false; }
  }
  function outline(edit) {
    editingOutline = edit;
    const entry = root.DeblockDocument.snapshot();
    root.DeblockResearch?.outline();
    if (edit) get('story-outline').value = entry.story.beats.map(beat => beat.text).join('\n');
    get('story-outline-note').textContent = edit
      ? 'Edit the wording of each beat. Keep the same order and number of lines so each passage stays in place.'
      : 'One beat per line. Arrange them in story order before starting. You decide when each passage is ready.';
    get('story-outline-note').classList.toggle('sr-only', !edit);
    get('story-start').textContent = edit ? 'keep these beats' : 'start writing';
    get('new-story').hidden = !edit;
    get('story-outline-status').textContent = '';
    get('story-help').open = false;
    showDialog(get('story-dialog'));
    syncOutlineMarkers();
  }
  function refresh() {
    const entry = root.DeblockDocument.snapshot();
    const story = entry.story;
    const aphorism = entry.aphorism;
    const textMode = aphorism?.mode === 'text';
    for (const id of ['aphorism-heading', 'aphorism-prompt', 'aphorism-toggle']) get(id).hidden = !aphorism;
    get('aphorism-text').hidden = !textMode;
    get('word-space').hidden = textMode;
    get('aphorism-toggle').ariaPressed = String(textMode);
    get('aphorism-toggle').textContent = textMode ? 'normal text box on' : 'normal text box off';
    get('open-aphorism').setAttribute('aria-current', aphorism ? 'page' : 'false');
    document.body.classList.toggle('aphorism-mode', Boolean(aphorism));
    if (aphorism) {
      get('exercise-title').textContent = 'Aphorism of the Day';
      get('instructions').textContent = 'Read today’s aphorism. Follow the first word it brings to mind, or switch to the normal text box to write freely. You can stop whenever you like. Your quote stays with this draft.';
    } else if (exercise) {
      get('exercise-title').textContent = exercise.title;
      get('instructions').textContent = exercise.instructions;
    }
    for (const id of ['story-context', 'story-advance', 'previous-beat', 'edit-outline']) get(id).hidden = !story;
    get('keyboard-help').textContent = textMode
      ? 'Write with spaces and paragraphs. Switch the normal text box off to return to one word at a time. Find your response under done.'
      : story
      ? 'Space moves to the next word. Enter moves to the next beat. Open outline to see your beats, or done to read your story.'
      : 'Space or Enter moves to the next word. Find your chain under done.';
    get('open-story').setAttribute('aria-current', story ? 'page' : 'false');
    get('open-free').setAttribute('aria-current', story || aphorism ? 'false' : 'page');
    document.body.classList.toggle('story-mode', Boolean(story));
    root.DeblockArt?.setAvailable?.(!story && !aphorism);
    if (!story) return;
    get('word').placeholder = '';
    get('story-progress').textContent = `passage ${story.active + 1} of ${story.passages.length}`;
    get('beat-from').textContent = story.beats[story.active].text;
    get('beat-to').textContent = story.beats[story.active + 1].text;
    get('previous-beat').disabled = story.active === 0;
    get('next-beat').textContent = 'press ↵ for next beat';
    get('next-beat').disabled = story.active === story.passages.length - 1;
  }
  function reviewState() {
    const entry = root.DeblockDocument.snapshot();
    get('open-poetry').hidden = Boolean(entry.story || entry.aphorism);
    get('arrows-toggle').hidden = Boolean(entry.aphorism);
    get('review-outline').hidden = !entry.story;
    get('review-outline-list').replaceChildren();
    if (entry.story) for (const beat of entry.story.beats) {
      const item = document.createElement('li'); item.textContent = beat.text;
      get('review-outline-list').append(item);
    }
  }
  get('open-aphorism').addEventListener('click', () => switchMode('aphorism'));
  get('open-story').addEventListener('click', () => switchMode('story'));
  get('open-free').addEventListener('click', () => switchMode('free'));
  get('edit-outline').addEventListener('click', () => outline(true));
  get('new-story').addEventListener('click', () => {
    get('story-dialog').close();
    get('story-outline').value = '';
    outline(false);
  });
  get('story-outline-form').addEventListener('submit', async event => {
    event.preventDefault();
    try {
      const value = tools.createStory(get('story-outline').value);
      const current = root.DeblockDocument.snapshot();
      if (editingOutline) {
        if (value.beats.length !== current.story.beats.length) throw new Error('Keep the same number of beats; your passages stay attached to these lines.');
        current.story.beats.forEach((beat, index) => { beat.text = value.beats[index].text; });
        await root.DeblockDocument.load(current);
      } else {
        if (current.story && !root.confirm('Start a new story? Save the current story first if you want to keep it.')) return;
        drafts.set(modeOf(current), current);
        await root.DeblockDocument.load(blank(value));
        root.DeblockResearch?.newStory();
      }
      get('story-dialog').close();
      root.DeblockDocument.focus();
    } catch (error) { get('story-outline-status').textContent = error.message; }
  });
  get('previous-beat').addEventListener('click', () => root.DeblockDocument.movePassage(root.DeblockDocument.snapshot().story.active - 1));
  get('next-beat').addEventListener('click', () => {
    const story = root.DeblockDocument.snapshot().story;
    if (story.active < story.passages.length - 1) root.DeblockDocument.movePassage(story.active + 1);
  });
  root.DeblockModes = {
    refresh, reviewState,
    async reset(mode) {
      drafts.delete(mode);
      if (mode === 'story') {
        outlineInput.value = '';
        await root.DeblockDocument.load(drafts.get('free') || blank(null));
        outline(false);
      } else refresh();
    },
    hasDrafts: () => get('story-outline').value.trim() || [...drafts.values()].some(hasContent),
    async openEntry(entry) {
      const current = root.DeblockDocument.snapshot();
      const mode = modeOf(entry);
      const existing = modeOf(current) === mode ? current : drafts.get(mode);
      const content = value => JSON.stringify([value.words, value.draft, value.story, value.blackout, value.aphorism, value.title]);
      if (existing && hasContent(existing) && content(existing) !== content(entry) &&
          !root.confirm('Replace the draft in this writing mode with the saved entry? Cancel to save your draft first.')) return false;
      drafts.set(modeOf(current), current);
      root.DeblockResearch?.privateEntry(entry.id);
      await root.DeblockDocument.load(entry);
      drafts.set(mode, entry);
      for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
      root.DeblockDocument.focus();
      return true;
    },
  };
  refresh();
})(window);
