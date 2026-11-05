# Guest writing

2026-11-05. Branch `codex/guest-writing`. Owner request: an option to skip sign-in.

R.13 / US.13: choose **Continue without signing in** from the account screen,
write in either mode, make blackout poetry, and explicitly save locally. Show
browser-only retention before input. Guest entry must not authenticate a user,
upload writing, fetch account collections or change an existing account session.
Signing in later does not automatically import guest writing.

Decision (D10): expose `/guest/` using the same writing UI and existing IndexedDB
adapter. Keep `/` and all private account APIs protected. Reuse the existing
explicit import flow for people who later choose an account. No database migration.

| Task | Time | Input | Output | Check | State |
|---|---|---|---|---|---|
| GS.01 | 20 min | Current spec, auth tests and user request | Baseline and separate guest regression tests | CT.13: public page, local adapter, private API isolation | In progress |
| GS.02 | 20 min | Guest contract | Account-page link, guest route and accurate guest UI | SM.13: skip link opens usable writer | Pending |
| GS.03 | 25 min | Implemented flow | Browser check, docs and local server refresh | E2E.13: skip, write, save/reload, Story Beats/poetry, no private requests | Pending |

Single-agent file claim: backend views/URLs/assets, account layout/CSS, guest JS,
one hidden guest menu link, new guest tests and named docs. Preserve all prior
changes, tests, untracked files and root `spec.md` deletion. No commit/push requested.

## Owner's follow-up: direct writing and a quieter UI

The owner now requests writing as the opening page, one top-right sign-up control,
and removal of extra helper copy, underlines and the typing-field outline. This
supersedes requiring an explicit guest choice on first visit. `/` redirects
anonymous/unverified visitors to `/guest/`, while verified users keep their account
writer. Retain help and error/deletion messages; move retention copy into Help.
Use color/caret as the typing focus cue and keep focus indicators on controls.
GS.03 includes fresh browser checks for direct entry, top-right position and no
input outline. Do not alter the existing human acceptance tests.

## Resume point

2026-11-05: baseline running; implementation not started. Next command from root:

```sh
.venv/bin/python -m pytest -q tests/test_guest.py
```
