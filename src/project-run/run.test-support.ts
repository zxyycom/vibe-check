import assert from "node:assert/strict";
import {
  type Check,
  type CheckExecution,
  type DependencyReadResult,
  inherit
} from "../check/check.ts";
import { defineConfig } from "../project-definition/project-definition.ts";
import { run } from "./run.ts";

export const PASSED = Object.freeze({ status: "passed" as const, data: Object.freeze({}) });

export function check(
  overrides: Readonly<{
    readonly checkId?: string;
    readonly dependsOn?: readonly string[];
    readonly execution?: CheckExecution;
    readonly maxParallel?: number;
    readonly mutex?: readonly string[];
  }> = {}
): Check {
  return {
    checkId: overrides.checkId ?? "custom",
    displayName: overrides.checkId ?? "Custom",
    execution: overrides.execution ?? (() => PASSED),
    ...(overrides.dependsOn === undefined ? {} : { dependsOn: overrides.dependsOn }),
    ...(overrides.maxParallel === undefined ? {} : { maxParallel: overrides.maxParallel }),
    ...(overrides.mutex === undefined ? {} : { mutex: overrides.mutex })
  };
}

export function definition(checks: readonly Check[]) {
  return defineConfig({
    checks,
    outputs: { machinePublication: { enabled: false }, progressRendering: { enabled: false } }
  });
}

export function deferred(): Readonly<{
  readonly promise: Promise<void>;
  readonly resolve: () => void;
}> {
  let resolvePromise: (() => void) | undefined;
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });
  return Object.freeze({
    promise,
    resolve: (): void => {
      if (resolvePromise === undefined) throw new Error("Deferred promise is unavailable");
      resolvePromise();
    }
  });
}

export async function assertInvalidRunControlsAndDefinition(calls: () => number): Promise<void> {
  const source = definition([
    check({
      execution: () => {
        calls();
        return PASSED;
      }
    })
  ]);
  const unknown = await run(source, { changedFiles: ["src/a.ts"] });
  const unsafe = await run(source, { outputs: { diagnosticLogging: { directory: "../escape" } } });
  const invalidDefinition = await run({ ...source, unexpected: true }, {});
  assertInvalidControl(unknown, "controls.changedFiles", "unknown-key");
  assertInvalidControl(unsafe, "controls.outputs", "invalid-value");
  assert.equal(invalidDefinition.kind, "configuration");
}

export async function assertBlockedPreflight(
  calls: () => number,
  observed: (value: boolean) => void
): Promise<void> {
  const result = await run(
    definition([
      {
        ...check({
          execution: () => {
            calls();
            return PASSED;
          }
        }),
        options: { accepted: false },
        preflight: (options) => {
          observed(Object.isFrozen(options));
          return { status: "failure", action: "block", reason: { code: "invalid-options" } };
        }
      }
    ])
  );
  assert.equal(result.kind, "completed");
  if (result.kind !== "completed") return;
  assert.deepEqual(result.snapshot.checks[0]?.outcome, {
    status: "unavailable",
    reason: { code: "invalid-options" }
  });
  assert.deepEqual(result.checkDurations, [{ checkId: "custom", durationMs: null }]);
}

export async function runWithCapturedContext(root: string) {
  let received: CapturedContext | undefined;
  const source = definition([
    check({
      execution: (context) => {
        received = {
          contextFrozen: Object.isFrozen(context),
          dependencyRead: context.dependencies.get("missing"),
          dependenciesFrozen: Object.isFrozen(context.dependencies),
          options: context.options,
          projectKeys: Object.keys(context.project).sort(),
          root: context.project.root,
          signal: context.signal
        };
        return PASSED;
      }
    })
  ]);
  const result = await runWhileDateSerializationFails(source, root);
  return { received, result };
}

export function assertCapturedContext(received: CapturedContext | undefined, root: string): void {
  assert.equal(received?.contextFrozen, true);
  assert.deepEqual(received?.dependencyRead, {
    ok: false,
    error: { code: "dependency-not-declared", checkId: "missing" }
  });
  assert.equal(received?.dependenciesFrozen, true);
  assert.deepEqual(received?.options, {});
  assert.deepEqual(received?.projectKeys, ["flags", "root"]);
  assert.equal(received?.root, root);
  assert.equal(received?.signal.aborted, false);
}

export function assertDirectRunResult(result: Awaited<ReturnType<typeof run>>): void {
  assert.equal(result.kind, "completed");
  if (result.kind !== "completed") return;
  assert.deepEqual(
    result.snapshot.checks.map(({ checkId, outcome }) => ({ checkId, outcome })),
    [{ checkId: "custom", outcome: PASSED }]
  );
  assert.deepEqual(result.definitionWarnings, []);
  assert.doesNotMatch(JSON.stringify(result), /createTaskPlan|binding|operationalDependencies/);
}

export async function assertUnavailableDependencyRead(): Promise<void> {
  let dependentCalls = 0;
  let read: DependencyReadResult | undefined;
  const result = await run(
    definition([
      check({ checkId: "unavailable", execution: unavailableSource }),
      check({
        checkId: "dependent",
        dependsOn: ["unavailable"],
        execution: (context) => {
          dependentCalls += 1;
          read = context.dependencies.get("unavailable");
          return read.ok ? PASSED : { status: "unavailable", reason: { code: read.error.code } };
        }
      })
    ])
  );
  assert.equal(result.kind, "completed");
  if (result.kind !== "completed") return;
  assert.equal(dependentCalls, 1);
  assert.deepEqual(read, {
    ok: false,
    error: { code: "upstream-data-unavailable", checkId: "unavailable", status: "unavailable" }
  });
  assertUnavailableDependencySnapshot(result);
}

export async function assertInheritedDependencyRead(): Promise<void> {
  let inheritedRead: DependencyReadResult | undefined;
  const result = await run(
    definition([
      check({
        checkId: "inherited-source",
        execution: () => ({ status: "passed", data: { inherited: true } })
      }),
      inheritedContainer((read) => {
        inheritedRead = read;
      })
    ])
  );
  assert.equal(result.kind, "completed");
  if (result.kind !== "completed") return;
  assert.deepEqual(inheritedRead, {
    ok: true,
    checkId: "inherited-source",
    status: "passed",
    data: { inherited: true }
  });
  const outcome = result.snapshot.checks.find(
    (coreCheck) => coreCheck.checkId === "inherited-source"
  )?.outcome;
  if (inheritedRead?.ok && outcome?.status === "passed")
    assert.equal(inheritedRead.data, outcome.data);
}

type CapturedContext = Readonly<{
  readonly contextFrozen: boolean;
  readonly dependenciesFrozen: boolean;
  readonly dependencyRead: DependencyReadResult;
  readonly options: object;
  readonly projectKeys: readonly string[];
  readonly root: string;
  readonly signal: AbortSignal;
}>;

function assertInvalidControl(
  result: Awaited<ReturnType<typeof run>>,
  path: string,
  reason: string
): void {
  assert.deepEqual(result, {
    kind: "configuration",
    definitionWarnings: [],
    diagnostic: { kind: "invalid-run-controls", path, reason }
  });
}

async function runWhileDateSerializationFails(source: ReturnType<typeof definition>, root: string) {
  const descriptor = Object.getOwnPropertyDescriptor(Date.prototype, "toISOString");
  if (descriptor === undefined) throw new Error("Date.prototype.toISOString is unavailable");
  Object.defineProperty(Date.prototype, "toISOString", {
    configurable: true,
    value: (): string => {
      throw new Error("disabled output must not construct a publication model");
    }
  });
  try {
    return await run(source, { projectRoot: root });
  } finally {
    Object.defineProperty(Date.prototype, "toISOString", descriptor);
  }
}

function unavailableSource() {
  return { status: "unavailable" as const, reason: { code: "source-unavailable" } };
}

function assertUnavailableDependencySnapshot(
  result: Extract<Awaited<ReturnType<typeof run>>, { kind: "completed" }>
): void {
  assert.deepEqual(
    result.snapshot.checks.map(({ checkId, outcome }) => ({ checkId, outcome })),
    [
      {
        checkId: "dependent",
        outcome: { status: "unavailable", reason: { code: "upstream-data-unavailable" } }
      },
      {
        checkId: "unavailable",
        outcome: { status: "unavailable", reason: { code: "source-unavailable" } }
      }
    ]
  );
}

function inheritedContainer(setRead: (read: DependencyReadResult) => void) {
  return {
    checkId: "container",
    displayName: "Container",
    dependsOn: inherit({ add: ["inherited-source"] }),
    checks: [
      check({
        checkId: "inherited-dependent",
        execution: (context) => {
          const read = context.dependencies.get("inherited-source");
          setRead(read);
          return { status: "passed", data: { dependent: true } };
        }
      })
    ]
  };
}
