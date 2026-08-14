# Configuration

Vibe Check configuration is a project-owned TypeScript **Project Definition**. This document owns
the authoring and invocation boundary; individual quality, policy, Check, scheduler, dependency, and
output owners continue to define their own field semantics.

## Two-file integration

The project maintains two modules with different responsibilities:

```ts
// project-definition.ts
import { defineConfig } from "vibe-check";

export default defineConfig({
  // quality, checks, policies, scheduler, effects, operationalDependencies
});
```

```ts
// project-run.ts
import { run as runVibeCheck, type RunControls } from "vibe-check";
import projectDefinition from "./project-definition.ts";

export function run(controls: RunControls = {}) {
  return runVibeCheck(projectDefinition, controls);
}
```

The configuration module owns stable project semantics and default-exports the plain value returned
by `defineConfig`. The project Run imports and binds that value. Other callers invoke the project Run;
they do not supply, discover, or reload another definition. These example paths are not package-owned
discovery conventions.

## Validation and controls

Package Run validates exactly one Project Definition and one closed Run Controls object before any
project function, dependency preparation, cache, scanner, reporter, or output work. Expected invalid
input returns a typed configuration result without executing the valid subset.

Run Controls contain only invocation context: project root, changed files, explicit comparison,
cooperative cancellation, effect overrides, and operational dependency overrides. They cannot
register Checks, select another definition, rewrite a policy, or replace the scheduler.

Project functions are trusted project code and run directly in the Bun runtime that called Package
Run. Their direct work or static `TaskPlan` is handed to the Product Task system; the configuration is
not serialized, re-evaluated, or moved into a whole-invocation worker.

## Acceptance adapter

Record acceptance belongs to named `DecisionPolicy.acceptance` entries in the Project Definition.
Quality scope and thresholds do not carry a second acceptance, artifact, cache, or version source;
effects own artifact/cache destinations and `apiVersion` owns the definition version.

## Retired configuration paths

JSON/JSONC configuration, editor configuration schemas, file discovery, and configuration `init` are
not active inputs. The retained Product CLI only emits the migration diagnostic directing callers to
a TypeScript Project Definition and bound project Run; it does not convert or execute legacy input.
