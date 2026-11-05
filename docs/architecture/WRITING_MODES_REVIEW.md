# Writing-mode journey review

2026-11-05. Fictional scenarios with synthetic writing, not real-user research.
Chrome browser checks ran at laptop 1280×900 and phone viewport 390×844 with
reduced motion enabled. Phone checks emulate a viewport, not physical touch
hardware. Console errors, original-text preservation, outgoing writes, downloads
and horizontal overflow were checked. No new animation or effects toggle exists
in this increment, so there is no new animation/toggle to exercise.

Alex is a returning laptop writer; Mara is a first-time phone writer. Each ran
the same steps against the real isolated account backend. Account HTTP mocks
were also used for the main journey. R.11/US.11 and R.12/US.12 map to the shared
`tests/writing_modes_browser.cjs` checks. Screenshots below capture representative
states; save/reopen and restoration are verified by browser assertions.

| Step / person | Action and check | Result | Screenshot |
|---|---|---|---|
| 1 / Alex | Open Story Beats from menu above Profile; submit one beat; see corrective message, then enter three beats | PASS | [Laptop correction](evidence/writing-modes/laptop-outline-correction.png) |
| 1 / Mara | Repeat on phone; outline field and correction remain readable | PASS | [Phone correction](evidence/writing-modes/phone-outline-correction.png) |
| 2 / Alex | Advance an empty passage, return, type two passages, revisit first; unfinished “rings” remains; Tab retains it | PASS | [Laptop writing](evidence/writing-modes/laptop-story-writing.png) |
| 2 / Mara | Repeat on phone; switch modes and return without uploading drafts or losing text | PASS | [Phone writing](evidence/writing-modes/phone-story-writing.png) |
| 3 / Alex | Done shows both passages in order without inserting outline sentences | PASS | [Laptop review](evidence/writing-modes/laptop-story-review.png) |
| 3 / Mara | Done shows the same readable story on the phone | PASS | [Phone review](evidence/writing-modes/phone-story-review.png) |
| 4 / Alex | Inject save failure; retain entire story; retry, reload, open Library and continue at same passage | PASS | [Laptop save recovery](evidence/writing-modes/laptop-save-recovery.png) |
| 4 / Mara | Repeat failure and recovery with unchanged unfinished input | PASS | [Phone save recovery](evidence/writing-modes/phone-save-recovery.png) |
| 5 / Alex | Select “rain” with keyboard and “sea” by click; highlight view and ordered poem preview agree | PASS | [Laptop highlights](evidence/writing-modes/laptop-highlight.png) |
| 5 / Mara | Select words on narrow screen; controls and selected state remain visible | PASS | [Phone highlights](evidence/writing-modes/phone-highlight.png) |
| 6 / Alex | Black out remaining words; save, export PNG/PDF and reopen selection; cancel edits, then restore full original | PASS | [Laptop blackout](evidence/writing-modes/laptop-blackout.png) |
| 6 / Mara | Repeat; downloaded signatures valid, no horizontal overflow or unexpected console errors | PASS | [Phone blackout](evidence/writing-modes/phone-blackout.png) |

The PNG exports were visually inspected: only title and chosen poetry view remain,
without editor buttons. PDF generation/download passed and uses the same raster
export pipeline; PDFs were not separately rendered page-by-page in this task.
No native mobile keyboard, screen-reader session or production-provider test was
performed. These checks do not establish demand or writing effectiveness.
