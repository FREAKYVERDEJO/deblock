# Deblock feature integration — 2026-11-10

Integration branch: `codex/integrate-features-20261110`.
Review worktree: `/private/tmp/deblock-integration-20261110/worktree`.
Original worktree: `/Users/denizasuleymanova/Desktop/hs2026-2027/deblock`, still on
`codex/saved-aphorisms` with its original staged/unstaged/untracked state intact.

## Initial assessment (completed before code changes)

Read AGENTS.md, ARCHITECTURE.md, FEATURES.md, deblock/spec.md, the architecture,
writing-mode and guest plans, RESEARCH.md, implementation diffs, relevant tests,
and the acceptance-test history. Root spec.md was absent; no live conflicting
specification was selected. Older plans describe earlier increments and are not
proof of current runtime behavior. The broader architecture refactor remains
outside this integration.

The index was empty. There were 18 modified tracked files and 16 untracked files,
snapshotted with SHA-256 checksums before any integration changes. Original HEAD
was 235afbb. Local main was b38562f; the existing origin/main reference was
235afbb. No remote fetch or push was performed. Main and all original feature
refs remain unchanged.

All original branches form one linear history; none contains divergent committed
work. Thirteen older branch tips are already included in local main. Character
blackout is the sole additional committed feature. Six newer feature branch names
share 235afbb: their separate functionality lives in the combined dirty tree,
not in separate commits. The owner explicitly authorized including that dirty
work. A new integration branch/worktree preserves the original checkout without
stashing, resetting, cleaning, or moving its changes.

Overlap/dependencies identified before integration:

- Character blackout extends the earlier Story Beats/word-poetry contracts.
- Image-off export and research both touch app.js; image selection remains in
  memory, while the current image-off document snapshot excludes artwork.
- Appearance, research, and bookmarks share index.html and style.css.
- Research and bookmarks share models, views, URLs, research modules and Library.
  Migration 0007 explicitly depends on 0006, which depends on 0005.
- Guest/account adapters must retain distinct storage and privacy behavior.
- Research is included by request, remains disabled by default, and still requires
  PostgreSQL when enabled. No inference/adaptation feature was added.

## Branches and merge sequence

All original feature tips are ancestors of integration HEAD. Already-included
branches produce “Already up to date”; no artificial empty merge commits were
made for them.

| Original branch | Inspected tip | Result |
|---|---|---|
| `codex/accounts-backend` | `522f44b` | Already included through history |
| `codex/aphorism-of-the-day` | `22b41f4` | Already included through history |
| `codex/architecture-development-rules` | `522f44b` | Already included through history |
| `codex/character-blackout` | `235afbb` | Merged character-blackout commit |
| `codex/fix-account-csrf` | `235afbb` | Tip included; dirty feature captured separately below |
| `codex/fix-export-image-toggle` | `235afbb` | Tip included; dirty feature captured separately below |
| `codex/guest-writing` | `a53f999` | Already included through history |
| `codex/integrate-features-20261110` | `3916283` | Already included through history |
| `codex/menu-appearance` | `235afbb` | Tip included; dirty feature captured separately below |
| `codex/persistent-research` | `235afbb` | Tip included; dirty feature captured separately below |
| `codex/preview-sign-in` | `ae4057c` | Already included through history |
| `codex/railway-allowed-hosts` | `4d6db4d` | Already included through history |
| `codex/saved-aphorisms` | `235afbb` | Tip included; dirty feature captured separately below |
| `codex/seamless-image-switch` | `0e0ca3e` | Already included through history |
| `codex/sepia-dark-mode` | `235afbb` | Tip included; dirty feature captured separately below |
| `codex/simple-blackout` | `0e3624d` | Already included through history |
| `codex/story-beats` | `522f44b` | Already included through history |
| `codex/story-beats-grey-text` | `b38562f` | Already included through history |
| `codex/story-beats-polish` | `5aa1f13` | Already included through history |
| `codex/story-reset` | `649d3d2` | Already included through history |
| `feat/exercise-retrieval` | `2a3eb84` | Already included through history |

Actual content merges, in dependency order:

1. `codex/character-blackout` into the branch created from local main.
2. Preserved CSRF fix.
3. Preserved image-toggle/export fix.
4. Preserved appearance/menu changes (the combined light/dark feature).
5. Preserved research and personalization-consent work, including migrations 0005/0006.
6. Preserved saved aphorisms, including migration 0007 and both storage adapters.

The following new source branches explicitly record the provenance of the dirty
snapshot; they do not pretend the changes were committed on the original named
branches. Each was captured separately and merged with --no-ff:

| Snapshot source branch | Source commit |
|---|---|

## Conflict resolution and preservation

There were no Git conflict markers or textual merge conflicts. Shared dirty files
were partitioned into dependent feature snapshots. After all merges, all 34
original dirty/untracked files matched their captured bytes exactly. No application
implementation was rewritten beyond incorporating those feature snapshots and
the existing character-blackout commit.

The test suite contained semantic conflicts and stale fixtures. These were
resolved explicitly, without ours/theirs selection or disabling tests:

- The older finished-piece test attached hidden art; the newer image-export
  regression requires omission. The combined test asserts image-off omission,
  restores exactly the same image on re-enable, and retains no-leakage/last-word/
  Enter-navigation assertions. The new browser image regression also passes.
- Word-poetry browser selectors no longer exist in character blackout. Guest and
  writing-mode journeys now use character controls. Legacy highlight/blackout
  rendering is still exercised, including conversion, full original text,
  cancellation, save/reopen, and export. New character keyboard coverage remains.
- The current account navigation offers sign-in; an older guest script expected
  the hidden sign-up link. The journey checks the visible sign-in route and keeps
  keyboard guest entry, privacy, save/reload, mobile layout, and no-upload checks.
- Appearance uses sepia ink rather than literal black. Caret checks now require
  the actual theme's readable ink, with independent contrast checks for both themes.
- Editor unit fixtures now supply the aphorism rendering boundary; the Library
  fixture includes the aphorisms collection. Original behavioral assertions remain.
- Mock writing-mode setup retains the account entrypoint and CSP while using mock
  account responses; Django's anonymous redirect no longer substitutes guest storage.

The original human retrieval acceptance tests are byte-identical to commit
7c3b2f9, which precedes implementation d9122df. No tests were skipped, xfailed,
excluded from discovery, or removed. New cross-feature browser coverage verifies
IndexedDB v1→v2 preservation, themes, keyboard use, contrast, reduced motion,
aphorism input switching and PNG/PDF output.

## Verification

Interpreter actually used:
`/Users/denizasuleymanova/Desktop/hs2026-2027/deblock/.venv/bin/python`.
Node actually used:
`/Users/denizasuleymanova/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node`.
Browser scripts use bundled Playwright (NODE_PATH points at that runtime's
node_modules) and installed Chrome, with 1280px and 390px viewports.
Local socket and browser execution required sandbox escalation.

### Baseline and targeted checks

The initial restricted baseline was **82 passed, 6 setup errors** (localhost
socket permission, not behavioral failures). With local socket access the original
dirty-tree baseline was **88 passed in 7.77s**.

Each inspected historical branch merge/no-op was followed by targeted pytest:

| Branch/check group | Result |
|---|---|
| `feat/exercise-retrieval` — `tests/test_exercises.py` | 2 passed in 0.03s |
| `codex/seamless-image-switch` — `tests/test_art_catalog.py` | 2 passed in 0.03s |
| `codex/accounts-backend` — `tests/test_accounts.py tests/test_auth_flows.py` | 18 passed in 2.12s |
| `codex/architecture-development-rules` — `tests/test_exercises.py` | 2 passed in 0.02s |
| `codex/story-beats` — `tests/test_writing_modes.py` | 17 passed in 0.97s |
| `codex/guest-writing` — `tests/test_guest.py tests/test_direct_writing.py` | 4 passed in 0.28s |
| `codex/simple-blackout` — `tests/test_writing_modes.py` | 17 passed in 0.99s |
| `codex/story-beats-polish` — `tests/test_writing_modes.py` | 17 passed in 0.94s |
| `codex/story-reset` — `tests/test_writing_modes.py` | 17 passed in 0.94s |
| `codex/preview-sign-in` — `tests/test_preview_sign_in.py` | 1 passed in 0.34s |
| `codex/aphorism-of-the-day` — `tests/test_aphorisms.py` | 8 passed in 0.47s |
| `codex/railway-allowed-hosts` — `tests/test_backend_configuration.py` | 2 passed in 0.62s |
| `codex/story-beats-grey-text` — `tests/test_writing_modes.py` | 17 passed in 0.96s |
| `codex/character-blackout` — `tests/test_writing_modes.py` | 22 passed in 1.17s |
| CSRF snapshot — account origins, accounts, auth flows, backend configuration | 26 passed |
| Image-export snapshot — export policy, Gallery captions | 4 passed; art/loading/export checks passed |
| Appearance snapshot — HTTP assets, direct writing | 6 passed |
| Research snapshot — research, writing modes, guest, accounts | 48 passed; metric/state checks passed |
| Bookmarks snapshot — bookmarks, aphorisms, research, guest | 25 passed; account-storage checks passed |

The image/appearance/bookmark Node runs initially exposed stale fixtures listed
above. After repairs, every Node check passed. These were reported as failures
until corrected, not counted as successful runs.

### Full available suites and browser journeys

- Full SQLite pytest: **88 passed in 6.81s**.
- Full PostgreSQL pytest: **88 passed in 55.02s**, with research connection-reopen
  checks exercised on PostgreSQL.
- All 12 `tests/*_checks.cjs` scripts plus `tests/research_metrics.cjs`: **13 scripts
  passed**. Coverage includes word entry, reset, detached snapshots, collections,
  account identity/CSRF/revisions, artwork decode/rotation, writing modes and
  lossless PDF geometry/pixels/offsets.
- Django `check`: **System check identified no issues (0 silenced).**
- Django `makemigrations --check --dry-run`: **No changes detected.**
- `migrate --noinput` against the disposable browser database: migrations through
  **backend.0007_saved_aphorisms applied successfully**.
- Separate migration probe from 0004→0007: an existing synthetic Unicode story,
  all row fields, ID and revision were preserved exactly.
- `git diff --check`: passed.

Browser journeys (all passed; desktop 1280px/mobile 390px unless noted):

| Script | Verified behavior |
|---|---|
| `image_toggle_export_browser.cjs` | Resume writing, keyboard image-off, image-free review/PNG, restore identical selected image, no errors |
| `story_reset_browser.cjs` | Reset/cancel, fresh outline/identity, saved entry/free draft retained, per-mode image availability |
| `guest_browser.cjs` | Direct writing and keyboard guest entry, visible sign-in navigation, local poem/story save and reload, no private requests |
| `blackout_outline_browser.cjs` | Character/space drag in both directions, touch/keyboard, save/reload/cancel, PNG/PDF, wrapped/scrolled outline markers, original writing retained |
| `writing_modes_browser.cjs` — mock and real verified account | Story navigation/pending words, mode retention, injected save failure/retry/reopen, legacy highlight/blackout conversion, story and poem PNG/PDF, cancellation/restoration, no unexpected errors |
| `saved_aphorisms_browser.cjs` | Keyboard bookmark, reload persistence, Library removal, no research backfill, consented catalog-ID-only collection |
| `research_browser.cjs` | Consent-separated modes, offline retry, recovery/withdrawal/deletion, mobile; also real-account Library edit opt-in |
| `integration_browser.cjs` | IndexedDB v1→v2 preserves writing/image bytes/profile, bookmark store added, keyboard light/dark theme persistence and contrast/carets, reduced motion, aphorism prose switching, PNG/PDF signatures, no uploads/errors |

PNG/PDF downloads were produced and checked for file signatures and nontrivial
size. The export unit tests additionally validate lossless pixels, PDF offsets,
and page geometry. Visually inspected desktop dark-theme writing, the aphorism
PNG, and phone story PNG: readable text and no clipped content. Browser journeys
use reduced-motion contexts; no effects toggle or hidden-page animation behavior
is claimed because the integrated UI adds no animated effects.

The new storage-upgrade test initially seeded its origin by opening the favicon
as a document, triggering Chrome's implicit missing favicon request. Using the
normal account page to establish the same origin fixed the fixture without
suppressing console/network errors. Explicit mode-load waits avoid typing into
a previous mode while an async aphorism catalog request is still completing.

### Reproduction and isolation

From the review worktree, use the interpreter/Node paths above:

```sh
# SQLite, isolated local files
DEBLOCK_ENV=development DEBLOCK_DATA_DIR=/private/tmp/deblock-integration-sqlite \
  /Users/denizasuleymanova/Desktop/hs2026-2027/deblock/.venv/bin/python -m pytest -q

# PostgreSQL: point only to a disposable local UTF-8 database; never production.
DEBLOCK_ENV=development DEBLOCK_DATA_DIR=/private/tmp/deblock-integration-pg \
  DATABASE_URL=postgresql://deblock_integration@127.0.0.1:55484/deblock_integration \
  DEBLOCK_DB_SSLMODE=disable \
  /Users/denizasuleymanova/Desktop/hs2026-2027/deblock/.venv/bin/python -m pytest -q
```

Node checks: run each `tests/*_checks.cjs`, then `tests/research_metrics.cjs` with
the absolute Node path above. Browser scripts accept DEBLOCK_TEST_URL; use an
isolated migrated local Django preview. The writing-mode script supports both
mock mode (no session file) and real mode (DEBLOCK_TEST_SESSION_FILE, private mode
0600 synthetic session file). Research/bookmark browser checks require research
enabled in that disposable PostgreSQL preview. DEBLOCK_BROWSER_CHANNEL=chrome and
NODE_PATH select the existing installed browser/runtime, without installing packages.

The first PostgreSQL cluster used a SQL_ASCII template: 87 passed and the Unicode
story test failed. Recreating the disposable cluster with `initdb --encoding=UTF8`
corrected the environment without touching application settings or weakening the
Unicode assertion. Some headless Chrome launches also timed out; serial reruns
completed. A preview process started before theme.js was added initially returned
404; restarting that local preview loaded the merged asset allowlist.

Only synthetic data was created in databases under /private/tmp, with PostgreSQL
bound to 127.0.0.1 on dedicated ports. No production database, Railway project,
provider configuration, push, or deployment was accessed or changed. Existing
local application data was not migrated. Test services are stopped at handover;
rerunning PostgreSQL/browser checks requires restarting the disposable services.
Raw local logs, snapshots and helper commands are under
`/private/tmp/deblock-integration-20261110`; they are not committed and contain
only synthetic test material. The private session file is not committed or printed.

## Changed files relative to local main

```text
.env.example
BACKEND.md
INTEGRATION_REPORT.md
RESEARCH.md
deblock/backend/migrations/0005_research.py
deblock/backend/migrations/0006_personalization_defaults.py
deblock/backend/migrations/0007_saved_aphorisms.py
deblock/backend/models.py
deblock/backend/research.py
deblock/backend/settings.py
deblock/backend/urls.py
deblock/backend/views.py
deblock/backend/writing.py
deblock/server.py
deblock/web/account-storage.js
deblock/web/aphorisms.js
deblock/web/app.js
deblock/web/art.js
deblock/web/export.js
deblock/web/index.html
deblock/web/modes.js
deblock/web/poetry.js
deblock/web/research-metrics.js
deblock/web/research-privacy.html
deblock/web/research.js
deblock/web/shelf.js
deblock/web/storage.js
deblock/web/style.css
deblock/web/theme.js
deblock/web/writing-tools.js
tests/blackout_outline_browser.cjs
tests/collection_checks.cjs
tests/document_checks.cjs
tests/finished_piece_checks.cjs
tests/guest_browser.cjs
tests/image_toggle_export_browser.cjs
tests/integration_browser.cjs
tests/research_browser.cjs
tests/research_metrics.cjs
tests/reset_checks.cjs
tests/saved_aphorisms_browser.cjs
tests/test_account_origins.py
tests/test_research.py
tests/test_saved_aphorisms.py
tests/test_writing_modes.py
tests/word_input_checks.cjs
tests/writing_modes_browser.cjs
tests/writing_modes_checks.cjs
```

## Integration commits

Content merge commits (chronological): `81e2d66` character blackout, `4e0bb25`
CSRF, `3c70bbe` image/export, `4f45f75` appearance, `2fc910c` research,
`76ff50e` saved aphorisms. Test reconciliation/coverage commits: `24e1071`,
`3916283`, `3f10e64`. This report is committed separately. All 48 changed files
are listed above; the integration worktree is clean at handover.

## Review limits and next step

No known integration failure remains after the final checks recorded above.
Provider-specific production behavior (Railway, HTTPS/proxies, Redis, SMTP,
production backup/retention operations) was deliberately not tested. This report
supersedes older plan verification notes only for this integration; the proposed
architecture refactor and unresolved historical neon/CRT direction are not newly
implemented. The integrated appearance uses the supplied light/dark/sepia code,
with no new animation or effects added.

Next: review `git diff main...codex/integrate-features-20261110` and the separate
merge commits in the review worktree. Main remains unchanged. No push or deploy
is authorized by this handover.
