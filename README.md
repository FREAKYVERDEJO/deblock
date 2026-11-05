# deblock

deblock is a private, low-pressure writing prototype. Its first exercise, *The
Signifier Chain*, helps a writer begin by following their own word associations.
It does not generate, diagnose, or interpret a writer's text.

## Start here

- [Feature list](FEATURES.md): Story Beats, highlight/blackout poetry, and existing writing tools.
- [Architecture](ARCHITECTURE.md): component contracts and implementation boundaries.

- [Product specification](deblock/spec.md): user problem, MVP requirements,
  acceptance criteria, and evidence limits.
- [Course artifacts](course_artifacts/README.md): product direction, niche
  research, personas, and the first critique-wave plan.
- [Directive](course_artifacts/directive.md): owner-controlled product invariants.
- [Niche brief](course_artifacts/niche_brief.md): selected early segment, alternatives, and
  evidence still needed.
- [Fact ledger](course_artifacts/fact_ledger.md): sourced facts, project decisions, and unknowns.
- [Personas](course_artifacts/personas.yaml): clearly labelled assumptions for a critique wave.
- [Wave 1 plan](course_artifacts/wave_1_plan.md): how to inspect the first-use journey without
  presenting simulated feedback as user research.

## Run locally

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-backend-dev.txt
.venv/bin/python manage.py migrate
.venv/bin/python manage.py runserver 127.0.0.1:8003 --noreload
```

Open <http://127.0.0.1:8003/> to sign in/create an account, or choose **Continue
without signing in** for browser-only guest writing. Read local verification/reset
emails with `.venv/bin/python manage.py mailbox`. Saved entries and images now
belong to your account and persist in the local database.

See [BACKEND.md](BACKEND.md) for account features, importing older browser saves,
security controls, tests, and PostgreSQL/SMTP deployment configuration.
[PROTOTYPE.md](PROTOTYPE.md) documents the earlier browser-only version.
