# Configuration

Vibe Check configuration is a project-owned TypeScript **Project Definition**. This document owns
the authoring and invocation boundary: `defineConfig` returns the plain definition, and
`run(definition, controls)` is the Product run operation. Individual quality, policy, Check,
scheduler, dependency, and output owners continue to define their own field semantics.

The runtime contract is implemented in `src/product/**`, and repository dogfood binds it in
[`scripts/quality/project-definition.ts`](../scripts/quality/project-definition.ts) and
[`scripts/quality/project-run.ts`](../scripts/quality/project-run.ts). The repository root remains a
private workspace: there is not yet an installable `vibe-check` package entry. The active
`establish-api-only-npm-product-boundary` Change owns that package projection and its exact-tarball
evidence. In this document, **Package Run** means the future public export of the existing Product run
operation; it does not imply that npm delivery is already available.

## Future two-file package integration

After the downstream package Change passes installed-consumer acceptance, a project maintains two
modules with different responsibilities:

```ts
// project-definition.ts
import {
  append,
  defineConfig,
  duplicateDetection,
  fileMetrics,
  functionMetrics,
  replace
} from "vibe-check";

export default defineConfig({
  checks: [{
    id: "source-analysis",
    maxParallel: 2,
    checks: [
      replace(duplicateDetection, {
        options: { defaultMinimumTokens: 100 }
      }),
      append(
        replace(fileMetrics, {
          maxParallel: 1,
          options: {
            codeLines: { changedDelta: 100 }
          }
        }),
        { mutex: "metrics-scanner" }
      ),
      functionMetrics
    ]
  }],
  scheduler: { maxParallel: 4 }
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
by `defineConfig`. The project Run imports and binds that value. Other callers invoke the project Run
with only the controls that this project exposes. They cannot supply, discover, or reload another
definition. These example paths are not package-owned discovery conventions. Until the downstream
package Change completes, `from "vibe-check"` is a target consumer import rather than a currently
installable repository dependency; use the repository dogfood files above as the current integration
evidence, not as external project path conventions.

## Validation and controls

The Product run operation validates exactly one Project Definition and one closed Run Controls object
before any project function, dependency preparation, cache, scanner, reporter, or output work.
Expected invalid input returns a typed configuration result without executing the valid subset.

Run Controls contain only invocation context: project root, changed files, explicit comparison,
cooperative cancellation, effect overrides, and operational dependency overrides. They cannot
register Checks, select another definition, rewrite a policy, or replace the scheduler.

Project functions are trusted project code and run directly in the Bun runtime that called the Product
run operation. Their direct work or static `TaskPlan` is handed to the Product Task system; the
configuration is not serialized, re-evaluated, or moved into a whole-invocation worker.

## Check tree and scheduler

The current definition-facing source exports three non-callable built-in Check values:
`duplicateDetection`, `fileMetrics`, and `functionMetrics`. The downstream package Plan must project
`defineConfig`, `run`, `replace`, `append`, these values, and the `BuiltInCheck` type without creating
a second metadata or option contract. Put these values and any custom Check leaves directly in the
`checks` tree. A leaf is selected by appearing in the tree; no separate built-in catalog, selected
list, or schedule list is authored. A group is authoring-only and is flattened before execution, so it
does not create a CheckRun, Record, policy identity, or output row.

The order of a `checks` array has no execution meaning. A leaf runs by default when its dependencies
and resources permit it. `dependsOn` and `mutex` may occur on a group or leaf; normalization appends
and de-duplicates both parent and child lists. A `dependsOn` reference can name a leaf `checkId` or a
group `id`; a group reference expands to all of that group's leaves. `dependsOn` is the only Check
ordering constraint, and `mutex` is the named resource constraint.

Each `BuiltInCheck` includes complete typed default `options`. `replace(check, replacement)` takes
only that Check's field-aware replacement shape: supplied scalar or fixed nested fields replace their
defaults while omitted branches stay unchanged. An open option map, such as `minimumTokensByCodeArea`,
is replaced as one complete field rather than merged entry-by-entry. `replace` can also replace a
leaf's `maxParallel`, `dependsOn`, or `mutex` value. `append(check, additions)` accepts only leaf
`dependsOn` and `mutex`; it appends and stably de-duplicates those local collections before normal
group-to-leaf inheritance runs. Both helpers return a new built-in Check value, so they compose as
`append(replace(fileMetrics, patch), additions)` without mutating the input or shared defaults.
`replace` and `append` construct adjusted built-in Check values; `run` executes Product work. Built-in
options own only that Check's public semantics, such as its thresholds. Project-wide code areas, file
scope, generated-file classification, report presentation,
policies, effects, scheduler, and operational dependencies remain top-level Project Definition fields.
Scanner commands, arguments, exit mapping, adapters, and bindings remain private.

`scheduler.maxParallel` is the invocation-wide root budget (default `4`). A group or leaf can set a
positive safe-integer `maxParallel` no greater than that root value. A leaf without a value inherits
the nearest group value; only a path with no group or leaf value uses the root budget. The nearest child
value overrides an inherited group value. `maxParallel: 1` means the shared scheduler runs one Product
work slot while that resolved Check is active; it does not define a second mode or make array order
serial.

A resolved Check's cap becomes active when its first executable direct task or TaskPlan leaf is
admitted, and remains active until direct settlement or TaskPlan terminal completion settles. The shared
scheduler uses the minimum of the root budget and all active Check caps. A lower ready cap reserves a
deterministic admission and lets existing work drain without preemption; ready work for an active
constrained Check is preferred. A Check with no executable direct task or TaskPlan leaf never activates
its cap; a zero-leaf completion does not tighten the budget. These caps govern Product Task slots only.
A scanner adapter or project function can still use its own internal subprocesses, workers, or threads;
it does not gain a separate Product scheduler or change the shared budget.

## Acceptance adapter

Record acceptance belongs to named `DecisionPolicy.acceptance` entries in the Project Definition.
Quality scope and thresholds do not carry a second acceptance, artifact, cache, or version source;
effects own artifact/cache destinations and `apiVersion` owns the definition version.

## Retired configuration paths

JSON/JSONC configuration, editor configuration schemas, file discovery, and configuration `init` are
not active inputs. The retained Product CLI only emits the migration diagnostic directing callers to
a TypeScript Project Definition and bound project Run; it does not convert or execute legacy input.
