# Configuration

Vibe Check configuration is a project-owned TypeScript **Project Definition**. `defineConfig` creates its
plain value; a project-owned wrapper calls `run(definition, controls)`. Product never discovers, reloads, or
accepts a second configuration module.

This document owns authoring and invocation. Check/Record semantics belong to
[Quality Metrics](quality-metrics.md), scanner command semantics to
[Scanner dependencies](scanner-dependencies.md), and result/output DTOs to [Output](output.md).

## Public authoring surface

The target package surface is `defineConfig`, `defineCheck`, `inherit`, `run`, and the complete default values
`duplicateDetection`, `fileMetrics`, and `functionMetrics`. The repository remains a private workspace until the
separate package-boundary Change ships; its current dogfood definition is
[`scripts/quality/project-definition.ts`](../scripts/quality/project-definition.ts).

```ts
import {
  defineCheck,
  defineConfig,
  duplicateDetection,
  fileMetrics,
  functionMetrics
} from "vibe-check";

const licenses = defineCheck({
  checkId: "licenses",
  displayName: "Dependency licenses",
  execution({ project, records, signal }) {
    if (signal.aborted) return { status: "unavailable", reason: { code: "cancelled" } };
    const record = {
      recordTypeId: "license-policy",
      level: "warning",
      semanticSubject: "example",
      message: "Example project callback",
      fields: {},
      location: null
    } as const;
    records.report(record);
    if (project.comparison !== null) {
      records.reportReference({
        referenceName: project.comparison.referenceName,
        status: "complete",
        relations: [{
          relationId: "observed",
          record: {
            recordTypeId: record.recordTypeId,
            semanticSubject: record.semanticSubject,
            fields: record.fields
          }
        }]
      });
    }
    return { status: "completed", verdict: "passed" };
  },
  recordTypes: [{
    recordTypeId: "license-policy",
    fields: [],
    identityFields: [],
    policy: { operands: [], relations: ["observed"] }
  }]
});

export default defineConfig({
  checks: [{
    checkId: "repository-quality",
    displayName: "Repository quality",
    maxParallel: 2,
    checks: [{
      ...duplicateDetection,
      options: {
        ...duplicateDetection.options,
        scanner: {
          ...duplicateDetection.options.scanner,
          executable: "node_modules/.bin/jscpd"
        },
        defaultMinimumTokens: 100
      }
    }, {
      ...fileMetrics,
      options: {
        ...fileMetrics.options,
        codeLines: { ...fileMetrics.options.codeLines, changedDelta: 100 }
      }
    }, functionMetrics, licenses]
  }],
  scheduler: { maxParallel: 4 }
});
```

`defineCheck` improves TypeScript inference only. Runtime validation is the authority: it snapshots closed
plain data, rejects unknown keys and malformed declarative fields, and leaves execution callbacks as trusted
project code. A Check with `execution` owns its `options` and optional record types. A Check without execution
is a container; it may only carry recursive `checks` and scheduling fields. An empty container is accepted with
a definition warning rather than silently becoming executable.

## Recursive Check tree

Every node has a unique `checkId` and non-empty `displayName`. An executable node can also contain children;
execution and containment are independent ordinary fields. Containment contributes scheduling inheritance only:
it does not create a separately published Check or a hierarchy in the final snapshot.

`maxParallel` is a positive safe integer. The definition scheduler supplies the root value (default `4`), and a
node's value is inherited by descendants unless a child supplies its own value. `dependsOn` and `mutex` accept
an exact string collection or `inherit({ add, remove })`:

- an exact collection replaces the inherited collection, including `[]` to clear it;
- `inherit` changes the parent collection deliberately, then canonicalizes and de-duplicates it;
- dependencies name executable Check IDs; mutex values name shared resources.

The following field fragments are the only three collection forms. They belong on an ordinary Check; they are
not a second configuration format. Use Check IDs that are executable in the same Definition.

```ts
import { inherit } from "vibe-check";

const inheritedScheduling = {
  // Omit `dependsOn` or `mutex` to retain the parent's collection.
};

const exactScheduling = {
  dependsOn: ["compile"], // Replace the inherited dependencies.
  mutex: [] // Deliberately clear inherited mutexes.
};

const editedScheduling = {
  dependsOn: inherit({ add: ["test"], remove: ["lint"] }),
  mutex: inherit({ add: ["network"] })
};
```

The declaration order of `checks` is not execution order. After validation, Product flattens executable nodes to
a canonical Check catalog and runs their direct callbacks subject to dependencies, mutexes, and the effective
parallel budget.

## Defaults and native composition

The three defaults are complete ordinary `Check` values. Their scanner executable, command args, availability
args, and (for duplication) backend concurrency are all Check-owned `options`. A project customizes them with
normal object spread and must supply every field of a nested branch it replaces. Validation fails closed instead
of filling omitted nested fields or merging a hidden operational map.

| Default | Check ID | `scanner.executable` | `scanner.args` | `scanner.availabilityArgs` | Additional scanner option |
| --- | --- | --- | --- | --- | --- |
| `duplicateDetection` | `duplicate-detection` | `vibe-check-package-jscpd` (package-owned default marker) | `[]` | `['--version']` | `scanner.maxConcurrency: 4` |
| `fileMetrics` | `file-metrics` | `scc` | `[]` | `['--version']` | — |
| `functionMetrics` | `function-metrics` | `lizard` | `[]` | `['--version']` | — |

For these defaults, Product validates the complete option shape and known duplicate code-area keys. It does not
interpret environment variables, Run Controls, or repository tool state as scanner overrides.

Each row is the complete initial `options.scanner` branch for its default Check. The duplication default's stable
marker keeps its public Definition and declarative fingerprint portable. Only the private adapter recognizes that
built-in marker, resolves the installed package's `jscpd` manifest and declared bin target, and invokes it through
the active Bun executable. That resolution is not an additional scanner option, environment lookup, or
executable-discovery API. A project that replaces a scanner branch still supplies the complete ordinary command
values it wants the private adapter to execute. The adapter handoff is defined in
[Scanner dependencies](scanner-dependencies.md#check-owned-command-options).

## Invocation and results

`run` first validates one Project Definition and one closed `RunControls` value. Controls provide only invocation
context: `projectRoot`, `changedFiles`, optional named `comparison`, optional `flags`, `signal`, and effect
overrides. They cannot replace Checks, alter scanner commands, register dependencies, or select another definition.

`flags` is an optional caller-supplied dense string-token array: sparse array holes are invalid input. The array
itself may be empty: omission, `flags: undefined`, and `[]` all provide callbacks a frozen empty array. Every array
item is one non-empty string token, rather than a nested collection or value-bearing payload. Valid values are
copied, deduplicated, and lexically sorted before they reach callback context. A non-array, sparse hole, empty
token, or non-string token is an `invalid-run-controls` diagnostic at `controls.flags`.

A callback receives exactly `{ options, project, records, signal }`. `project` contains the normalized root,
file scope, comparison, cache context, and canonical `flags`. The callback reports Check-owned record candidates
and returns one of:

```ts
{ status: "completed", verdict: "passed" | "failed" }
{ status: "not-applicable", reason?: { code: string } }
{ status: "unavailable", reason: { code: string } }
```

Product contains ordinary callback, record, cancellation, and prerequisite failures as an unavailable Check
outcome. `reason.code` can be `prerequisite-unavailable` with `reason.checkIds` for blocked dependents. Invalid
configuration returns a configuration result before callback work. Every `RunResult` branch includes
`definitionWarnings`; planning/execution diagnostics use only
`comparison-preparation-failed`, `policy-validation-failed`, `task-graph-invalid`, `progress-failed`,
`task-engine-failed`, or `publication-model-failed`.

## Policy, effects, and retired inputs

`DecisionPolicy` and `selectedPolicy` are declarative definition fields. Effects own cache, logs, progress, and
output destinations; controls may narrow those effects for an invocation. Flags are callback-local context: Product
does not interpret their tokens or use them for Product-level Check selection or scheduling.

JSON/JSONC discovery, editor configuration, profile selection, adjustment helpers, parser/materializer APIs, and
operational dependency maps are retired. The retained Product CLI emits only the migration diagnostic; it does
not execute legacy configuration.
