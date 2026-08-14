# Configured TypeScript Fixture

This checked-in project is scan input for Project Definition and Package Run tests. Product does
not discover configuration inside the fixture.

- `src/eligible.ts` is the only file that enters the configured scan scope.
- `src/ignored.generated.ts` is removed by `generatedFiles`.
- `excluded/ignored.ts` is removed by `excludeDirs`.
- The one-file fixture intentionally leaves duplicate detection without an eligible multi-file
  area. Tests can provide deterministic scanner bindings through Run Controls; those bindings are
  operational inputs, not project policy.

A caller imports a project-owned Run and passes this fixture path only when that Run exposes a
project-root control. There is no JSON file, discovery step, or `--config` compatibility path.
