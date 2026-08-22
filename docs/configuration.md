# Configuration

Vibe Check configuration is a project-owned TypeScript **Project Definition**. `defineConfig` creates its plain value; a project-owned wrapper calls `run(definition, controls)`. Product never discovers, reloads, or accepts a second configuration module.

This document owns authoring and invocation. Check/Record semantics belong to [Quality Metrics](quality-metrics.md), scanner command semantics to [Scanner dependencies](scanner-dependencies.md), and result/output DTOs to [Output](output.md).

`ProjectDefinition.quality` is a closed scope configuration with exactly `codeAreas`, `excludeDirs`,
`generatedFiles`, and `include`. It selects files and code areas for Check work; it has no reporting or
publication setting.

## Public authoring surface

The package surface is `defineConfig`, `defineCheck`, `inherit`, `run`, and the complete default values `duplicateDetection`, `fileMetrics`, and `functionMetrics`. The repository dogfood definition is [`scripts/quality/project-definition.ts`](../scripts/quality/project-definition.ts).

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
  async execution({ records, signal }) {
    if (signal.aborted) return { status: "unavailable", reason: { code: "cancelled" } };

    const disallowed = await inspectDependencyLicenses();
    for (const dependency of disallowed) {
      records.report(
        { id: `dependency:${dependency.name}` },
        { license: dependency.license, name: dependency.name }
      );
    }
    return disallowed.length === 0
      ? { status: "passed", data: { disallowedCount: 0 } }
      : { status: "failed", data: { disallowedCount: disallowed.length } };
  }
});

export default defineConfig({
  checks: [
    {
      checkId: "repository-quality",
      displayName: "Repository quality",
      maxParallel: 2,
      checks: [duplicateDetection, fileMetrics, functionMetrics, licenses]
    }
  ],
  scheduler: { maxParallel: 4 }
});
```

`defineCheck` improves TypeScript inference only. Runtime validation is the authority: it snapshots closed plain data, rejects unknown keys and malformed declarative fields, and leaves execution callbacks as trusted project code. A Check with `execution` owns its `options`. A Check without execution is a container; it may only carry recursive `checks` and scheduling fields. An empty container is accepted with a definition warning rather than silently becoming executable.

An executable Check returns exactly one terminal result, optionally with ordered terminal messages:

```ts
{ status: "passed", data: object, messages?: readonly CheckMessage[] }
{ status: "failed", data: object, messages?: readonly CheckMessage[] }
{ status: "not-applicable", reason?: { code: string }, messages?: readonly CheckMessage[] }
{ status: "unavailable", reason: { code: string }, messages?: readonly CheckMessage[] }
```

`passed` and `failed` require an object final data value; an empty object is the authoring form for no domain data. A callback may separately call `records.report({ id }, data)` zero or more times. These final returns and two-argument reporting are the complete shared result surface: a Check owns its data shape, and a Project Run supplies only explicit invocation controls.

Terminal messages and explicit visibility are two distinct primary Check capabilities. Messages provide final supplemental detail; visibility controls whether a settled human row remains visible. Neither changes the Check outcome, scheduling, Records, Core facts, or machine publication.

`messages` is an optional dense ordered array of exact `{ level, code, message }` items. `level` is
`info | warning | error`; `code` matches `^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$` in the owning Check namespace;
and `message` is a non-empty string, without trimming, Unicode normalization, or a Product item/length cap.
`CheckMessage` is a supporting declaration used by `CheckResult`; it does not expand the package-root named-type inventory.
Omitted, own-property `undefined`, and an empty array all mean no messages. Product keeps author item order
without de-duplication or normalization. It validates the complete attachment
descriptor-safely with the terminal result: a malformed item or attachment makes the author result
unavailable and no partial messages are accepted. Messages are supplemental human/programmatic detail,
not final data or supplemental Records.

## Recursive Check tree

Every node has a unique `checkId` and non-empty `displayName`. An executable node can also contain children; execution and containment are independent ordinary fields. Containment contributes scheduling inheritance only: it does not create a separately published Check or a hierarchy in the final snapshot.

`maxParallel` is a positive safe integer. The definition scheduler supplies the root value (default `4`), and a node's value is inherited by descendants unless a child supplies its own value. `dependsOn` and `mutex` accept an exact string collection or `inherit({ add, remove })`:

- an exact collection replaces the inherited collection, including `[]` to clear it;
- `inherit` changes the parent collection deliberately, then canonicalizes and de-duplicates it;
- dependencies name executable Check IDs; mutex values name shared resources.

The following field fragments are the only three collection forms. They belong on an ordinary Check; they are not a second configuration format. Use Check IDs that are executable in the same Definition.

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

An executable Check may declare `visibility: "always" | "attention"`. Omission and explicit `undefined`
normalize to `always`; a container cannot declare visibility, does not pass it to children, and unknown
values fail Definition validation. Visibility is declarative presentation identity: normalized executable
declarations always carry it, so `always` has the same fingerprint whether omitted or explicit and
`attention` changes that fingerprint. It does not change scheduling, execution, options, Check/Record
facts, machine output, Run Controls, or invocation-wide progress configuration.

The declaration order of `checks` is not execution order. After validation, Product flattens executable nodes to a canonical Check catalog and runs their direct callbacks subject to dependencies, mutexes, and the effective parallel budget.

## Defaults and native composition

The three defaults are complete ordinary `Check` values. Their scanner executable, command args, availability args, and (for duplication) backend concurrency are all Check-owned `options`. A project customizes them with normal object spread and must supply every field of a nested branch it replaces. Validation fails closed instead of filling omitted nested fields or merging a hidden operational map.

| Default              | Check ID              | `scanner.executable`                                      | `scanner.args` | `scanner.availabilityArgs` | Additional scanner option   |
| -------------------- | --------------------- | --------------------------------------------------------- | -------------- | -------------------------- | --------------------------- |
| `duplicateDetection` | `duplicate-detection` | `vibe-check-package-jscpd` (package-owned default marker) | `[]`           | `['--version']`            | `scanner.maxConcurrency: 4` |
| `fileMetrics`        | `file-metrics`        | `scc`                                                     | `[]`           | `['--version']`            | —                           |
| `functionMetrics`    | `function-metrics`    | `lizard`                                                  | `[]`           | `['--version']`            | —                           |

For these defaults, Product validates the complete option shape and known duplicate code-area keys. It does not interpret environment variables, Run Controls, or repository tool state as scanner overrides.

The metric defaults contain only their documented absolute floors and nested allowances; no default option
expresses a changed-file delta threshold. `RunControls.changedFiles` remains callback context, not a hidden
default metric option.

Each row is the complete initial `options.scanner` branch for its default Check. The duplication default's stable marker keeps its public Definition and declarative fingerprint portable. Only the private adapter recognizes that built-in marker, resolves the installed package's `jscpd` manifest and declared bin target, and invokes it through the active Bun executable. That resolution is not an additional scanner option, environment lookup, or executable-discovery API. A project that replaces a scanner branch still supplies the complete ordinary command values it wants the private adapter to execute. The adapter handoff is defined in [Scanner dependencies](scanner-dependencies.md#check-owned-command-options).

## Invocation and results

`run` first validates one Project Definition and one closed `RunControls` value. Controls provide only invocation context: `projectRoot`, `changedFiles`, optional `flags`, optional explicit `checkAggregation`, `signal`, and effect overrides. They cannot replace Checks, alter scanner commands, register dependencies, or select another definition.

`flags` is an optional caller-supplied dense string-token array: sparse array holes are invalid input. The array itself may be empty: omission, `flags: undefined`, and `[]` all provide callbacks a frozen empty array. Every array item is one non-empty string token, rather than a nested collection or value-bearing payload. Valid values are copied, deduplicated, and lexically sorted before they reach callback context. A non-array, sparse hole, empty token, or non-string token is an `invalid-run-controls` diagnostic at `controls.flags`.

`checkAggregation` has no default and is the only multi-Check aggregation surface:

```ts
{
  checks: "all" | readonly string[],
  mode: "all" | "any",
  unavailable: "propagate" | "fail" | "exclude",
  notApplicable: "exclude" | "pass" | "fail",
  empty: "passed" | "failed" | "not-applicable"
}
```

Unknown, duplicate, or non-normalized Check IDs fail validation before work. With no `checkAggregation`, completed/effect facts contain `aggregate: null`; when present, Run derives `passed | failed | not-applicable | unavailable` only from the selected settled Check statuses. Raw canonical Check/Record facts are always retained for generic readback.

A callback receives exactly `{ options, project, records, signal }`. `project` contains the normalized root, file scope, cache context, and canonical `flags`. Product contains ordinary callback, record, cancellation, and prerequisite failures as an unavailable Check outcome. `reason.code` can be `prerequisite-unavailable` with `reason.checkIds` for blocked dependents. Invalid configuration returns a configuration result before callback work. Every `RunResult` branch includes `definitionWarnings`; planning/execution diagnostics use documented run vocabulary. A progress write failure instead marks the progress effect failed; when final facts are available, it returns the existing `effect-failed` diagnostic for `progress` rather than changing Check facts. A branch with a final `snapshot` also includes `checkDurations`, a frozen canonical-order array of `{ checkId, durationMs }` entries aligned one-for-one with `snapshot.checks`, and `checkMessages`, a frozen array of `{ checkId, level, code, message }`. `checkMessages` occurs only on `completed`, `effect`, and execution-phase `cancelled` final-snapshot branches. It contains only accepted author attachments, ordered by canonical `snapshot.checks` order and then author item order; progress-disabled and progress-writer-failed runs retain the same readback.

## Run effects and compatibility boundary

Effects own only cache, progress, and output destinations; controls may override their settings for an
invocation. Progress is enabled by the Product default: it owns the execution header, settled Check lifecycle
feedback, and final execution summary on its target stream. TTY targets additionally show every running Check
in a temporary region; non-TTY or dumb targets retain only settled feedback and the final summary. On
settlement, `attention` hides only a passed Check with no messages. Every other four-state outcome, and a
passed `attention` Check with messages, emits its row plus all messages as one contiguous write; hidden
Checks still consume the canonical completion ordinal and final counts. Progress presentation is not a project
callback, observer, or renderer API, and a progress write failure stops that effect without changing Check
execution facts or accepted `checkMessages`. Flags are callback-local context: Product does not interpret
their tokens or use them for Product-level Check selection or scheduling. Project-owned transcripts, such as
the repository Gate log directory, are not a Product `logs` effect.

Product has no shared comparison/reference channel or policy-selection layer. A repository Gate binds selected IDs and an explicit aggregation configuration in its own Project Run; its adapter only maps Run facts and `aggregate` to process exit. A producing Check owns any baseline or comparison behavior through its own options or composition.

Product neither discovers JSON/JSONC configuration nor exposes editor profiles, adjustment helpers, parser/materializer APIs, or operational dependency maps. The retained Product CLI emits only a migration diagnostic; it is not a configuration execution path.
