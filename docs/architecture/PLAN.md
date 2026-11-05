# Architecture redesign plan

**Follow-up:** the owner subsequently authorized Story Beats implementation and
added highlight/blackout poetry. That completed increment and its actual test
evidence are tracked in [WRITING_MODES_PLAN.md](WRITING_MODES_PLAN.md). The tasks
below remain the separate, broader structural-refactor proposal.

Date: 2026-11-05 (Europe/Madrid). Branch: `codex/architecture-development-rules`.
Scope: documentation of a proposed architecture; no application refactor, migration,
deployment, commit, or push is part of this delivery. The supplied rules guide the
design; their embedded execution instructions do not independently authorize actions.

## Documentation work

| Task | Input | Output | Check | Status |
|---|---|---|---|---|
| DOC.01 | Supplied rules, specification, source, acceptance tests, Git state | Current-state inventory and conflict list | Every current-state claim has a source | Complete; not committed |
| DOC.02 | Inventory and D1–D15 | `ARCHITECTURE.md`, traceability index, contracts, decisions | Every proposed requirement maps to a situation and planned tests | Complete; not committed |
| DOC.03 | Draft and initial Git state | Link/ID/diff review and resume point | No application/test changes; existing user changes preserved | Complete; evidence below; not committed |
| DOC.04 | Owner's story-beat request and existing feature documentation | `FEATURES.md`, linked requirement and journey in architecture | Distinguish existing/planned features; preserve user-paced transitions and all writing; review links and diff | Complete; documentation only; not committed |

These are document work items, not completed implementation steps. No tick implies
a commit. Implementation tasks below are 20–30 minute slices; split a task again
if it cannot reach its stated check within that budget (D3).

## Implementation sequence — proposed, not executed

All tasks below are **pending**. Their IDs are indexed in
[`ARCHITECTURE.md`](../../ARCHITECTURE.md#traceability-index).
Commit the agreed plan before the first implementation commit, when Git actions
are authorized. Record the actual commit and evidence beside each completed task.

| ID | Time | Input | Output | Test / completion evidence |
|---|---|---|---|---|
| TK.01 | 20 min | Architecture, spec, prototype and backend docs | Resolve scope/visual differences; align agreed requirements and index | Review conflicts and links; retain original AC1–AC2 |
| TK.02 | 25 min | Existing tests and environments | Recorded Python and all Node baseline outputs | Exact commands, stdout, exit codes; classify collection/configuration errors |
| TK.03 | 25 min | Exercise contract and original tests | Separate boundary tests; generated exercise fixture | CT.01–CT.02; fixture equals canonical retrieval output; original tests unchanged |
| TK.04 | 25 min | Draft contract and input regressions | Pure draft operations with snapshot boundary | CT.03–CT.04; whitespace, paste, IME, reset cancellation, detached snapshots |
| TK.05 | 25 min | HTTP contracts and storage adapters | Shared request/config boundary with preserved wire format | CT.05, CT.07–CT.08; auth, CSRF, revisions and safe error normalization |
| TK.06 | 30 min | Shared transport boundary | In-memory fetch mock with realistic entries and injected failures | Same CT.01–CT.02, CT.05, CT.07–CT.09 requests against mock and real adapter |
| TK.07 | 25 min | Draft API and mock exercise | Writer screen uses draft API; no direct shared-state mutation | SM.01–SM.04; E2E.01–E2E.04 in mock mode |
| TK.08 | 25 min | Collections API and mock entries | Library screen uses contract and empty/error states | SM.05, CT.05, E2E.05; no lost draft on conflict |
| TK.09 | 25 min | Document snapshot and export code | Export consumes snapshot; explicit download/Gallery outcomes | SM.06, CT.06, E2E.06; failure preserves downloadable document |
| TK.10 | 25 min | Account adapter and existing account screens | Explicit session boundary, safe expired/stale session UI | SM.07, CT.07, E2E.07; draft survives failed save |
| TK.11 | 25 min | Existing profile/import/delete flows | Contract-based account actions and explicit import consent | SM.08, CT.08, E2E.08; two isolated accounts and retry import |
| TK.12 | 25 min | Catalog, art and document snapshot | Art boundary independent of typing and export state | SM.09, CT.09, E2E.09; decode failure preserves previous selection |
| TK.13 | 25 min | Owner-resolved visual decision, accessibility requirements | Keyboard/mobile review and any agreed effects control | SM.10, CT.10, E2E.10; reduced motion, hidden page, stable text |
| TK.14 | 30 min | Backend views, API contract, added boundary tests | Extract only the collection validation/serialization boundary if needed | CT.05–CT.09 on real server; ownership/transaction behavior preserved |
| TK.15 | 25 min | Mock-tested UI and real backend | Real-mode integration with unchanged UI call sites | Run mapped E2E journeys; inspect requests for draft leakage |
| TK.16 | 30 min | All changed boundaries, baseline commands | Full automated verification record | Full Python and Node suites; no removed/skipped/weakened acceptance tests |
| TK.17 | 30 min | Fictional personas and E2E journeys | Phone/laptop journey report with step screenshots | D9 report fields, mistake recovery, no real-user claims |
| TK.18 | 20 min | Verified diff, docs, evidence | Handover; named-file commits/push only when authorized | D8, D11–D15 review; next exact command and remaining limits |

If a task reveals a behavioral bug, add a separate regression and fix the code;
never change acceptance criteria just to make a test pass (D7). The original
exercise tests remain in `tests/test_exercises.py`; never substitute duplicate trees.

## Collaboration and ownership (D13–D14)

This document is the shared task board for this increment. One agent handled it;
no sub-agents or shared service locks are needed. Before another person or agent
starts, add a claim here and check for overlapping files. Release each claim and
any resource lock at handover. Use an isolated worktree for simultaneous code work.

| Claim | Owner | Files | State | Shared locks |
|---|---|---|---|---|
| DOC.01–DOC.03 | Current architecture task | `ARCHITECTURE.md`, `docs/architecture/PLAN.md`, `docs/architecture/DEVELOPMENT_RULES.md` | Released at handover | None |
| DOC.04 | Feature-list follow-up | `FEATURES.md`, `ARCHITECTURE.md`, `docs/architecture/PLAN.md` | Released at handover | None |

Pre-existing changes to preserve: deleted root `spec.md`; untracked `AGENTS.md`,
`day_roman/`, `deblock/deblock/`, and `deblock/tests/`. Starting index was empty.

## Verification evidence (D8)

Documentation inspection only; application tests and browser/simulated-user
checks were not run, as permitted for documentation-only work by AGENTS.md.
The first link check found a missing `traceability-index` anchor. It was added;
the corrected check below returned exit **0** with this exact output:

```text
PASS: document links/anchors, ID inventory, whitespace, exact rules copy, unchanged tracked code/tests and empty staging area
```

Command, run from the repository root:

```sh
python3 - <<'PY'
from pathlib import Path
import re, subprocess
files = [Path('ARCHITECTURE.md'), Path('docs/architecture/PLAN.md'), Path('docs/architecture/DEVELOPMENT_RULES.md')]
for file in files:
    content = file.read_text()
    assert all(line.rstrip() == line or line.endswith('  ') for line in content.splitlines()), file
    for target in re.findall(r'\[[^\]]*\]\(([^)]+)\)', content):
        if '://' in target: continue
        name, _, anchor = target.partition('#')
        linked = file.parent / name if name else file
        assert linked.exists(), (file, target)
        if anchor: assert f'id="{anchor}"' in linked.read_text(), (file, target)
arch, plan = files[0].read_text(), files[1].read_text()
for prefix, count in [('R',10), ('US',10), ('SM',10), ('CT',10), ('E2E',10), ('TK',18), ('DOC',3)]:
    for n in range(1, count + 1):
        key = f'{prefix}.{n:02}'
        assert key in arch, key
        if prefix in ('TK','DOC'): assert key in plan, key
assert files[2].read_bytes() == Path('/Users/denizasuleymanova/Downloads/DEVELOPMENT_RULES.md').read_bytes()
assert subprocess.check_output(['git','diff','--name-only']).decode().splitlines() == ['spec.md']
assert not subprocess.check_output(['git','diff','--cached','--name-only'])
assert Path('tests/test_exercises.py').read_bytes() == subprocess.check_output(['git','show','HEAD:tests/test_exercises.py'])
print('PASS: document links/anchors, ID inventory, whitespace, exact rules copy, unchanged tracked code/tests and empty staging area')
PY
```

`git diff --check` also returned exit **0**, with no output. It checks tracked
changes; the Python command separately checks the new, untracked documents.
The unchanged tracked deletion of `spec.md` belongs to the starting user state.
Manual review checked contract descriptions against the inspected source, scope,
and the distinction between current behavior and proposed work. No commit or push
was performed and no feature-level test success is claimed.

### Feature-list follow-up verification

2026-11-05: reviewed existing versus planned feature labels, the user's exact
three-beat example, manual advancement, unfinished input, revisiting, retention,
and the need for a future story-document contract. No runtime behavior changed.
Application tests and browser checks were not run for this documentation-only
follow-up. The following command returned exit **0**:

```sh
python3 - <<'PY'
from pathlib import Path
import re, subprocess
files = [Path('FEATURES.md'), Path('ARCHITECTURE.md'), Path('docs/architecture/PLAN.md')]
for file in files:
    text = file.read_text()
    for link in re.findall(r'\[[^\]]*\]\(([^)]+)\)', text):
        if '://' in link: continue
        name, _, anchor = link.partition('#')
        target = file.parent / name if name else file
        assert target.exists(), (file, link)
        if anchor: assert f'id="{anchor}"' in target.read_text(), (file, link)
    assert not any(line.rstrip() != line and not line.endswith('  ') for line in text.splitlines()), file
for ident in ('R.11', 'US.11', 'SM.11', 'CT.11', 'E2E.11'):
    assert all(ident in file.read_text() for file in files[:2]), ident
assert subprocess.check_output(['git','diff','--name-only']).decode().splitlines() == ['spec.md']
assert not subprocess.check_output(['git','diff','--cached','--name-only'])
print('PASS: feature links, story-mode traceability, whitespace and unchanged tracked files')
PY
```

Exact output:

```text
PASS: feature links, story-mode traceability, whitespace and unchanged tracked files
```

`git diff --check` returned exit **0** with no output. No commit or push was made.

## Resume point (D15)

2026-11-05: DOC.01–DOC.04 complete and reviewable; no work is in progress.
TK.01–TK.18 remain pending. There are no blockers to this document delivery.
Before code implementation, resolve the recorded scope/visual differences and
obtain the owner's instruction to implement; deployment retention/provider
verification remains a later gate. No application refactor or migration started.
Story Beats is a documented requested feature, not part of TK.01–TK.18's existing
structural refactor scope. Next: review its first-version defaults before preparing
a separate implementation plan and versioned storage contract.
Exact next command from any working directory:

```sh
sed -n '1,220p' /Users/denizasuleymanova/Desktop/hs2026-2027/deblock/FEATURES.md
```
