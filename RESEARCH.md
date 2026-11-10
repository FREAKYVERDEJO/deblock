# Optional writing research

Django serves the guest and account versions of the same JavaScript editor. Guest library items live in IndexedDB, account items belong to verified Django/allauth users, and unsaved mode drafts live in tab memory. Research uses separate PostgreSQL tables, a browser-held 256-bit capability and a random UUID. There is no account foreign key, fingerprint, email, IP field or research content retrieval API. The standalone browser-only preview has no research backend.

## Configure a synthetic Railway environment

1. Use a separate Railway environment with its own PostgreSQL service and persistent volume for synthetic trials. Confirm the web service runs Django. This repo contains Django settings and a Gunicorn entry point. Check the actual Railway service settings for deployment commands.
2. Reference the private database URL in the web service, for example `DATABASE_URL=${{Postgres.DATABASE_URL}}` when the service is named Postgres. Preserve the production settings and TLS verification in [BACKEND.md](BACKEND.md), including the trusted CA for your database host. Set the pre-deploy command to `python manage.py migrate --noinput`. Keep the existing Gunicorn start command.
3. Set `DEBLOCK_RESEARCH_ENABLED=1` only in the isolated test environment. The default is off. The switch closes enrollment and session ingestion. Existing participants can still withdraw and delete. Open `/guest/#research` for recovery when collection is closed.
4. Before inviting people, review the actual notice, test recovery and removal in a second browser, restrict Railway project and database access to authorized members, and establish backup expiration and export-deletion procedures. If restoring a backup, reconcile withdrawals and deletions before reopening access. Changing the notice requires updating the recorded version and obtaining fresh consent for changed scopes.
5. For a later authorized rollout, migrate the production database first and set the switch only after review. The durable database belongs to the PostgreSQL service. Redeploying the web service leaves it intact. Keep credentials server-side and disable request-body and sensitive-header logging in any proxy or monitoring service.

[Railway PostgreSQL documentation](https://docs.railway.com/databases/postgresql)

## Verify a synthetic submission

On an enabled deployment, open **privacy** in the footer and select **Accept terms of use** to start pseudonymous personalization. Writing sharing is unchecked and must be explicitly saved. Existing browser choices are retained. The settings panel has a private recovery key under **Withdrawal and deletion**. Copy it before clearing browser storage. Another browser can use it to withdraw or delete. Keep the key out of exported records and logs. With a shared browser profile, visitors share the participant identifier.

Write a fresh chain, press **done**, then open **blackout**, cover a character and save. Try a story with three beats and a response to today's aphorism. Return to the browser and repeat. In the Railway PostgreSQL service's **Data** tab, inspect `personalization_summaries` and the five `research_` tables. For queries, open an authorized psql connection using Railway's service connection instructions or `railway connect` in the linked environment. Keep public TCP access disabled when unused. Use a restricted read-only database role for analysis and grant access to research tables only. Writing access should be granted separately.

```sql
-- psql: find a synthetic participant, then supply its UUID.
SELECT id, created_at, withdrawn_at FROM research_participants ORDER BY created_at DESC;
\prompt 'Participant UUID: ' participant
SELECT id, mode, started_at, ended_at, outcome, received_at, app_version
FROM research_sessions WHERE participant_id = :'participant' ORDER BY started_at;

SELECT scope, version, source, granted_at, withdrawn_at FROM research_consent
WHERE participant_id = :'participant' ORDER BY granted_at;

SELECT s.mode, b.metrics, b.configuration, b.events
FROM research_behavior b JOIN research_sessions s ON s.id = b.session_id
WHERE s.participant_id = :'participant' ORDER BY s.started_at;

SELECT s.mode, w.text, w.structure, w.word_count FROM research_writing w
JOIN research_sessions s ON s.id = w.session_id
JOIN research_consent c ON c.id = w.consent_id AND c.participant_id = s.participant_id
WHERE c.scope = 'writing' AND c.withdrawn_at IS NULL AND s.participant_id = :'participant';

-- psql exports to the authorized analyst's local machine. Use a protected directory.
\copy (SELECT s.participant_id, s.id, s.mode, b.metrics FROM research_sessions s JOIN research_behavior b ON b.session_id=s.id) TO 'research_metrics.csv' CSV HEADER
\copy (SELECT s.participant_id, w.session_id, w.text, w.structure FROM research_writing w JOIN research_sessions s ON s.id=w.session_id JOIN research_consent c ON c.id=w.consent_id WHERE c.scope='writing' AND c.withdrawn_at IS NULL) TO 'consented_writing.csv' CSV HEADER
```

Uncheck writing and save. Its rows should disappear immediately after confirmation, including for earlier sessions. Removing behavior erases the corresponding metric/event rows. The session headers and timestamped consent history remain until **Delete all my collected data** removes the participant and all associated records. Apply deletions to exports and expire backups on the schedule reviewed for the study.

## Consent and delivery

Accepting v3 terms records the timestamp with scope `personalize`, source `terms`, and version `3`. Existing v2 default records do not authorize new summaries. Turning a setting on manually records source `explicit`. Writing always requires a separate affirmative choice. The server stores only the recovery key's SHA-256 digest. The browser keeps the key, participant UUID and last-known choices. Server state is checked on return. Optional enrollment and every write require Django CSRF validation. A locked participant row serializes scope changes, deletion and session writes. Each consent change advances a generation, preventing old tabs and delayed requests from resuming a revoked grant. The server checks identity, scope, generation, mode and snapshot revision before storing data.

New blank documents and new outlines entered under writing consent are eligible. Existing drafts and reopened library entries need **Include this existing draft and its source in research**. A random, research-only document reference connects eligible writing and its Blackout transformation within the tab. Private saves and research submissions are independent.

Schema v1 sends a cumulative snapshot at most once per five-second checkpoint while dirty, and immediately at observed session boundaries. Each session UUID has an increasing revision. Duplicate and older snapshots cannot overwrite newer records. A browser outbox retries the latest authorized snapshot per session on reconnect and on return. Pending consent removals are persisted before the network call and stop collection while pending. A browser storage quota failure falls back to memory for the affected save. The server accepts research snapshots up to 8 MiB, individual text fields up to one million characters and event arrays up to 100,000 entries.

**Done** ends the current writing session as completed, even if the writer later resumes the document. Applying Blackout completes its own session. Reset, replacing a document, canceling Blackout and an observed page exit interrupt it. Hiding a tab checkpoints without ending it. Abrupt termination can lose changes since the last checkpoint and leave an open session with no end timestamp. Use `received_at` as the server's last observation. An open session does not establish abandonment. No artificial completion is assigned.

## Activity summaries for future personalization (terms v3)

Use `personalization_summaries` joined to `research_sessions.id = personalization_summaries.session_id`. Each session has a mode, outcome, and an optional deliberately submitted rating. Word bands 0–4 mean 0, 1–9, 10–49, 50–199, and 200+ words. Duration bands 0–4 mean under 30 seconds, 30–119 seconds, 2–4 minutes, 5–14 minutes, and 15+ minutes. A null two-minute result means unknown or inapplicable. Client start/end times for default summaries have minute precision; the server also records receipt time. Existing records are not backfilled. For example, a future feature can use repeatedly chosen modes:

```sql
SELECT s.mode, count(*) AS sessions, avg(p.usefulness_rating) AS mean_submitted_rating,
       count(p.usefulness_rating) AS ratings
FROM personalization_summaries p JOIN research_sessions s ON s.id = p.session_id
WHERE s.participant_id = :'participant' GROUP BY s.mode ORDER BY sessions DESC;
```

The numbered terms, which include activity summaries, are available under the footer privacy control. Accepting them never grants research access to text. Viewing the terms, using the writer, or clearing site data does not enroll a browser. V1 browsers that never enrolled left no stored choice to migrate. The legacy research measures below apply only under an explicit behavioral research grant.

## Metric definitions, schema v1

Behavioral results live in `research_behavior`. Content-only participants contribute the session header, authorized content and its word count. Word counts use whitespace-delimited tokens. Titles and story outline labels are stored as structure and excluded from passage word counts.

| Field | Definition |
| --- | --- |
| started_at / ended_at / received_at | Client wall-clock start, end derived from monotonic elapsed time, and server receipt of the latest accepted revision. |
| duration_ms / active_ms | Total monotonic elapsed session time including background time. Active time sums foreground intervals between successive editing actions, crediting at most 5 seconds per interval. A background or modal break ends the interval; time before the first or after the last action contributes zero. Blackout editing takes place inside its own dialog. |
| word_ms / words_written | Foreground milliseconds since session start at each explicit word advancement. The browser retains separate original word boundaries and the draft in the consented chain structure. Pasted batches share a timestamp. Aphorism prose uses positive increases in the number of whitespace-terminated tokens on an edit. Rewriting may create additional completions. A trailing unadvanced word contributes to final length only. |
| first_word_ms / final_words / rate_per_min | First observed word completion; current final text token count, including draft; completed words per active minute. Undefined rates and unavailable intervals are null. |
| median_interval_ms / mean_interval_ms | Median and arithmetic mean of successive completion-time differences on the foreground clock. No interval for fewer than two completions. |
| longest_pause_ms / pauses | Largest foreground gap between consecutive observed editing actions and number of those gaps strictly over 5 seconds. Each qualifying gap is also recorded in `pause_durations_ms`. Hidden time, modal breaks and trailing unobserved idle time are excluded. |
| deleted_chars | Unicode code points removed by user edits, including selected text replaced by typing or paste. Read before native input and before the word editor advances. Programmatic clear, render and navigation do not count. |
| corrections / correction_ms / corrections_per_word | Count and foreground start times of deletion episodes, and episodes per completed word. Replacement typing continues the episode until word completion, a gap over 5 seconds, a passage transition or a foreground break. No deleted strings or individual keystroke timeline is submitted as behavior. |
| features / configuration | Counts for arrow, art, next-image, outline and Aphorism editor controls, plus current arrows and catalog prompt/editor configuration where applicable. |
| Aphorism | Prompt ID and editor choice, response character length in Unicode code points, common timing/edit metrics and outcome. Full prose, including newlines, requires writing consent. |
| Story | Outline beat count, number of nonempty connecting passages, foreground milliseconds per passage index and transition times/destinations. Nonempty passage count describes available writing; writers do not mark individual beats complete. Outline drafting before starting a story is outside passage timing. |
| Blackout | Source word count, number of fully concealed words, and changes to the character selection (including changes within a drag). Use their ratio for concealed proportion. Duration covers the Blackout editor. Original source, selected character indices, composition and research document reference are writing-only. |

## Local verification

Use a disposable PostgreSQL database and a role permitted to create Django's test database. Set `DATABASE_URL` and the appropriate SSL mode, then run:

```sh
.venv/bin/python manage.py migrate --noinput
.venv/bin/python -m pytest -q
node tests/research_metrics.cjs
DEBLOCK_RESEARCH_ENABLED=1 .venv/bin/python manage.py runserver 127.0.0.1:8049
# In another terminal with Playwright and Chrome installed:
node tests/research_browser.cjs
```

The browser test uses synthetic text and deletes its records. To exercise the signed-in Library revision path too, pass a mode-0600 file containing a disposable verified local test session via `DEBLOCK_TEST_SESSION_FILE`. The API tests verify stale retries, consent epochs, cross-identity writes, confirmation and deletion; on PostgreSQL they reopen a database connection before checking saved rows.

The account Library also has a plain-entry revision dialog. These sessions use mode `library_edit`. Saving an edit completes it and closing the dialog interrupts it. With behavioral consent the existing prose editor uses the same editing metrics as Aphorism prose. Each time an existing entry opens for revision, **Include this library text and my edits in research** is required before any original or revised text can be submitted. The normal Signifier Chain writing surface continues to advance one word at a time.

## First pilot: does a new Signifier Chain help someone start?

This detailed research query applies only to recruited people with an existing explicit behavioral research grant. Default personalization records are outside this analysis. Use a recruited group who have agreed to behavioral research. Start each person's trial with a blank Signifier Chain. The timer begins once consent is confirmed and the blank editor is visible and enabled. It measures elapsed wall time using a monotonic clock. Later background time counts toward the two minutes. The first non-whitespace insertion counts, including paste or committed composition. A letter qualifies before pressing Space. This measures starting input; it cannot establish authorship or a completed original word. Existing drafts, resumed work, other modes and earlier versions have no pilot fields. A forced termination before delivery can leave no record. Reconcile missing participants against the recruitment count.

On Done, the review offers one optional statement, “This exercise helped me begin or continue writing.” A deliberate choice submits 1 (strongly disagree) through 5 (strongly agree). An unanswered offer has a null rating. Interrupted sessions have no offer. Use counts for both groups to show who the feedback represents. No text permission is needed for either measure.

In the pilot database, restrict the query to the recruited participant UUIDs (psql prompts for a comma-separated list). This excludes synthetic fixtures and keeps frequent writers from counting more than once. A missing observation is reported separately. An early interruption without input is inconclusive. Report the fraction with a verified timely start over all recruited people alongside these counts. A later start is observed even if the writer eventually gives a positive rating.

```sql
\prompt 'Recruited UUIDs, comma-separated: ' pilot_ids
WITH cohort AS (
  SELECT DISTINCT trim(value)::uuid AS id
  FROM regexp_split_to_table(:'pilot_ids', ',') AS value
), first_trial AS (
  SELECT c.id, trial.outcome, trial.metrics
  FROM cohort c LEFT JOIN LATERAL (
    SELECT s.outcome, b.metrics FROM research_sessions s
    JOIN research_behavior b ON b.session_id = s.id
    WHERE s.participant_id = c.id AND s.mode = 'free' AND b.metrics ? 'first_input_ms'
    ORDER BY s.started_at, s.id LIMIT 1
  ) trial ON true
), outcomes AS (
  SELECT *,
    CASE WHEN metrics IS NULL THEN 'missing'
         WHEN (metrics->>'first_input_ms')::bigint <= 120000 THEN 'started within 2 min'
         WHEN (metrics->>'observation_ms')::bigint >= 120000 THEN 'no start within 2 min'
         WHEN outcome = 'completed' THEN 'finished early without input'
         ELSE 'observation cut short' END AS initiation
  FROM first_trial
)
SELECT initiation, count(*) AS people,
       count(*) FILTER (WHERE metrics ? 'usefulness_rating') AS eligible_for_rating,
       count(metrics->>'usefulness_rating') AS answered,
       count(*) FILTER (WHERE (metrics->>'usefulness_rating')::int >= 4) AS rated_4_or_5
FROM outcomes GROUP BY initiation ORDER BY initiation;
```

If few participants start, revisit the first action or instructions. If people start quickly but respondents give low ratings, examine the exercise after the first word. These are descriptive pilot results; a causal comparison needs a comparison condition.
