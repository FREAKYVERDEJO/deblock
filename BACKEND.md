# Accounts and storage

## Story Beats and blackout poetry

Run `.venv/bin/python manage.py migrate` after updating to add the nullable
`story` and `blackout` fields (migration `0002_entry_writing_modes`). Existing
entries are preserved. Restart the local server after updating Python code.

Open **Story Beats** above Profile in the menu. Library saves preserve the outline,
each passage, active passage and unfinished input. Open the saved entry and choose
**continue writing** to resume. The plain-text editor is hidden for structured
stories and poems. Existing owner/revision checks also protect these entries.

From a finished free-association chain, **highlight / blackout** selects words
to keep. Saving stores the original chain and its selection; exports show the
chosen view. Both fields use version 1 and are validated by `backend/writing.py`.
The request/response routes are unchanged; see [architecture](ARCHITECTURE.md) for
the shapes and [features](FEATURES.md) for the user flows.

Visual exports allow only the pinned html2canvas pseudo-element stylesheet via a
CSP hash, plus `data:` images for its font probe. Inline scripts and other inline
styles remain blocked. Exported documents omit editing controls.

## Account behavior

The default app uses Django and django-allauth for email/password accounts. Email
verification is required for account writing and server saves. **Continue without
signing in** on account pages opens `/guest/` with the shared UI and browser-only
IndexedDB storage. It does not create or change a login session, fetch private
collections, or upload writing. Guest saves can later be explicitly imported
through Profile after signing in. Library entries and Gallery
PNGs belong to the signed-in user; every API lookup checks ownership. Text stays
in the page until the writer chooses **save → to library**. **as PNG** downloads
and also saves to Gallery; **as PDF** downloads only. Entries can be edited and
deleted; profile changes, verified email changes, password changes, password
resets, sign-out, and password-confirmed account deletion are supported.

## Local development

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-backend-dev.txt
.venv/bin/python manage.py migrate
.venv/bin/python manage.py runserver 127.0.0.1:8003 --noreload
```

Open <http://127.0.0.1:8003/> and sign in/create an account, or choose **Continue
without signing in**. Verification and password-reset
emails are written to `var/mail/`, not sent externally. To read the latest email:

```sh
.venv/bin/python manage.py mailbox
```

Open its link and confirm the email, then sign in. Treat verification/reset links
as secrets. There is deliberately no public web mailbox. SQLite, a generated
local secret, and email files are under the ignored `var/` directory. Back up that
directory if you want to preserve local accounts; never commit it. Keep the
server bound to localhost. Development uses one process with an in-memory rate
limit cache; restarting the process resets those limits.

Use `DEBLOCK_ORIGIN` if choosing another port. Cookies are scoped to hosts, not
ports: isolated development copies should use separate browser profiles when
logging into different databases. Local email can use SMTP by exporting the
`EMAIL_HOST`, `EMAIL_HOST_USER`, and `EMAIL_HOST_PASSWORD` variables. Set
`DEFAULT_FROM_EMAIL` for the provider as well.

## Existing browser saves

The new app never uploads old IndexedDB data automatically. Open **Profile →
import browser entries** and confirm the target email. It copies Library entries
and Gallery images, preserves their content/artwork, and leaves originals in the
browser. Import must run at the same origin (scheme, hostname, port) as the old
prototype, normally `http://127.0.0.1:8003`. Download any unsaved draft before
reloading an old tab. Imports can be retried without duplicating already copied
IDs; a large import may hit rate limits and need a retry after a minute.

Browser profile information does not become account credentials. Choose the name
and avatar again in Profile. Account email and join date come from the server.
The normal `.venv/bin/python -m deblock.server --port 8016` launcher serves this
account backend and configures local email links for that port. Run migrations
as above before starting it. Add `--browser-only` for the legacy standard-library
prototype; that mode hides sign-in and has no accounts or server persistence.
Neither preview command is a production deployment server.

## Security boundaries

- Argon2 password hashing; Django password validation (minimum 12 characters).
- Mandatory verified email; expiring, single-use reset links; password resets
  invalidate existing sessions. Change-email and password flows use allauth.
- Database sessions, HttpOnly/SameSite cookies, CSRF and same-origin checks,
  session rotation at login, POST sign-out, and generic password-reset responses.
- Rate limits for login, signup, recovery, writes, uploads, and password-confirmed
  account deletion. Production requires shared Redis for multi-worker limits.
- Per-user authorization for reads, writes, and image downloads. Client owner
  IDs are ignored. Tabs send their original account ID to avoid saving an old
  draft into a different user's session. Stale entry revisions are rejected.
- JSON text rendering, a restrictive same-origin Content Security Policy, framing
  protection, no-store responses, and host validation. Same-origin referrers are
  retained for browser CSRF compatibility; cross-origin referrers are suppressed.
- PNG-only uploads are decoded, size-checked, and re-encoded to strip metadata.
  No arbitrary file paths or public uploads directory. Limits: 8 MB/PNG,
  24 megapixels, 100 images/100 MB Gallery, 1,000 entries, 250,000 characters/entry.
- Account deletion cascades only that user's entries/images. Deletion is permanent
  in the active database; backup retention must be defined by the deployment owner.

Writing is stored as ordinary database records, not end-to-end encrypted.
Production infrastructure must provide encrypted disks/backups and restricted
operator access. No private writing or credentials should appear in request logs,
error reports, analytics, or third-party scripts. There are no analytics scripts.
These controls and automated checks are not a guarantee against all attacks or a
substitute for a deployment security review.

## Production configuration (not deployed yet)

See `.env.example`. Variables must be exported by the hosting platform; `.env`
is not automatically loaded. `DEBLOCK_ENV=production` refuses to start without a
random secret, HTTPS canonical origin, PostgreSQL URL, Redis URL, and SMTP
credentials/sender. Debugging is disabled; Secure cookies, HTTPS redirect, HSTS,
and canonical email links are enabled. Keep the secret stable across restarts.

Use TLS with certificate verification for PostgreSQL (`verify-full`, provider CA
via `PGSSLROOTCERT`) and a private authenticated Redis service (`rediss://`).
Use least-privilege database credentials. Do not expose database/cache ports.
The production database and Redis connection paths still need an integration run
against the chosen hosting provider; local tests currently use SQLite and memory
cache. SMTP delivery, sender DNS (SPF/DKIM/DMARC), and recovery delivery must also
be tested with that provider.

After provisioning services and exporting configuration:

```sh
.venv/bin/python manage.py migrate --noinput
.venv/bin/python manage.py check --deploy --fail-level WARNING
.venv/bin/gunicorn deblock.backend.wsgi:application --bind 127.0.0.1:8003 --workers 2 --timeout 60
```

Put an HTTPS reverse proxy in front of Gunicorn. Limit request bodies to 10 MB,
set request timeouts and connection limits, and keep the app port private. Only
set `DEBLOCK_TRUST_PROXY_HTTPS=1` and `DEBLOCK_TRUSTED_PROXY_COUNT` when that proxy
strips spoofed forwarding headers and replaces them itself. Rate-limit IPs rely
on correct proxy configuration. Disable access logs containing full URLs: email
verification/reset tokens occur in URL paths. Log only safe request metadata;
monitor error counts and service health without storing bodies or cookies.

Run `manage.py clearsessions` daily. Schedule encrypted database backups and test
restoration; set retention and deletion procedures. Gallery binaries are in the
database, so they are included in backups and consume database capacity. Add a
private object store if later scale requires it. Patch dependencies regularly:

```sh
.venv/bin/python -m pytest -q
node tests/account_storage_checks.cjs
.venv/bin/python -m pip_audit -r requirements.txt
```

Before inviting real users: run migrations and the test suite on PostgreSQL,
validate Redis rate limits across workers, exercise signup/recovery through real
SMTP, check TLS/proxy headers and cookies from the public origin, restore a
backup, and review the deployment independently.
