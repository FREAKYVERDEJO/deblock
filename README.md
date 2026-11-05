# deblock

deblock is a private, low-pressure writing prototype. Its first exercise, *The
Signifier Chain*, helps a writer begin by following their own word associations.
It does not generate, diagnose, or interpret a writer's text.

## Start here

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
python3 -m deblock.server
```

Open http://127.0.0.1:8000. For the expanded prototype notes and test commands,
see [PROTOTYPE.md](PROTOTYPE.md).
