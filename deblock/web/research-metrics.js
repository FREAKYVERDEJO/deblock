// Numeric interaction summaries only. Times are milliseconds on a foreground clock.
class ResearchMetrics {
  constructor() {
    this.events = {word_ms: [], pause_durations_ms: [], correction_ms: [], transition_ms: [], transition_to: [], passage_ms: [], features: {}};
    this.deleted = 0;
    this.selectionChanges = 0;
    this.active = 0;
    this.longest = 0;
    this.pauses = 0;
    this.lastEdit = null;
    this.correcting = false;
  }
  edit(t, deleted = 0) {
    if (this.lastEdit !== null) {
      const gap = t - this.lastEdit;
      this.active += Math.min(5000, gap);
      this.longest = Math.max(this.longest, gap);
      if (gap > 5000) {
        this.pauses++;
        this.events.pause_durations_ms.push(gap);
        this.correcting = false;
      }
    }
    this.lastEdit = t;
    if (deleted) {
      if (!this.correcting) this.events.correction_ms.push(t);
      this.correcting = true;
      this.deleted += deleted;
    }
  }
  words(count, t) {
    if (!count) return;
    this.edit(t);
    for (let i = 0; i < count; i++) this.events.word_ms.push(t);
    this.correcting = false;
  }
  pause() {
    this.lastEdit = null;
    this.correcting = false;
  }
  summary(duration, finalWords) {
    const times = this.events.word_ms;
    const gaps = times.slice(1).map((v, i) => v - times[i]).sort((a,b) => a-b);
    const middle = Math.floor(gaps.length / 2);
    return {duration_ms: duration, active_ms: this.active, first_word_ms: times[0] ?? null,
      words_written: times.length, final_words: finalWords,
      rate_per_min: this.active ? times.length * 60000 / this.active : null,
      median_interval_ms: gaps.length ? (gaps[middle] + gaps[(gaps.length - 1) >> 1]) / 2 : null,
      mean_interval_ms: gaps.length ? (times.at(-1) - times[0]) / gaps.length : null,
      longest_pause_ms: this.longest, pauses: this.pauses, deleted_chars: this.deleted,
      corrections: this.events.correction_ms.length,
      corrections_per_word: times.length ? this.events.correction_ms.length / times.length : null};
  }
}
if (typeof module !== 'undefined') module.exports = ResearchMetrics;
