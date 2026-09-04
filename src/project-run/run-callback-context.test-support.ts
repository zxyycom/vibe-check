import assert from "node:assert/strict";
import { basename, resolve as resolvePath } from "node:path";

import type { DependencyReadResult } from "../check/check.ts";
import { run } from "./run.ts";
import { check, definition, PASSED } from "./run-fixtures.test-support.ts";

export async function runWithCapturedContext(root: string) {
  let received: CapturedContext | undefined;
  const source = definition([
    check({
      execution: (context) => {
        received = {
          artifactDirectory: context.artifactDirectory,
          contextFrozen: Object.isFrozen(context),
          dependencyRead: context.dependencies.get("missing"),
          dependenciesFrozen: Object.isFrozen(context.dependencies),
          invocationId: context.invocationId,
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
  assert.equal(received?.artifactDirectory, null);
  assert.match(received?.invocationId ?? "", /^invocation\/v1:/);
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

export async function assertCheckArtifactPathContext(root: string): Promise<void> {
  const observations: CapturedArtifactContext[] = [];
  const checkIds = ["artifact/path", "artifact?path", "x".repeat(4_096)] as const;
  const source = definition(
    checkIds.map((checkId) =>
      check({
        checkId,
        execution: (context) => {
          observations.push(
            Object.freeze({
              artifactDirectory: context.artifactDirectory,
              contextKeys: Object.keys(context).sort(),
              invocationId: context.invocationId,
              project: context.project
            })
          );
          return PASSED;
        }
      })
    )
  );

  const withoutArtifacts = await run(source, { projectRoot: root });
  assert.equal(withoutArtifacts.kind, "completed");
  if (withoutArtifacts.kind !== "completed") return;
  assert.equal(observations.length, checkIds.length);
  assert(observations.every(({ artifactDirectory }) => artifactDirectory === null));
  const withoutArtifactInvocationIds = new Set(
    observations.map(({ invocationId }) => invocationId)
  );
  assert.equal(withoutArtifactInvocationIds.size, 1);

  observations.length = 0;
  const withArtifacts = await run(source, {
    checkArtifactBaseDirectory: "artifacts/checks",
    flags: ["beta", "alpha", "beta"],
    projectRoot: root
  });
  assert.equal(withArtifacts.kind, "completed");
  if (withArtifacts.kind !== "completed") return;
  assert.equal(withArtifacts.declarativeFingerprint, withoutArtifacts.declarativeFingerprint);
  assert.equal(observations.length, checkIds.length);

  const expectedArtifactBaseDirectory = resolvePath(root, "artifacts/checks");
  const invocationIds = new Set(observations.map(({ invocationId }) => invocationId));
  assert.equal(invocationIds.size, 1);
  assert.notEqual([...invocationIds][0], [...withoutArtifactInvocationIds][0]);
  assert.deepEqual(
    observations.map(({ project }) => project),
    observations.map(() => Object.freeze({ flags: ["alpha", "beta"], root }))
  );
  for (const observation of observations) {
    assert.equal(Object.isFrozen(observation.project), true);
    assert.deepEqual(observation.contextKeys, [
      "artifactDirectory",
      "dependencies",
      "invocationId",
      "options",
      "project",
      "records",
      "signal"
    ]);
    assert.notEqual(observation.artifactDirectory, null);
    if (observation.artifactDirectory === null) continue;
    assert.equal(resolvePath(observation.artifactDirectory, ".."), expectedArtifactBaseDirectory);
    const component = basename(observation.artifactDirectory);
    assert.match(component, /^check-[A-Za-z0-9_-]+$/);
    assert.ok(Buffer.byteLength(component, "utf8") < 255);
  }
  assert.equal(
    new Set(observations.map(({ artifactDirectory }) => artifactDirectory)).size,
    checkIds.length
  );
}

type CapturedArtifactContext = Readonly<{
  readonly artifactDirectory: string | null;
  readonly contextKeys: readonly string[];
  readonly invocationId: string;
  readonly project: Readonly<{ readonly flags: readonly string[]; readonly root: string }>;
}>;

type CapturedContext = Readonly<{
  readonly artifactDirectory: string | null;
  readonly contextFrozen: boolean;
  readonly dependenciesFrozen: boolean;
  readonly dependencyRead: DependencyReadResult;
  readonly invocationId: string;
  readonly options: object;
  readonly projectKeys: readonly string[];
  readonly root: string;
  readonly signal: AbortSignal;
}>;

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
