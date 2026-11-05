# deblock — feature list

**Updated:** 2026-11-05  
**Purpose:** Help writers begin and develop writing in their own words, with a
small next action and freedom to stop.

“Existing” describes capabilities documented in the repository, not a fresh test
result. “Planned” describes a requested or proposed feature that is not yet built.
Requirement IDs link this list to the single
[architecture index](ARCHITECTURE.md#traceability-index).

## Writing modes

| Mode | What the writer does | Status |
|---|---|---|
| **Free association — The Signifier Chain** | Begin with a word and follow the next association, one word at a time. No outline or destination is required. | Existing; R.01–R.04 |
| **Story Beats — write between the beats** | Create a skeleton of a story, then use one-word typing to write the passages connecting each beat. Choose when to move to the next beat. | Implemented locally; R.11 |

## Existing features

| Feature | Writer-facing behavior | Reference |
|---|---|---|
| Continue without signing in | Skip the account screen and use all writing tools as a guest. Explicit saves stay in this browser; sign-in and importing local saves remain optional. | R.13 |
| Exercise instructions | Read how to begin, follow associations, and stop or change direction. | R.01 |
| Exercise loading and retry | Load The Signifier Chain; receive a clear error and retry if unavailable. | R.02 |
| One-word typing | Focus on the current word. Whitespace or Enter adds it to the chain; pasted text is split into words. | R.03 |
| Done and resume | See the whole piece, then return to the same draft. There is no timer or penalty for stopping. | R.04 |
| Confirmed reset | Cancel to keep writing, or confirm to clear the current draft while keeping saved collections. | R.04 |
| Highlight / blackout poetry | Choose words from a finished associative chain, highlight them or black out the rest, save/export the view, and restore the original. | R.12 |
| Document presentation | Edit the title and switch between arrows and continuous text without changing the words. | R.06 |
| Optional image prompts | Turn bundled artwork on or off, choose another image, and view its credits. | R.09 |
| Private Library | Explicitly save, browse and open entries; account mode also supports editing and deleting saved entries. | R.05 |
| PNG and PDF export | Download the finished document. PNG also saves to Gallery; PDF downloads only. | R.06 |
| Gallery | Browse and download saved PNGs; account mode supports deletion. | R.06 |
| Accounts and recovery | Sign up, verify email, sign in/out, and reset a password in the default account-backed app. | R.07 |
| Profile and account management | Choose a name/avatar, change account email/password, or confirm account deletion. | R.08 |
| Import older browser saves | Explicitly copy local entries/images into the selected account while retaining browser originals. | R.08 |

These features are described in [PROTOTYPE.md](PROTOTYPE.md) and
[BACKEND.md](BACKEND.md). The legacy prototype saves to this browser; the default
Django account view saves to the signed-in account. **Continue without signing
in** opens `/guest/` with browser-only storage on the same origin. Guest mode
does not upload writing or automatically import it when someone later signs in.
Unsaved writing stays in tab memory.

## Story Beats

**R.11 — A writer can turn their own story skeleton into connected passages by
writing one word at a time and advancing between beats only when ready.**

The beats provide direction. The writer supplies all the language between them.
The app does not generate transitions, decide whether a scene is complete, or
require a word count before moving on.

### 1. Set out the story

Choose **Story Beats** in the top-left dropdown, directly above **Profile**.
**Free association** switches back; each mode keeps its own draft in tab memory.
The writer enters an ordered list of short beats, one per line. For example:

1. i go to the store
2. i meet a mysterious stranger
3. i go home

Before starting, they can edit and arrange the list. The outline remains their
own text. For this first version, the default is at least two nonempty beats,
because the mode develops the passage between a starting beat and a destination.
If the list is incomplete, keep it and explain what is needed.

### 2. Write the first passage in one-word mode

The screen gives the current word the main focus, with quiet context nearby:

```text
From: i go to the store
Toward: i meet a mysterious stranger

               [ current word ]

                next beat
```

As each word is committed, the input clears for the next word and the passage
accumulates in the background. The writer can review what they have written.
The beat labels are context, not text automatically inserted into their prose.

For example, the writer might build:

> The bell above the door rings. Someone beside the oranges knows my name.

This is illustrative text, not a generated suggestion the app would show.

### 3. Move on when ready

Choosing **next beat** keeps the passage and moves the story forward:

```text
From: i meet a mysterious stranger
Toward: i go home

               [ current word ]

                  finish
```

With three beats there are two passages to develop. The user controls the
transition: no automatic advancement, timer, minimum word count or judgment of
whether they have reached the next story event. They may leave a passage empty
and return to it later.

If a word is still being typed when **next beat** is chosen, retain it with the
passage being left. Never move that word into the next passage or discard it.

### 4. Revisit, stop or finish

- **Previous passage:** return to an earlier passage with
  its words and unfinished input intact; navigating back does not create copies.
- **Done / resume:** review the piece at any point and return to the same place.
  Stopping early is allowed.
- **Finish:** after the passage leading to the final beat, review the connected
  story. There is no required passage after the final beat in the first version.
- **Review:** see passages in outline order, with beat labels available as
  context. A prose view contains the writer's passages without automatically
  inserting the outline sentences or inventing missing connections.
- **Save and export:** use explicit Library saves and existing export choices.
  Open a Library entry and choose **continue writing** to restore its outline,
  passages, active position and unfinished input. Saved stories use a versioned
  structure; older free-association entries still open normally.
- **New story:** choose **outline → new story**. The existing story remains
  intact until the new outline is submitted and replacement is confirmed.
  Reset clears passage text but keeps the current outline.

### Expected journey and acceptance checks

**US.11:** A writer enters the three example beats, starts the first passage,
types word by word, advances when ready, revisits an earlier passage, and finishes
or stops without losing their writing.

| Action | Expected outcome |
|---|---|
| Start with the three example beats | First passage connects “i go to the store” to “i meet a mysterious stranger.” |
| Type several words | Words accumulate in that passage, in order, with no generated additions. |
| Choose next beat with unfinished input | All text remains in the first passage; the next passage connects the stranger to going home. |
| Choose next beat before writing anything | Advance voluntarily; keep an empty passage that can be revisited. |
| Return to the previous passage | Restore the correct passage and unfinished input without duplication. |
| Finish at the last passage, or stop earlier | Show the written passages in order; keep empty sections and the outline available for resuming. |
| Save, close and reopen | Restore the story structure, words and writing position; do not silently flatten away the outline. |
| A save fails | Keep the entire story in the current tab and provide a clear retry/recovery path. |
| Switch modes with an unsaved draft | Keep it or ask before discarding; never replace it silently. |
| Use the keyboard or a narrow phone screen | Beat context, typing and navigation remain readable and operable. |

Tests, indexed in the architecture: **SM.11** checks that the mode and its
controls open; **CT.11** checks passage ownership, navigation, snapshots and save
round-trips; **E2E.11** walks the main journey on phone and laptop. The state,
backend and browser checks are in `tests/writing_modes_checks.cjs`,
`tests/test_writing_modes.py`, and `tests/writing_modes_browser.cjs`.
Actual execution evidence is recorded in the
[implementation plan](docs/architecture/WRITING_MODES_PLAN.md).

### First-version design decisions

The user requested a skeleton, one-word writing and self-paced progression.
The following supporting defaults make that flow concrete (D10):

- Each adjacent pair of beats has its own passage; three beats produce two
  passages. Opening/closing passages outside those gaps can be considered later.
- Keep the original beat wording separate from prose. The writer may include
  it themselves if desired.
- Allow outline arrangement before writing. Once passages exist, edit beat
  wording while preserving its line position and identity. Removing/reordering
  populated beats remains outside this version.
- Navigation is not saving. Explain before input that unsaved story drafts are
  lost on reload/close, and require an explicit save for durable retention.
- Mode selection lives in the dropdown menu; it does not replace the writing
  screen with a permanent tab bar.

## Highlight and blackout poetry

**R.12 / US.12:** A writer makes a poem by selecting words from their own
associative chain, while preserving the full original text.

1. Finish a chain with **done**, then choose **highlight / blackout**.
2. Click words to keep them, or Tab to each word and press Space. Click again
   to remove a word from the selection. The words stay in their original order.
3. Choose **Highlight kept words** to mark the selected words, or **Black out
   the rest** to cover unselected words with dark blocks. A text preview shows
   the kept words in order.
4. Choose **use this view** to apply it to the finished document. Library saves
   preserve both the original writing and the selection. PNG/PDF exports show
   the chosen presentation without editor buttons.
5. Reopen a Library entry with **continue writing** to adjust the poem.
   **Restore original** removes the presentation without deleting any words;
   closing the poetry dialog cancels unconfirmed changes. **Clear selection**
   lets the writer start choosing again.

This is a selection tool, not AI generation. It is currently available for
free-association chains. No words are added, reordered or rewritten. New words
typed after a poem is created are initially unselected; existing selections
refer to word positions. The original writing remains part of a saved entry.

**SM.12** covers opening the selector; **CT.12** covers valid selection indices,
unchanged original text and save/reopen; **E2E.12** covers keyboard selection,
both views, save/reopen, export, cancellation and restoring the original.

## Shared requirements and boundaries

Both modes preserve the writer's authorship and freedom to stop. Writing stays
private by default, with retention explained before input and no silent upload,
analysis or publication. Keyboard access, visible focus, readable contrast and
phone layouts are requirements. Any future visual effects must respect reduced
motion and provide a visible effects control (R.10).

AI writing, psychological interpretation, public/social sharing, payments,
punitive streaks and forced writing timers are outside this feature list.

The [architecture](ARCHITECTURE.md) describes component boundaries and test
traceability. The [writing-mode plan](docs/architecture/WRITING_MODES_PLAN.md)
records implementation and verification of these two features; the broader
structural refactor remains separate.
