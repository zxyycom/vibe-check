import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { isNonArrayRecord } from "../../foundation/type-guards.ts";

import { parseProjectGateArguments, selectionFlags } from "./controls.ts";
import {
  createInvocationLogDirectory,
  PROJECT_GATE_EXIT_STATUS,
  projectGateExitStatus,
  runProjectGate,
  type ProjectGateExitStatus
} from "./run.ts";
import { createProjectGateEntries } from "./definition.ts";

const prepared = Object.freeze({
  artifactPath: "/tmp/vibe-check.tgz",
  candidateVersion: "0.0.0-local.fixture",
  consumerDirectory: "/tmp/consumer",
  files: [],
  inputFingerprint: "fixture",
  installedPackageDirectory: "/tmp/consumer/node_modules/vibe-check",
  resolvedEntryPath: "/tmp/consumer/node_modules/vibe-check/index.mjs",
  reused: true,
  sha256: "fixture",
  stagingDirectory: "/tmp/staging"
});

const expectedCheckIds = [
  "typecheck-product",
  "lint-product",
  "typecheck-scripts",
  "lint-scripts",
  "format-check",
  "repository-quality",
  "docs-json-validator",
  "docs-schema-validator",
  "docs-example-validator",
  "docs-links-validator",
  "decision-records",
  "test-evidence",
  "test-evidence-rule-tests",
  "git-diff-whitespace"
] as const;

const rootPackageManifestSource = readFileSync(
  fileURLToPath(new URL("../../../package.json", import.meta.url)),
  "utf8"
);

describe("Project Gate entries, root binding, and controls", () => {
  it("binds retained workspace verification names directly to the Gate profiles without disabled tags", () => {
    const manifest: unknown = JSON.parse(rootPackageManifestSource);
    assert.ok(isNonArrayRecord(manifest), "root package manifest must be an object");
    const rootScripts = manifest.scripts;
    assert.ok(isNonArrayRecord(rootScripts), "root package manifest must declare a scripts object");

    assert.deepEqual(
      {
        base: rootScripts["verify:vibe-check-workspace"],
        full: rootScripts["verify:vibe-check-workspace:full"],
        required: rootScripts["verify:vibe-check-workspace:required"]
      },
      {
        base: "bun scripts/project/gate/run.ts",
        full: "bun scripts/project/gate/run.ts --profile full",
        required: "bun scripts/project/gate/run.ts --profile required"
      }
    );
  });

  it("keeps the explicit assurance identities and current profile membership closed", () => {
    const entries = createProjectGateEntries({ invocationLogDirectory: "/tmp/project-gate-logs" });
    const expectedIds = new Set(expectedCheckIds);
    const checkIds = new Set(entries.map(({ check }) => check.checkId));

    assert.deepEqual(checkIds, expectedIds);
    for (const profile of ["required", "full"] as const) {
      assert.deepEqual(
        new Set(
          entries
            .filter((entry) => entry.profiles.includes(profile))
            .map(({ check }) => check.checkId)
        ),
        expectedIds
      );
    }
    const repositoryQuality = entries.find(({ check }) => check.checkId === "repository-quality");
    assert.deepEqual(repositoryQuality?.check.dependsOn ?? [], []);
    for (const entry of entries)
      assert.deepEqual(Object.keys(entry).sort(), ["check", "profiles", "tags"]);
  });

  it("defaults to required and normalizes explicit profile plus repeatable disabled tags into opaque flags", () => {
    assert.deepEqual(parseProjectGateArguments([]), {
      ok: true,
      value: { profile: "required", disabledTags: [] }
    });
    const parsed = parseProjectGateArguments([
      "--profile",
      "full",
      "--disable-tag",
      "quality",
      "--disable-tag",
      "docs",
      "--disable-tag",
      "quality"
    ]);

    assert.deepEqual(parsed, {
      ok: true,
      value: { profile: "full", disabledTags: ["docs", "quality"] }
    });
    if (!parsed.ok) return;
    assert.deepEqual(selectionFlags(parsed.value), [
      "project-gate:profile=full",
      "project-gate:disable-tag=docs",
      "project-gate:disable-tag=quality"
    ]);
    assert.equal(parseProjectGateArguments(["unexpected"]).ok, false);
    assert.equal(parseProjectGateArguments(["--disable-tag", ""]).ok, false);
  });
});

describe("Project Gate adapter closure", () => {
  it("does not load or run a candidate consumer after preparation failure", async () => {
    let loaded = false;
    const status = await runProjectGate([], {
      createInvocationLogDirectory: (): string => {
        throw new Error("logs must not be created");
      },
      loadRunModule: async () => {
        loaded = true;
        throw new Error("must not load");
      },
      prepareCandidate: async () => {
        throw new Error("fixture preparation failure");
      }
    });

    assert.equal(status, PROJECT_GATE_EXIT_STATUS.unavailable);
    assert.equal(loaded, false);
  });

  it("rejects an imported entry that differs from the prepared candidate before log/run", async () => {
    let createdLogs = false;
    let ran = false;
    const status = await runProjectGate([], {
      createInvocationLogDirectory: (): string => {
        createdLogs = true;
        return "/tmp/logs";
      },
      loadRunModule: async () => ({
        resolvedEntryPath: "/tmp/other/index.mjs",
        runProjectGate: async () => {
          ran = true;
          return completedResult("passed");
        }
      }),
      prepareCandidate: async () => prepared
    });

    assert.equal(status, PROJECT_GATE_EXIT_STATUS.unavailable);
    assert.equal(createdLogs, false);
    assert.equal(ran, false);
  });

  it("consumes package aggregation without traversing the raw Check snapshot", async () => {
    const complete = completedResult("passed", { snapshot: { malformed: true } });
    let createdLogs = 0;
    let loaded = 0;
    let preparedCandidates = 0;
    let ran = 0;
    let runInput:
      | Readonly<{ readonly flags: readonly string[]; readonly invocationLogDirectory: string }>
      | undefined;
    const status = await runProjectGate(
      ["--profile", "full", "--disable-tag", "docs", "--disable-tag", "docs"],
      {
        createInvocationLogDirectory: (): string => {
          createdLogs += 1;
          return "/tmp/project-gate-logs";
        },
        loadRunModule: async () => {
          loaded += 1;
          return {
            resolvedEntryPath: prepared.resolvedEntryPath,
            runProjectGate: async (input) => {
              ran += 1;
              runInput = input;
              return complete;
            }
          };
        },
        prepareCandidate: async () => {
          preparedCandidates += 1;
          return prepared;
        }
      }
    );

    assert.equal(status, PROJECT_GATE_EXIT_STATUS.passed);
    assert.equal(preparedCandidates, 1);
    assert.equal(loaded, 1);
    assert.equal(createdLogs, 1);
    assert.equal(ran, 1);
    assert.deepEqual(runInput, {
      flags: ["project-gate:profile=full", "project-gate:disable-tag=docs"],
      invocationLogDirectory: "/tmp/project-gate-logs"
    });

    const logDirectory = createInvocationLogDirectory();
    try {
      assert.equal(existsSync(logDirectory), true);
      assert.match(
        relative(resolve(dirname(fileURLToPath(import.meta.url)), "../../.."), logDirectory),
        /^\.log\/project-gate\//
      );
    } finally {
      rmSync(logDirectory, { force: true, recursive: true });
    }
  });

  it("maps aggregate, definition warning, output and malformed facts to Gate exits", () => {
    const complete = completedResult("passed");
    const cases: readonly [string, unknown, ProjectGateExitStatus][] = [
      ["failed aggregate", completedResult("failed"), PROJECT_GATE_EXIT_STATUS.failed],
      [
        "not-applicable aggregate",
        completedResult("not-applicable"),
        PROJECT_GATE_EXIT_STATUS.failed
      ],
      ["unavailable aggregate", completedResult("unavailable"), PROJECT_GATE_EXIT_STATUS.failed],
      [
        "definition warning",
        { ...complete, definitionWarnings: [{}] },
        PROJECT_GATE_EXIT_STATUS.failed
      ],
      [
        "progress failure",
        { ...complete, outputs: { progressRendering: { status: "failed" } } },
        PROJECT_GATE_EXIT_STATUS.failed
      ],
      ["configuration", { kind: "configuration" }, PROJECT_GATE_EXIT_STATUS.unavailable],
      ["malformed", { kind: "completed" }, PROJECT_GATE_EXIT_STATUS.unavailable]
    ];

    for (const [name, result, expected] of cases) {
      assert.equal(projectGateExitStatus(result), expected, name);
    }
  });
});

function completedResult(
  aggregate: "failed" | "not-applicable" | "passed" | "unavailable",
  extra: Readonly<Record<string, unknown>> = {}
): Readonly<Record<string, unknown>> {
  return {
    kind: "completed",
    aggregate,
    definitionWarnings: [],
    outputs: { progressRendering: { status: "succeeded" } },
    ...extra
  };
}
