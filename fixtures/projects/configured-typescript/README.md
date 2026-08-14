# Configured TypeScript Fixture

This checked-in project contains only deterministic source-tree input for Project Definition and
Package Run tests. It does not own a Project Definition or Project Run; each test supplies those
through its actual caller boundary. Product does not discover configuration inside the fixture.

- `src/eligible.ts` is the only file that enters the configured scan scope.
- `src/ignored.generated.ts` is removed by `generatedFiles`.
- `excluded/ignored.ts` is removed by `excludeDirs`.
- The one-file fixture intentionally leaves duplicate detection without an eligible multi-file
  area. Tests can provide deterministic scanner bindings through Run Controls; those bindings are
  operational inputs, not project policy.

A caller imports a project-owned Run and passes this fixture path only when that Run exposes a
project-root control. There is no configuration file in this fixture and no compatibility input.
