import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import type { CheckProjectContext } from "../check/check.ts";
import { defineConfig } from "../project-definition/project-definition.ts";
import { CHANGE_FLAG_PREFIX, GIT_CHANGES_UNAVAILABLE_CODE } from "./changes/git.ts";
import { commit, git, write } from "./changes/git.test-support.ts";
import { run } from "./run.ts";

const RUNTIME_CHANGE_FLAG = `${CHANGE_FLAG_PREFIX}runtime`;

describe("Package Run project changes", () => {
  it("uses one frozen change result for preparation and execution while selecting with derived flags", async () => {
    const repository = repositoryFixture();
    let preparedProject: CheckProjectContext | undefined;
    let executedProject: CheckProjectContext | undefined;
    let calls = 0;
    try {
      write(repository, "src/runtime.ts", "export const runtime = 2;\n");
      commit(repository, "change runtime");
      const result = await run(
        defineConfig({
          changes: runtimeChanges(),
          checks: [
            {
              checkId: "change-aware",
              displayName: "Change aware",
              enabledByFlags: { when: RUNTIME_CHANGE_FLAG },
              prepare: (options, _signal, project) => {
                preparedProject = project;
                return { preparedOptions: options, status: "success" };
              },
              execute: ({ project }) => {
                calls += 1;
                executedProject = project;
                return { data: {}, status: "passed" };
              }
            }
          ],
          outputs: disabledOutputs()
        }),
        { checkAggregation: effectiveAggregation(), flags: ["caller"], projectRoot: repository }
      );

      assert.equal(calls, 1);
      assert.equal(result.kind, "completed");
      if (result.kind === "completed") assert.equal(result.aggregate, "passed");
      assert.equal(preparedProject, executedProject);
      assert.deepEqual(executedProject?.flags, ["caller", RUNTIME_CHANGE_FLAG]);
      assert.equal(Object.isFrozen(executedProject?.flags), true);
      assert.equal(Object.isFrozen(executedProject?.changes), true);
      assert.deepEqual(executedProject?.changes, {
        ok: true,
        files: [
          {
            flags: [RUNTIME_CHANGE_FLAG],
            path: "src/runtime.ts"
          }
        ]
      });
    } finally {
      rmSync(repository, { force: true, recursive: true });
    }
  });

  it("rejects option-like Git comparisons before preparation or execution", async () => {
    let authorCalls = 0;
    const result = await run(
      defineConfig({
        changes: {
          flags: { runtime: { exclude: [], include: ["src/**"] } },
          source: { compareWith: "--output=unexpected" }
        },
        checks: [
          {
            checkId: "change-aware",
            displayName: "Change aware",
            prepare: (options) => {
              authorCalls += 1;
              return { preparedOptions: options, status: "success" };
            },
            execute: () => {
              authorCalls += 1;
              return { data: {}, status: "passed" };
            }
          }
        ],
        outputs: disabledOutputs()
      })
    );

    assert.deepEqual(result, {
      definitionWarnings: [],
      diagnostic: {
        kind: "invalid-project-definition",
        path: "definition.changes",
        reason: "invalid-value"
      },
      kind: "configuration"
    });
    assert.equal(authorCalls, 0);
  });

  it("keeps unavailable evidence honest while conservatively selecting change-enabled checks", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-project-changes-lifecycle-"));
    let observed: CheckProjectContext | undefined;
    try {
      const result = await run(
        defineConfig({
          changes: runtimeChanges(),
          checks: [
            {
              checkId: "change-aware",
              displayName: "Change aware",
              enabledByFlags: { when: RUNTIME_CHANGE_FLAG },
              execute: ({ project }) => {
                observed = project;
                return { data: {}, status: "passed" };
              }
            }
          ],
          outputs: disabledOutputs()
        }),
        { projectRoot: root }
      );

      assert.equal(result.kind, "completed");
      assert.deepEqual(observed?.flags, [RUNTIME_CHANGE_FLAG]);
      assert.deepEqual(observed?.changes, {
        ok: false,
        reason: { code: GIT_CHANGES_UNAVAILABLE_CODE }
      });
      assert.equal("files" in (observed?.changes ?? {}), false);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});

function runtimeChanges() {
  return {
    flags: {
      runtime: { exclude: [], include: ["src/**"] }
    },
    source: { compareWith: "HEAD~1" }
  };
}

function disabledOutputs() {
  return {
    machinePublication: { enabled: false },
    progressRendering: { enabled: false }
  };
}

function effectiveAggregation() {
  return {
    checks: "effective" as const,
    empty: "not-applicable" as const,
    mode: "all" as const,
    notApplicable: "exclude" as const,
    unavailable: "propagate" as const
  };
}

function repositoryFixture(): string {
  const repository = mkdtempSync(join(tmpdir(), "vibe-check-project-changes-"));
  git(repository, ["init", "--quiet"]);
  git(repository, ["config", "user.email", "changes-lifecycle@example.invalid"]);
  git(repository, ["config", "user.name", "Changes Lifecycle"]);
  write(repository, "src/runtime.ts", "export const runtime = 1;\n");
  commit(repository, "baseline");
  return repository;
}
