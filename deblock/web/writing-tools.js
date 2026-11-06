// R.11/R.12: pure, detached state operations shared by UI and contract tests.
(function (root) {
  'use strict';
  const copy = value => JSON.parse(JSON.stringify(value));
  function createStory(outline, id = () => crypto.randomUUID()) {
    const lines = outline.split(/\r?\n/u).map(line => line.trim()).filter(Boolean);
    if (lines.length < 2 || lines.length > 100) throw new Error('Add between two and 100 beats, one per line.');
    if (lines.some(line => line.length > 1000)) throw new Error('Keep each beat under 1,001 characters.');
    const beats = lines.map(text => ({ id: id(), text }));
    return { version: 1, beats, active: 0, passages: beats.slice(0, -1).map((beat, index) => ({
      from: beat.id, to: beats[index + 1].id, words: [], draft: '',
    })) };
  }
  function captureStory(story, words, draft) {
    const next = copy(story);
    next.passages[next.active].words = [...words];
    next.passages[next.active].draft = draft;
    return next;
  }
  function moveStory(story, active) {
    if (!Number.isInteger(active) || active < 0 || active >= story.passages.length) throw new Error('Choose an existing passage.');
    return { ...copy(story), active };
  }
  function passageText(passage, arrows) {
    const words = [...passage.words];
    if (passage.draft.trim()) words.push(passage.draft.trim());
    return words.join(arrows ? ' → ' : ' ');
  }
  function storyText(story, arrows) {
    return story.passages.map(passage => passageText(passage, arrows)).join('\n\n');
  }
  function storyWords(story) {
    return story.passages.flatMap(passage => [...passage.words, ...(passage.draft ? [passage.draft] : [])]);
  }
  function poetryTokens(entry) {
    return [...entry.words, entry.draft || ''].flatMap(word => word.split(/\s+/u).filter(Boolean));
  }
  function poetryText(entry) {
    return poetryTokens(entry).join(' ');
  }
  function poetryCharacters(entry) {
    return Array.from(poetryText(entry));
  }
  function characterSelection(entry, selection) {
    if (!selection || selection.version === 2) {
      return selection ? copy(selection) : { version: 2, style: 'blackout', covered: [] };
    }
    const kept = new Set(selection.kept);
    const covered = [];
    let character = 0;
    poetryTokens(entry).forEach((word, wordIndex, words) => {
      for (const _ of Array.from(word)) {
        if (!kept.has(wordIndex)) covered.push(character);
        character += 1;
      }
      if (wordIndex < words.length - 1) character += 1;
    });
    return { version: 2, style: 'blackout', covered };
  }
  function poemText(entry, selection) {
    if (selection.version === 2) {
      const covered = new Set(selection.covered);
      return poetryCharacters(entry).filter((_, index) => !covered.has(index)).join('');
    }
    const kept = new Set(selection.kept);
    return poetryTokens(entry).filter((_, index) => kept.has(index)).join(' ');
  }
  const api = { copy, createStory, captureStory, moveStory, passageText, storyText, storyWords,
    poetryTokens, poetryText, poetryCharacters, characterSelection, poemText };
  root.DeblockWritingTools = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
