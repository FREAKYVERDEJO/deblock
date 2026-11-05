# Development rules (D1–D15)

Read these before you write requirements, plan, code, test or commit with a coding agent.
Each rule has an id, the rule in one line, why it exists, and a check that you or your agent can run.
When the agent applies a rule, it names the id, e.g. "(D8)".

The rules follow the order of the work:

| Stage | requirements | plan | mockup | code | tests | simulated users | commit | hand-over |
|---|---|---|---|---|---|---|---|---|
| Rules | D1, D2 | D3, D4 | D5 | D6 | D7, D8 | D9 | D11, D12 | D15 |

Throughout: D10 (decide with defaults); D13 and D14 when several agents or people share the repo.

---

### D1. Write requirements before code
Write what the product must do, how, and the user situations (a screen and its actions) that show it, before any code.
- **Why:** An agent builds exactly what you wrote, so a vague request gets a plausible but different product.
- **Check:** Each feature traces to a requirement, each requirement to a user situation; two people reading an action would build the same thing.

### D2. Give every thing one id, and keep one index
Name each requirement, user situation, test and task with a short stable id (e.g. US.03 for a user situation) and list them in one file.
- **Why:** Agents find, link and update only what has a stable, searchable name.
- **Check:** `grep -rn "US.03"` finds its requirement, its test and its index entry; the index has no dead links.

### D3. Plan in small tasks before you start
Write a plan file first, in tasks of 20–30 minutes, each with its input, output and test.
- **Why:** A plan survives the end of a chat, and small tasks keep every agent turn checkable.
- **Check:** The plan was committed before the first code commit; each task is ticked the moment it is done, so ticks match commits.

### D4. Plan the tests from the user situations, before the code
Give every user action a test with its expected outcome: a smoke test, a contract test (the agreed input and output) and an end-to-end test.
- **Why:** Tests define what "correct" means; written after the code, they describe what the code happens to do.
- **Check:** Every action in every user situation maps to at least one test, and every test names the requirement it covers.

### D5. Build on mockup data first
Make the interface work against realistic mock data, through the same API calls the real backend will answer, before the backend exists.
- **Why:** You test the user's flow early, and switching to the real backend changes no interface code.
- **Check:** The app runs with no backend; every list has an empty case, every failing operation an error case; no "foo" or "test" values.

### D6. Split into components with explicit contracts
Each component owns its data and talks to the others only through a documented contract (an API or an event), tested at the boundary.
- **Why:** A component that reads another's internals breaks whenever the other one changes.
- **Check:** No import or database read crosses a boundary; each boundary has a contract test; URLs and keys come from config, not code.

### D7. Run the tests yourself; fix the code, never the test
Run the whole suite yourself before "done", and fix failures in the code, never by deleting, skipping or weakening a test.
- **Why:** A weakened test hides the bug it was written to catch, and "done" means it works, not that it compiles.
- **Check:** The output shows N passed, 0 failed, 0 skipped; the diff removes no assertion and adds no stub, TODO or placeholder.

### D8. No claim without evidence
Every "works", "passes" or "fixed" comes with the command that shows it and that command's output.
- **Why:** "It should pass" is a guess, and agents report successes they did not observe.
- **Check:** Each status report quotes the command, its output and its exit code; a claim with no output counts as false.

### D9. Walk simulated users through it before you call it done
Walk each new user-facing journey as fictional personas who make typical mistakes and correct them, on a phone and a laptop.
- **Why:** Real people mistype, go back and leave half-way; a feature that works only on the happy path fails them.
- **Check:** The journey report has, per step, who, what they did, the check, PASS or FAIL and a screenshot; every mistake was correctable.

### D10. Decide with stated defaults; stop only for the irreversible
When unsure, write the question with its default, apply the default, log it, and keep working.
- **Why:** An agent that waits for answers stops all work, while a logged default can be reversed in one step.
- **Check:** The decisions log shows each question, where the agent looked first (docs, code), the default and why; work stopped
  only before deleting, deploying, paying or messaging real people.

### D11. Commit each working step, then push
Commit every step that works, with a message that says why, and push before you stop.
- **Why:** Small commits are easy to review and to undo, and unpushed work is invisible to your team and lost with your laptop.
- **Check:** At the end of a session `git status` is clean and `git log origin/<branch>..HEAD` is empty; the pushed diff
  holds no keys and no personal data.

### D12. Change the docs in the same commit as the code
When a behaviour, an interface or a requirement changes, update its documentation and its tests in the same commit.
- **Why:** Docs promised for "later" drift, and agents trust the docs they read.
- **Check:** Every commit that changes an interface also changes its requirement, its contract test or its README.

### D13. One task, one branch; stage only your own files
Do each task on its own branch or worktree (a second checkout of the repo), and stage files by name, never everything at once.
- **Why:** Two agents in one folder overwrite each other, and `git add -A` sweeps a teammate's half-done work into your commit.
- **Check:** `git diff --staged --name-only` lists only your task's files; the agent's commands contain no `git add -A` or `git add .`.

### D14. Coordinate when several agents or people work at once
On one shared board, claim a task and the files it touches before you write, and lock shared resources (a database, a deployment) while you use them.
- **Why:** Without a shared board, two agents build the same thing or break the same shared service.
- **Check:** Every branch in progress has an open claim; no two open claims list the same file; every lock has been released.

### D15. End every session with the next exact command
Before a session ends, write a resume point in the plan: what is done, what is in progress, the blockers, and the exact next command.
- **Why:** Chats end and their context is lost; the next session, or a teammate, starts from the note, not from memory.
- **Check:** The plan's last entry has a date, a status and a command that runs as written.

---

## What "done" means here

A feature is done when its tests pass and the output is shown (D7, D8), simulated users got through it (D9),
and the code and its docs are committed together and pushed (D11, D12).
