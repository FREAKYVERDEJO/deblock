# Story Beats and blackout poetry — implementation plan

2026-11-05. Branch `codex/story-beats`. Owner requested review and implementation,
then specified Story Beats above Profile in the menu and highlight/blackout poetry
from an associative chain. Scope is the existing local application. No deployment
or Git commit/push is requested.

## Reviewed decisions (D1, D6, D10)

- R.11 / US.11: three beats produce two passages, with manual next/previous,
  unfinished input retained, empty passages allowed and explicit saving. Menu
  navigation preserves a separate in-memory draft for each mode.
- R.12 / US.12: in the finished associative chain, choose words to keep and switch
  between highlight and blackout views. Preserve original text and word order;
  selections are editable and saved with the entry. PNG/PDF show the chosen view.
- Retain the existing quiet styling for this feature increment. No new motion
  is introduced. The older neon brief remains an independent visual decision.
- Existing Library edit flattens entries: structured stories must instead reopen
  in the writing UI. Add a nullable versioned story field and poetry selection
  field; old rows remain ordinary free-association entries. Validate both on the
  server and retain ownership, CSRF and optimistic revision checks.
- Keep supporting state in one small pure JS module; use the existing storage
  adapter and export boundary. No framework or service layer is needed.
- Mock-first: run new browser state/interaction checks with synthetic API data
  before wiring persistence. Test real persistence through Django separately.

## Tasks (D3–D4)

| ID | Budget | Input | Output | Check | State |
|---|---|---|---|---|---|
| WM.01 | 20 min | Feature docs and existing code/tests | Review, baseline and this plan | Original tests/history inspected; failures classified | Complete, uncommitted |
| WM.02 | 25 min | R.11/R.12 | Separate regression tests for state and storage | CT.11/CT.12 fail for missing behavior | Complete, uncommitted |
| WM.03 | 30 min | New tests and versioned state contract | Story and poetry state module, menu and mock-driven UI | SM.11/SM.12, CT.11/CT.12 | Complete, uncommitted |
| WM.04 | 30 min | State snapshots | Validated additive persistence and Library reopen | Ownership, stale revision, old entries, story/poetry round-trip | Complete, uncommitted |
| WM.05 | 25 min | Working UI and storage | Export/reopen integration and docs | No flattened story; chosen poem visible in output | Complete, uncommitted |
| WM.06 | 30 min | Finished increment | Full tests, browser journeys, screenshots and handover | E2E.11/E2E.12 on phone/laptop; exact evidence | Complete, uncommitted |

Single-agent claim: new writing state/UI/tests/migration, `app.js`, `shelf.js`,
`art.js`, `index.html`, `style.css`, server asset allowlist, backend model/views,
and named feature/architecture docs. No shared service locks. Existing deletion
of `spec.md`, untracked duplicate trees, `day_roman/`, `AGENTS.md`, and prior
documentation are preserved. All pre-existing tests remain unchanged. Claim
released at handover; both owned test preview servers stopped. No commits/pushes.

## Baseline evidence

`.venv/bin/python -m pytest -q` initially returned exit 1:
`24 passed, 5 errors in 5.59s`. All five errors were localhost socket permissions
in the HTTP fixture, not behavioral assertion failures. Rerun with socket access.
`node` was absent from PATH; use the bundled executable at
`/Users/denizasuleymanova/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node`.
Original retrieval tests match commit `7c3b2f9`; they are not being modified.

With localhost socket access, the baseline returned exit 0: `29 passed in 6.61s`.
All 10 original Node check scripts passed using the bundled Node executable.
Before persistence implementation, the new `tests/test_writing_modes.py` returned
exit 1: `17 failed in 1.57s` (missing response fields and unsupported validation).
The new Node state check initially failed to import the missing writing-tools
module; assertions did not run in that attempt. After implementation its checks
ran successfully.

## Final verification (D7–D9)

Commands were run from the repository root. Socket/browser runs required local
sandbox escalation; no external deployment or real-user messaging occurred.

```sh
.venv/bin/python -m pytest -q
```

Exit 0:

```text
...............................................                          [100%]
47 passed in 10.14s
```

```sh
for check in tests/*_checks.cjs; do /Users/denizasuleymanova/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node "$check" || exit "$?"; done
```

Exit 0; all 11 scripts completed:

```text
Account storage checks passed (CSRF, identity binding, revisions, pagination, errors, session expiry, delete)
7 artwork checks passed (deck coverage, no boundary repeats, empty/single pool, toggle retention, snapshot isolation, shuffle, saved-image validation)
Image loading checks passed (decode-before-swap, preload, rapid clicks, failure retention, cancellation, recovery)
2 rotation checks passed (retired prompts excluded, saved artwork preserved)
3 avatar checks passed (existing identity, third portrait persistence, unknown-ID fallback)
9 collection checks passed (save/update, safe rendering, entry view, profile, gallery, storage failure, stable identity, snapshot isolation, new entry after reset)
5 document checks passed (toggle, preservation, plain text, arrow text, reset)
4 visual-export checks passed (geometry, lossless pixels, PDF offsets, invalid inputs)
3 reset checks passed (cancel, clear, new chain)
6 word-input checks passed
12 writing-mode state checks passed (CT.11/CT.12)
```

Browser automation uses bundled Playwright and installed Chrome (its bundled
Chromium executable was unavailable). A fictional verified account and cookie
were created in a separate `/tmp/deblock-writing-modes-db` database; the cookie
was read from a mode-0600 file, never printed. The actual application database
was not populated with test writing. The same UI journeys ran against mock
account responses and the isolated Django backend. The test server for mock
mode serves assets and the unchanged exercise API; account operations are mocked,
so this is not the broader architecture's fully backend-free exercise fixture.

Commands after starting the corresponding localhost preview:

```sh
DEBLOCK_TEST_OUTPUT=/tmp/deblock-writing-modes-mock DEBLOCK_BROWSER_CHANNEL=chrome NODE_PATH=/Users/denizasuleymanova/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules /Users/denizasuleymanova/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node tests/writing_modes_browser.cjs

DEBLOCK_TEST_URL=http://127.0.0.1:8015 DEBLOCK_TEST_SESSION_FILE=/tmp/deblock-writing-modes-session DEBLOCK_TEST_OUTPUT=/tmp/deblock-writing-modes-real DEBLOCK_BROWSER_CHANNEL=chrome NODE_PATH=/Users/denizasuleymanova/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules /Users/denizasuleymanova/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node tests/writing_modes_browser.cjs
```

Both returned exit 0 with:

```text
PASS laptop: outline correction, passages, pending words, keyboard, mode retention, save failure/retry/reopen, highlight, blackout, PNG/PDF, restore, no draft uploads, no unexpected console errors
PASS phone: outline correction, passages, pending words, keyboard, mode retention, save failure/retry/reopen, highlight, blackout, PNG/PDF, restore, no draft uploads, no unexpected console errors
```

The real-backend run additionally checked empty-passage advancement and cancelling
an unconfirmed selection change. See the [journey review](WRITING_MODES_REVIEW.md)
for screenshots and the inspection limits. During development, an asynchronous
Library assertion needed to wait for the entry dialog. Export testing revealed
blocked html2canvas styles/font-probe images; the exact stylesheet hash and local
data-image source were added without enabling arbitrary inline styles/scripts.
Phone inspection also corrected an overly short word container. The final runs
include those fixes and no unexpected browser errors. Expected synthetic 503 save
failures and mock 400 Gallery responses were recorded as intentional test cases.

Additional checks (all exit 0):

| Command | Output |
|---|---|
| `.venv/bin/python manage.py check` | `System check identified no issues (0 silenced).` |
| `.venv/bin/python manage.py makemigrations --check --dry-run` | `No changes detected` |
| `.venv/bin/python manage.py migrate --noinput` | `Applying backend.0002_entry_writing_modes... OK` (existing local database) |
| `.venv/bin/python manage.py showmigrations backend` | `[X] 0001_initial`, `[X] 0002_entry_writing_modes` |
| `git diff --check` | No output |
| `git diff -- tests` | No output; all earlier tracked tests unchanged |

The migration only adds nullable fields. No existing entries were deleted.
Diff review preserved the pre-existing root specification deletion and unrelated
untracked files. Nothing is staged.

## Resume point

2026-11-05: WM.01–WM.06 complete. Story Beats and highlight/blackout poetry are
implemented and tested locally. The local schema is migrated; restart the app
server to load changed Python modules. No blockers remain for this local increment.
No hosting deployment, production-provider integration or real-user research was
performed. Next: start/restart the local app and try Story Beats above Profile.
Exact next command from the repository root:

```sh
.venv/bin/python manage.py runserver 127.0.0.1:8003 --noreload
```
