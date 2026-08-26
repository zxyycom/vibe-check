# Product source

- `check/`, `project-definition/`, and `check-settlement/` own ordinary Check authoring, Project Definition grammar, and terminal facts.
- `project-run/` owns one Project Run: controls, Check execution, progress rendering, machine publication wiring, and its private task scheduler.
- `package-checks/` delivers package-provided Checks; duplicate-detection owns its own cache.
- `scripts/package/public-api-inventory.ts` is tooling inventory, not Product runtime.
