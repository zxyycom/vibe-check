import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { isNonArrayRecord } from "../../value-guards.ts";
import type { PreparedPackageCandidate } from "../../package/candidate/prepare.ts";

import {
  parseProjectGateArguments,
  projectGateHelp,
  projectGateSelectionSummary,
  selectionFlags,
  selectionFromFlags
} from "./controls.ts";
import {
  createInvocationLogDirectory,
  PROJECT_GATE_EXIT_STATUS,
  projectGateExitStatus,
  runProjectGate,
  type ProjectGateContext,
  type ProjectGateExitStatus
} from "./run.ts";
import {
  createInitialProjectGateResult,
  createProjectGateResult,
  parseProjectGateResult,
  type ProjectGateResult
} from "./result.ts";
import type { ProjectGatePerformanceBaseline } from "./performance-baseline.ts";
import { observeProjectGatePerformance } from "./performance-observation.ts";
import { createProjectGateEntries } from "./definition.ts";
import { createExternalConsumerMaterialLease } from "./external-consumer-material-check.ts";

const prepared = Object.freeze({
  artifactPath: "/tmp/vibe-check.tgz",
  candidateVersion: "0.0.0-local.fixture",
  consumerDirectory: "/tmp/consumer",
  files: ["package/index.mjs"],
  inputFingerprint: "a".repeat(64),
  installedPackageDirectory: "/tmp/consumer/node_modules/vibe-check",
  preparationAction: "reuse",
  preparationReason: "installation-current",
  resolvedEntryPath: "/tmp/consumer/node_modules/vibe-check/index.mjs",
  reused: true,
  sha256: "b".repeat(64),
  stagingDirectory: "/tmp/staging"
});

const performanceRuntime = Object.freeze({
  architecture: "x64",
  bunVersion: "1.3.14",
  platform: "linux"
});
const performanceBaseline = Object.freeze({
  medianMs: 90,
  p90Ms: 100,
  samplesMs: Object.freeze([80, 90, 100]),
  thresholdMs: 135,
  workload: Object.freeze({
    candidatePreparation: "reuse" as const,
    declarativeFingerprint: "performance-fixture",
    profile: "required" as const,
    runtime: performanceRuntime
  })
} satisfies ProjectGatePerformanceBaseline);

const expectedCheckIds = [
  "typecheck-product",
  "lint-product",
  "typecheck-scripts",
  "lint-scripts",
  "format-check",
  "prepared-package-candidate",
  "prepared-external-package-consumer",
  "tests-package-supporting",
  "tests-package-candidate",
  "tests-package-artifact",
  "tests-package-consumer-types",
  "tests-package-consumer-docs",
  "tests-package-consumer-runtime",
  "tests-product-duplicate-detection",
  "tests-product-file-metrics",
  "tests-product-function-metrics",
  "tests-product-json",
  "tests-product-markdown-links",
  "tests-product-supporting-checks",
  "tests-product-runtime",
  "tests-scripts-project",
  "tests-scripts-test-evidence",
  "tests-scripts-validation",
  "tests-scripts-tooling",
  "duplicate-detection",
  "file-metrics",
  "function-metrics",
  "markdown-link-validation",
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
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

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
        base: "mise exec -- bun scripts/project/gate/run.ts",
        full: "mise exec -- bun scripts/project/gate/run.ts --profile full",
        required: "mise exec -- bun scripts/project/gate/run.ts --profile required"
      }
    );
  });

  it("keeps the explicit assurance identities and current profile membership closed", () => {
    const entries = createProjectGateEntries({
      externalConsumerLease: createExternalConsumerMaterialLease(),
      invocationLogDirectory: "/tmp/project-gate-logs",
      preparedCandidate: prepared
    });
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
    for (const entry of entries)
      assert.deepEqual(Object.keys(entry).sort(), [
        "check",
        "contributesToAggregate",
        "profiles",
        "tags"
      ]);
  });

  it("defaults to required and normalizes explicit profile plus repeatable enabled and disabled tags into opaque flags", () => {
    assert.deepEqual(parseProjectGateArguments([]), {
      ok: true,
      action: "run",
      value: { profile: "required", disabledTags: [], enabledTags: [] }
    });
    const parsed = parseProjectGateArguments([
      "--profile",
      "full",
      "--disable-tag",
      "docs",
      "--disable-tag",
      "quality",
      "--enable-tag",
      "package-tests",
      "--enable-tag",
      "package-tests"
    ]);

    assert.deepEqual(parsed, {
      ok: true,
      action: "run",
      value: {
        profile: "full",
        disabledTags: ["docs", "quality"],
        enabledTags: ["package-tests"]
      }
    });
    if (!parsed.ok || parsed.action !== "run") return;
    assert.deepEqual(selectionFlags(parsed.value), [
      "project-gate:profile=full",
      "project-gate:disable-tag=docs",
      "project-gate:disable-tag=quality",
      "project-gate:enable-tag=package-tests"
    ]);
    assert.deepEqual(selectionFromFlags(selectionFlags(parsed.value)), parsed.value);
    assert.deepEqual(parseProjectGateArguments(["--help"]), { ok: true, action: "help" });
    assert.deepEqual(parseProjectGateArguments(["-h"]), { ok: true, action: "help" });
    assert.equal(parseProjectGateArguments(["--help", "--profile", "full"]).ok, false);
    const help = projectGateHelp();
    assert.match(help, /Opt-in tags: package-tests/);
    assert.match(
      help,
      /Disable filters \(all currently used\): catalog, docs, format, git, package-tests, product, quality, scripts, tests/
    );
    assert.match(help, /candidate, artifact, and external-consumer acceptance/);
    assert.equal(
      projectGateSelectionSummary({ profile: "required", disabledTags: [], enabledTags: [] }),
      "profile=required; package-acceptance=not-selected (use --enable-tag package-tests or --profile full); disabled-tags=none"
    );
    assert.equal(
      projectGateSelectionSummary({
        profile: "required",
        disabledTags: [],
        enabledTags: ["package-tests"]
      }),
      "profile=required; package-acceptance=selected-by-tag-package-tests; disabled-tags=none"
    );
    assert.equal(parseProjectGateArguments(["unexpected"]).ok, false);
    assert.equal(parseProjectGateArguments(["--disable-tag", ""]).ok, false);
    assert.equal(parseProjectGateArguments(["--enable-tag", "docs"]).ok, false);
    assert.equal(
      parseProjectGateArguments(["--enable-tag", "package-tests", "--disable-tag", "package-tests"])
        .ok,
      false
    );
    assert.equal(
      selectionFromFlags([
        "project-gate:profile=required",
        "project-gate:enable-tag=package-tests",
        "project-gate:disable-tag=package-tests"
      ]),
      undefined
    );
  });
});

describe("Project Gate adapter closure", () => {
  it("returns help before candidate or log work", async () => {
    let gateWorkStarted = false;
    const output = captureConsole();
    try {
      const status = await runProjectGate(["--help"], {
        createInvocationLogDirectory: (): string => {
          gateWorkStarted = true;
          throw new Error("help must not create logs");
        },
        loadRunModule: async () => {
          gateWorkStarted = true;
          throw new Error("help must not load the candidate");
        },
        prepareCandidate: async () => {
          gateWorkStarted = true;
          throw new Error("help must not prepare the candidate");
        }
      });
      assert.equal(status, PROJECT_GATE_EXIT_STATUS.passed);
      assert.equal(gateWorkStarted, false);
      assert.deepEqual(output.logs, [projectGateHelp()]);
    } finally {
      output.restore();
    }
  });

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
      | Readonly<{
          readonly flags: readonly string[];
          readonly invocationLogDirectory: string;
          readonly preparedCandidate: PreparedPackageCandidate;
        }>
      | undefined;
    const status = await runProjectGate(
      [
        "--profile",
        "full",
        "--disable-tag",
        "docs",
        "--disable-tag",
        "docs",
        "--enable-tag",
        "package-tests"
      ],
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
      flags: [
        "project-gate:profile=full",
        "project-gate:disable-tag=docs",
        "project-gate:enable-tag=package-tests"
      ],
      invocationLogDirectory: "/tmp/project-gate-logs",
      preparedCandidate: prepared
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

  it("post-processes one initial Gate result before reporting the final exit", async () => {
    const runResult = completedResult("passed", {
      checkDurations: [{ checkId: "fixture", durationMs: 40 }]
    });
    const clockValues = [100, 145];
    let observedContext: ProjectGateContext | undefined;
    let observedInitial: ProjectGateResult | undefined;
    const output = captureConsole();
    try {
      const status = await runProjectGate([], {
        afterGate: (initial, context) => {
          observedInitial = initial;
          observedContext = context;
          assert.equal(Object.isFrozen(initial), true);
          assert.equal(Object.isFrozen(initial.messages), true);
          assert.equal(Object.isFrozen(context), true);
          assert.equal(Object.isFrozen(context.timing), true);
          return createProjectGateResult("failed", [
            {
              code: "fixture-post-processing",
              level: "warning",
              message: "Fixture post-processing rejected the initial result"
            }
          ]);
        },
        clock: {
          now: () => {
            const value = clockValues.shift();
            if (value === undefined) throw new Error("fixture clock received too many reads");
            return value;
          }
        },
        createInvocationLogDirectory: () => "/tmp/project-gate-after-gate",
        loadRunModule: async () => ({
          resolvedEntryPath: prepared.resolvedEntryPath,
          runProjectGate: async () => runResult
        }),
        prepareCandidate: async () => prepared
      });

      assert.equal(status, PROJECT_GATE_EXIT_STATUS.failed);
      assert.deepEqual(observedInitial, { messages: [], status: "passed" });
      assert.deepEqual(observedContext, {
        invocationLogDirectory: "/tmp/project-gate-after-gate",
        preparedCandidate: prepared,
        repositoryRoot,
        runResult,
        selection: {
          disabledTags: [],
          enabledTags: [],
          profile: "required"
        },
        timing: {
          elapsedToInitialResultMs: 45,
          initialResultAtMs: 145,
          startedAtMs: 100
        }
      });
      assert.match(
        output.warnings.join("\n"),
        /project gate warning \[fixture-post-processing]: Fixture post-processing rejected the initial result/
      );
      assert.match(output.logs.join("\n"), /project gate result: failed/);
      assert.doesNotMatch(output.logs.join("\n"), /project gate result: passed/);
    } finally {
      output.restore();
    }
  });

  it("uses the default performance observer and keeps advisory warnings non-blocking", async () => {
    const runResult = completedResult("passed", {
      checkDurations: [
        { checkId: "lint-product", durationMs: 70 },
        { checkId: "typecheck-scripts", durationMs: 60 }
      ],
      declarativeFingerprint: "performance-fixture"
    });
    const defaultOutput = captureConsole();
    try {
      const defaultStatus = await runProjectGate([], {
        clock: scriptedClock([100, 145]),
        createInvocationLogDirectory: () => "/tmp/project-gate-default-performance",
        loadRunModule: async () => ({
          resolvedEntryPath: prepared.resolvedEntryPath,
          runProjectGate: async () => runResult
        }),
        prepareCandidate: async () => prepared
      });

      assert.equal(defaultStatus, PROJECT_GATE_EXIT_STATUS.passed);
      assert.match(
        defaultOutput.logs.join("\n"),
        /project gate info \[project-gate-performance-elapsed]: elapsed 45\.0ms was not comparable \(no matching baseline\)/
      );
    } finally {
      defaultOutput.restore();
    }

    const warningOutput = captureConsole();
    try {
      const warningStatus = await runProjectGate([], {
        afterGate: (initial, context) =>
          observeProjectGatePerformance(
            initial,
            context,
            [performanceBaseline],
            performanceRuntime
          ),
        clock: scriptedClock([100, 236]),
        createInvocationLogDirectory: () => "/tmp/project-gate-warning-performance",
        loadRunModule: async () => ({
          resolvedEntryPath: prepared.resolvedEntryPath,
          runProjectGate: async () => runResult
        }),
        prepareCandidate: async () => prepared
      });

      assert.equal(warningStatus, PROJECT_GATE_EXIT_STATUS.passed);
      assert.deepEqual(warningOutput.warnings, [
        "project gate warning [project-gate-performance-outside-range]: elapsed 136.0ms exceeded advisory threshold 135.0ms; slowest Checks: lint-product=70.0ms, typecheck-scripts=60.0ms"
      ]);
      assert.equal(warningOutput.errors.length, 0);
    } finally {
      warningOutput.restore();
    }
  });

  it("fails closed when afterGate throws", async () => {
    const output = captureConsole();
    try {
      const status = await runProjectGate([], {
        afterGate: () => {
          throw new Error("fixture afterGate failure");
        },
        createInvocationLogDirectory: () => "/tmp/project-gate-after-gate",
        loadRunModule: async () => ({
          resolvedEntryPath: prepared.resolvedEntryPath,
          runProjectGate: async () => completedResult("passed")
        }),
        prepareCandidate: async () => prepared
      });

      assert.equal(status, PROJECT_GATE_EXIT_STATUS.unavailable);
      assert.match(output.errors.join("\n"), /\[after-gate-failed]:/);
      assert.equal(
        output.logs.filter((line) => line === "project gate result: unavailable").length,
        1
      );
    } finally {
      output.restore();
    }
  });

  it("fails closed when afterGate returns an invalid result", async () => {
    const output = captureConsole();
    try {
      const status = await runProjectGate([], {
        afterGate: () => ({ ...createProjectGateResult("passed"), unexpected: true }),
        createInvocationLogDirectory: () => "/tmp/project-gate-after-gate",
        loadRunModule: async () => ({
          resolvedEntryPath: prepared.resolvedEntryPath,
          runProjectGate: async () => completedResult("passed")
        }),
        prepareCandidate: async () => prepared
      });

      assert.equal(status, PROJECT_GATE_EXIT_STATUS.unavailable);
      assert.equal(parseProjectGateResult({ status: "passed" }), undefined);
      assert.match(output.errors.join("\n"), /\[after-gate-invalid-result]:/);
      assert.equal(
        output.logs.filter((line) => line === "project gate result: unavailable").length,
        1
      );
    } finally {
      output.restore();
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
      [
        "malformed progress status",
        { ...complete, outputs: { progressRendering: { status: "fixture" } } },
        PROJECT_GATE_EXIT_STATUS.unavailable
      ],
      ["configuration", { kind: "configuration" }, PROJECT_GATE_EXIT_STATUS.unavailable],
      ["malformed", { kind: "completed" }, PROJECT_GATE_EXIT_STATUS.unavailable]
    ];

    for (const [name, result, expected] of cases) {
      assert.equal(projectGateExitStatus(createInitialProjectGateResult(result)), expected, name);
    }
  });
});

function captureConsole(): Readonly<{
  readonly errors: string[];
  readonly logs: string[];
  readonly restore: () => void;
  readonly warnings: string[];
}> {
  const originalError = console.error;
  const originalLog = console.log;
  const originalWarn = console.warn;
  const errors: string[] = [];
  const logs: string[] = [];
  const warnings: string[] = [];
  console.error = (...values: unknown[]): void => {
    errors.push(values.map(String).join(" "));
  };
  console.log = (...values: unknown[]): void => {
    logs.push(values.map(String).join(" "));
  };
  console.warn = (...values: unknown[]): void => {
    warnings.push(values.map(String).join(" "));
  };
  return Object.freeze({
    errors,
    logs,
    restore: () => {
      console.error = originalError;
      console.log = originalLog;
      console.warn = originalWarn;
    },
    warnings
  });
}

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

function scriptedClock(values: readonly number[]): Readonly<{ now(): number }> {
  const remaining = [...values];
  return Object.freeze({
    now: (): number => {
      const value = remaining.shift();
      if (value === undefined) throw new Error("fixture clock received too many reads");
      return value;
    }
  });
}
