import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { isNonArrayRecord } from "../../value-guards.ts";
import type { PreparedPackageCandidate } from "../../package/candidate/prepare.ts";

import {
  parseProjectGateArguments,
  projectGateHelp,
  projectGateSelectionSummary,
  selectionFlags,
  selectionFromFlags
} from "./runtime/controls.ts";
import { parseProjectGateInvocationArguments } from "./runtime/invocation.ts";
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
  parseProjectGateMessageContribution,
  type ProjectGateMessage,
  type ProjectGateResult
} from "./runtime/result.ts";
import type { ProjectGatePerformanceBaseline } from "./runtime/performance-baseline.ts";
import { currentProjectGatePerformanceRuntime } from "./runtime/performance-baseline.ts";
import { PROJECT_GATE_RUN_CONFIG, createProjectGateEntries } from "./definition.ts";

const defaultResultContributor = PROJECT_GATE_RUN_CONFIG.resultContributor;
const passThroughResultContributor = () => ({ blocks: false, messages: [] });
import { createExternalConsumerMaterialLease } from "./checks/external-consumer-material.ts";
import type {
  ProjectGateTranscript,
  ProjectGateTranscriptCompletion
} from "./runtime/transcript.ts";

const prepared = Object.freeze({
  artifactPath: "/tmp/vibe-check.tgz",
  candidateVersion: "0.0.0-local.fixture",
  consumerDirectory: "/tmp/consumer",
  files: ["package/index.mjs"],
  inputFingerprint: "a".repeat(64),
  installedPackageDirectory: "/tmp/consumer/node_modules/@zxyycom/vibe-check",
  preparationAction: "reuse",
  preparationReason: "installation-current",
  resolvedEntryPath: "/tmp/consumer/node_modules/@zxyycom/vibe-check/index.mjs",
  reused: true,
  sha256: "b".repeat(64),
  stagingDirectory: "/tmp/staging"
});

const preparedRelease = Object.freeze({
  ...prepared,
  candidateVersion: "0.0.1",
  preparationAction: "release" as const,
  preparationReason: "release-receipt" as const,
  reused: false
});

const performanceRuntime = currentProjectGatePerformanceRuntime();
const performanceBaseline = Object.freeze({
  declarativeFingerprint: "a".repeat(64),
  maxElapsedMs: 135,
  profile: "required" as const,
  runtime: performanceRuntime
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
  "tests-package-artifact",
  "tests-package-consumer-types",
  "tests-package-consumer-docs",
  "tests-package-consumer-runtime",
  "tests-product-duplicate-detection",
  "tests-product-file-metrics",
  "tests-product-function-metrics",
  "tests-product-json",
  "tests-product-markdown-links",
  "tests-product-secret-detection",
  "tests-product-supporting-checks",
  "tests-product-runtime",
  "tests-scripts-admission-workbench",
  "tests-scripts-project",
  "tests-scripts-project-selection",
  "tests-scripts-test-evidence",
  "tests-scripts-layout",
  "tests-scripts-machine-artifacts",
  "tests-scripts-package-tools-boundary",
  "tests-scripts-validation",
  "tests-scripts-tooling",
  "duplicate-detection",
  "file-metrics",
  "function-metrics",
  "markdown-lint",
  "markdown-link-validation",
  "materials-json-validator",
  "materials-schema-validator",
  "materials-schema-publication-validator",
  "materials-examples-validator",
  "materials-links-validator",
  "decision-records",
  "test-evidence",
  "test-evidence-rule-tests",
  "git-diff-whitespace"
] as const;

const packageAcceptanceCheckIds: ReadonlySet<string> = new Set([
  "prepared-external-package-consumer",
  "tests-package-artifact",
  "tests-package-consumer-types",
  "tests-package-consumer-docs",
  "tests-package-consumer-runtime"
]);

const rootPackageManifestSource = readFileSync(
  fileURLToPath(new URL("../../../package.json", import.meta.url)),
  "utf8"
);
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("Project Gate entries, root binding, and controls", () => {
  it("binds the sole project check command to the mise-backed Gate root", () => {
    const manifest: unknown = JSON.parse(rootPackageManifestSource);
    assert.ok(isNonArrayRecord(manifest), "root package manifest must be an object");
    const rootScripts = manifest.scripts;
    assert.ok(isNonArrayRecord(rootScripts), "root package manifest must declare a scripts object");

    assert.equal(rootScripts.check, "mise exec -- bun scripts/project/gate/run.ts");
    assert.equal(rootScripts["verify:vibe-check-workspace"], undefined);
    assert.equal(rootScripts["verify:vibe-check-workspace:full"], undefined);
    assert.equal(rootScripts["verify:vibe-check-workspace:required"], undefined);
  });

  it("keeps the explicit assurance identities and current selection metadata closed", () => {
    const entries = createProjectGateEntries({
      externalConsumerLease: createExternalConsumerMaterialLease(),
      preparedCandidate: prepared
    });
    const expectedIds = new Set(expectedCheckIds);
    const checkIds = new Set(entries.map(({ check }) => check.checkId));

    assert.deepEqual(checkIds, expectedIds);
    assert.deepEqual(
      new Set(entries.filter(({ required }) => required).map(({ check }) => check.checkId)),
      new Set(expectedCheckIds.filter((checkId) => !packageAcceptanceCheckIds.has(checkId)))
    );
    for (const entry of entries)
      assert.deepEqual(Object.keys(entry).sort(), ["check", "presets", "required"]);
  });

  it("defaults to required and normalizes combinable focused presets into opaque flags", () => {
    assert.deepEqual(parseProjectGateArguments([]), {
      ok: true,
      action: "run",
      value: { kind: "required" }
    });
    const parsed = parseProjectGateArguments(["--quality", "--materials", "--materials"]);

    assert.deepEqual(parsed, {
      ok: true,
      action: "run",
      value: { kind: "focused", presets: ["materials", "quality"] }
    });
    if (!parsed.ok || parsed.action !== "run") return;
    assert.deepEqual(selectionFlags(parsed.value), [
      "project-gate:preset=materials",
      "project-gate:preset=quality"
    ]);
    assert.deepEqual(selectionFromFlags(selectionFlags(parsed.value)), parsed.value);
    assert.deepEqual(parseProjectGateArguments(["--all"]), {
      ok: true,
      action: "run",
      value: { kind: "all" }
    });
    assert.deepEqual(parseProjectGateArguments(["--help"]), { ok: true, action: "help" });
    assert.deepEqual(parseProjectGateArguments(["-h"]), { ok: true, action: "help" });
    assert.equal(parseProjectGateArguments(["--help", "--all"]).ok, false);
    const help = projectGateHelp();
    assert.match(help, /--typecheck/);
    assert.match(help, /--lint/);
    assert.match(help, /--test/);
    assert.match(help, /--materials/);
    assert.match(help, /--quality/);
    assert.match(help, /--all/);
    assert.match(help, /Focused presets can be combined/);
    assert.match(help, /--release-receipt <path>/);
    assert.equal(
      projectGateSelectionSummary({ kind: "required" }),
      "selection=required; package-acceptance=not-selected"
    );
    assert.equal(
      projectGateSelectionSummary({ kind: "focused", presets: ["materials", "quality"] }),
      "selection=focused; presets=materials,quality; package-acceptance=not-selected"
    );
    assert.equal(parseProjectGateArguments(["unexpected"]).ok, false);
    assert.equal(parseProjectGateArguments(["--profile", "full"]).ok, false);
    assert.equal(parseProjectGateArguments(["--enable-tag", "docs"]).ok, false);
    assert.equal(parseProjectGateArguments(["--all", "--materials"]).ok, false);
    assert.equal(
      selectionFromFlags(["project-gate:preset=quality", "project-gate:preset=materials"]),
      undefined
    );
    assert.equal(selectionFromFlags(["project-gate:all", "project-gate:required"]), undefined);
  });

  it("requires the complete all selection for one explicit formal release receipt", () => {
    assert.deepEqual(
      parseProjectGateInvocationArguments([
        "--all",
        "--release-receipt",
        "build/releases/zxyycom-vibe-check-0.0.1.release.json"
      ]),
      {
        ok: true,
        action: "run",
        candidateInput: {
          kind: "release-receipt",
          receiptPath: "build/releases/zxyycom-vibe-check-0.0.1.release.json"
        },
        selection: { kind: "all" }
      }
    );
    assert.equal(
      parseProjectGateInvocationArguments([
        "--release-receipt",
        "build/releases/zxyycom-vibe-check-0.0.1.release.json"
      ]).ok,
      false
    );
    assert.equal(
      parseProjectGateInvocationArguments([
        "--materials",
        "--release-receipt",
        "build/releases/zxyycom-vibe-check-0.0.1.release.json"
      ]).ok,
      false
    );
    assert.equal(
      parseProjectGateInvocationArguments([
        "--all",
        "--release-receipt",
        "first.json",
        "--release-receipt",
        "second.json"
      ]).ok,
      false
    );
  });
});

describe("Project Gate adapter closure", () => {
  it("returns help before candidate or log work", async () => {
    let gateWorkStarted = false;
    const output = captureConsole();
    try {
      const status = await runProjectGateWithoutTranscript(["--help"], {
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
    const status = await runProjectGateWithoutTranscript([], {
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

  it("loads no Definition or package runtime before candidate preparation", () => {
    const sandboxRoot = mkdtempSync(join(tmpdir(), "vibe-check-gate-import-boundary-"));
    try {
      const sandboxScripts = join(sandboxRoot, "scripts");
      const sandboxGate = join(sandboxScripts, "project", "gate");
      mkdirSync(dirname(sandboxGate), { recursive: true });
      cpSync(join(repositoryRoot, "scripts", "project", "gate"), sandboxGate, {
        recursive: true
      });
      // A root static or indirect Definition import must fail before preparation.
      writeFileSync(
        join(sandboxGate, "definition.ts"),
        'throw new Error("Definition loaded before candidate preparation");\n',
        "utf8"
      );
      // There is deliberately no scripts/project/node_modules candidate in this sandbox.
      symlinkSync(join(repositoryRoot, "scripts", "package"), join(sandboxScripts, "package"));
      symlinkSync(
        join(repositoryRoot, "scripts", "error-message.ts"),
        join(sandboxScripts, "error-message.ts")
      );
      symlinkSync(
        join(repositoryRoot, "scripts", "value-guards.ts"),
        join(sandboxScripts, "value-guards.ts")
      );

      const probe = spawnSync(
        process.execPath,
        [
          fileURLToPath(new URL("./runtime/root-import-boundary.test-support.ts", import.meta.url)),
          pathToFileURL(join(sandboxGate, "run.ts")).href
        ],
        {
          cwd: sandboxRoot,
          encoding: "utf8"
        }
      );

      assert.equal(
        probe.status,
        0,
        `isolated root import probe failed:\nstdout:\n${processOutput(probe.stdout)}\nstderr:\n${processOutput(probe.stderr)}`
      );
    } finally {
      rmSync(sandboxRoot, { force: true, recursive: true });
    }
  });

  it("uses explicit formal receipt preparation without invoking local candidate preparation", async () => {
    let localPreparationStarted = false;
    let observedReceiptPath: string | undefined;
    let observedCandidate: PreparedPackageCandidate | undefined;
    const status = await runProjectGateWithoutTranscript(
      ["--all", "--release-receipt", "build/releases/zxyycom-vibe-check-0.0.1.release.json"],
      {
        createInvocationLogDirectory: () => "/tmp/project-gate-release",
        loadRunModule: async () => ({
          resolvedEntryPath: preparedRelease.resolvedEntryPath,
          resultContributor: passThroughResultContributor,
          run: async ({ preparedCandidate }) => {
            observedCandidate = preparedCandidate;
            return completedResult("passed");
          }
        }),
        prepareCandidate: async () => {
          localPreparationStarted = true;
          throw new Error("release mode must not prepare a local candidate");
        },
        prepareReleaseCandidate: async (receiptPath) => {
          observedReceiptPath = receiptPath;
          return preparedRelease;
        }
      }
    );

    assert.equal(status, PROJECT_GATE_EXIT_STATUS.passed);
    assert.equal(localPreparationStarted, false);
    assert.equal(observedReceiptPath, "build/releases/zxyycom-vibe-check-0.0.1.release.json");
    assert.equal(observedCandidate, preparedRelease);
  });

  it("rejects an imported entry that differs from the prepared candidate before run or resultContributor", async () => {
    let createdLogs = false;
    let resultContributorRan = false;
    let ran = false;
    const status = await runProjectGateWithoutTranscript([], {
      createInvocationLogDirectory: (): string => {
        createdLogs = true;
        return "/tmp/logs";
      },
      loadRunModule: async () => ({
        resolvedEntryPath: "/tmp/other/index.mjs",
        resultContributor: () => {
          resultContributorRan = true;
          return { blocks: false, messages: [] };
        },
        run: async () => {
          ran = true;
          return completedResult("passed");
        }
      }),
      prepareCandidate: async () => prepared
    });

    assert.equal(status, PROJECT_GATE_EXIT_STATUS.unavailable);
    assert.equal(createdLogs, false);
    assert.equal(resultContributorRan, false);
    assert.equal(ran, false);
  });

  it("reports the invocation directory when Gate transcript setup fails", async () => {
    let ran = false;
    const output = captureConsole();
    try {
      const status = await runProjectGateWithoutTranscript([], {
        createInvocationLogDirectory: () => "/tmp/project-gate-transcript-setup-failure",
        loadRunModule: async () => ({
          resolvedEntryPath: prepared.resolvedEntryPath,
          resultContributor: passThroughResultContributor,
          run: async () => {
            ran = true;
            return completedResult("passed");
          }
        }),
        prepareCandidate: async () => prepared,
        startTranscript: () => {
          throw new Error("fixture transcript setup failure");
        }
      });

      assert.equal(status, PROJECT_GATE_EXIT_STATUS.unavailable);
      assert.equal(ran, false);
      assert.deepEqual(output.errors, [
        "project gate log setup failed: fixture transcript setup failure"
      ]);
      assert.deepEqual(output.logs, [
        "project gate logs: /tmp/project-gate-transcript-setup-failure"
      ]);
    } finally {
      output.restore();
    }
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
    const status = await runProjectGateWithoutTranscript(
      ["--quality", "--materials", "--materials"],
      {
        createInvocationLogDirectory: (): string => {
          createdLogs += 1;
          return "/tmp/project-gate-logs";
        },
        loadRunModule: async () => {
          loaded += 1;
          return {
            resolvedEntryPath: prepared.resolvedEntryPath,
            resultContributor: passThroughResultContributor,
            run: async (input) => {
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
      flags: ["project-gate:preset=materials", "project-gate:preset=quality"],
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

  it("maps a rejected bound Run to the existing unavailable adapter boundary", async () => {
    const output = captureConsole();
    try {
      const status = await runProjectGateWithoutTranscript([], {
        createInvocationLogDirectory: () => "/tmp/project-gate-run-rejection",
        loadRunModule: async () => ({
          resolvedEntryPath: prepared.resolvedEntryPath,
          resultContributor: passThroughResultContributor,
          run: async () => {
            throw new Error("fixture aggregation callback rejection");
          }
        }),
        prepareCandidate: async () => prepared
      });

      assert.equal(status, PROJECT_GATE_EXIT_STATUS.unavailable);
      assert.match(
        output.errors.join("\n"),
        /project gate execution failed: fixture aggregation callback rejection/
      );
      assert.equal(
        output.logs.filter((line) => line === "project gate result: unavailable").length,
        1
      );
    } finally {
      output.restore();
    }
  });

  it("post-processes one initial Gate result before reporting the final exit", async () => {
    const runResult = completedResult("passed", {
      checkDurations: [{ checkId: "fixture", durationMs: 40 }]
    });
    const clockValues = [100, 110, 125, 145];
    let observedContext: ProjectGateContext | undefined;
    let observedInitial: ProjectGateResult | undefined;
    let transcriptCompletion: ProjectGateTranscriptCompletion | undefined;
    const transcriptMessages: Array<
      Readonly<{ readonly level: "error" | "info" | "warning"; readonly text: string }>
    > = [];
    const output = captureConsole();
    try {
      const status = await runProjectGateWithoutTranscript([], {
        clock: {
          now: () => {
            const value = clockValues.shift();
            if (value === undefined) throw new Error("fixture clock received too many reads");
            return value;
          }
        },
        createInvocationLogDirectory: () => "/tmp/project-gate-result-contributor",
        loadRunModule: async () => ({
          resolvedEntryPath: prepared.resolvedEntryPath,
          resultContributor: async (context) => {
            await Promise.resolve();
            observedInitial = context.initialResult;
            observedContext = context;
            assert.equal(Object.isFrozen(context.initialResult), true);
            assert.equal(Object.isFrozen(context.initialResult.messages), true);
            assert.equal(Object.isFrozen(context), true);
            assert.equal(Object.isFrozen(context.timing), true);
            return {
              blocks: false,
              messages: [
                {
                  code: "fixture-post-processing",
                  level: "warning" as const,
                  message: "Fixture post-processing rejected the initial result"
                }
              ]
            };
          },
          run: async () => runResult
        }),
        prepareCandidate: async () => prepared,
        startTranscript: (invocationLogDirectory) => {
          assert.equal(invocationLogDirectory, "/tmp/project-gate-result-contributor");
          return Object.freeze({
            complete: (completion: ProjectGateTranscriptCompletion) => {
              transcriptCompletion = completion;
              return "succeeded" as const;
            },
            writeGateMessage: (message: Parameters<ProjectGateTranscript["writeGateMessage"]>[0]) =>
              transcriptMessages.push(message)
          });
        }
      });

      assert.equal(status, PROJECT_GATE_EXIT_STATUS.passed);
      assert.deepEqual(observedInitial, { messages: [], status: "passed" });
      assert.deepEqual(observedContext, {
        invocationLogDirectory: "/tmp/project-gate-result-contributor",
        preparedCandidate: prepared,
        performanceBaselines: [performanceBaseline, { ...performanceBaseline, profile: "all" }],
        repositoryRoot,
        runResult,
        selection: { kind: "required" },
        initialResult: { messages: [], status: "passed" },
        timing: {
          adapterSetupMs: 15,
          candidatePreparationMs: 10,
          elapsedToInitialResultMs: 45,
          initialResultAtMs: 145,
          productRunMs: 20,
          startedAtMs: 100
        }
      });
      assert.match(
        output.warnings.join("\n"),
        /project gate warning \[fixture-post-processing]: Fixture post-processing rejected the initial result/
      );
      assert.match(
        transcriptMessages.map((message) => message.text).join("\n"),
        /project gate aggregation: Product default strict-all over effective Check statuses; any non-passed status or an empty effective selection makes the aggregate failed; findings, messages, and Records are reported by their owning Checks but are not aggregation inputs/
      );
      assert.match(
        output.logs.join("\n"),
        /project gate start: candidate=0\.0\.0-local\.fixture; source=local; selection=required/
      );
      assert.doesNotMatch(output.logs.join("\n"), /project gate aggregation:/);
      assert.match(output.logs.join("\n"), /project gate result: passed/);
      assert.doesNotMatch(output.logs.join("\n"), /project gate result: failed/);
      assert.deepEqual(transcriptCompletion, {
        exitStatus: PROJECT_GATE_EXIT_STATUS.passed,
        invocationLogDirectory: "/tmp/project-gate-result-contributor",
        result: "passed"
      });
    } finally {
      output.restore();
    }
  });

  it("fails closed when the Gate transcript cannot be completed", async () => {
    let transcriptCompletion: ProjectGateTranscriptCompletion | undefined;
    const output = captureConsole();
    try {
      const status = await runProjectGateWithoutTranscript([], {
        createInvocationLogDirectory: () => "/tmp/project-gate-transcript-failure",
        loadRunModule: async () => ({
          resolvedEntryPath: prepared.resolvedEntryPath,
          resultContributor: passThroughResultContributor,
          run: async () => completedResult("passed")
        }),
        prepareCandidate: async () => prepared,
        startTranscript: () =>
          Object.freeze({
            complete: (completion: ProjectGateTranscriptCompletion) => {
              transcriptCompletion = completion;
              return "failed" as const;
            },
            writeGateMessage: () => undefined
          })
      });

      assert.equal(status, PROJECT_GATE_EXIT_STATUS.unavailable);
      assert.deepEqual(transcriptCompletion, {
        exitStatus: PROJECT_GATE_EXIT_STATUS.passed,
        invocationLogDirectory: "/tmp/project-gate-transcript-failure",
        result: "passed"
      });
      assert.deepEqual(output.errors, ["project gate log failure: gate.log was not completed"]);
      assert.equal(
        output.logs.filter((line) => line.startsWith("project gate result:")).join("\n"),
        "project gate result: unavailable"
      );
      assert.equal(output.logs.at(-2), "project gate logs: /tmp/project-gate-transcript-failure");
    } finally {
      output.restore();
    }
  });

  it("enforces the local performance limit without revising Product Check facts", async () => {
    const runResult = completedResult("passed", {
      checkDurations: [
        { checkId: "lint-product", durationMs: 70 },
        { checkId: "typecheck-scripts", durationMs: 60 }
      ],
      declarativeFingerprint: "a".repeat(64)
    });
    const withinTranscript: string[] = [];
    const withinOutput = captureConsole();
    try {
      const status = await runProjectGateWithoutTranscript([], {
        clock: scriptedClock([100, 110, 125, 145]),
        createInvocationLogDirectory: () => "/tmp/project-gate-within-performance",
        loadRunModule: async () => ({
          resolvedEntryPath: prepared.resolvedEntryPath,
          resultContributor: defaultResultContributor,
          run: async () => runResult
        }),
        prepareCandidate: async () => prepared,
        startTranscript: () => ({
          complete: () => "succeeded" as const,
          writeGateMessage: (message) => withinTranscript.push(message.text)
        })
      });
      assert.equal(status, PROJECT_GATE_EXIT_STATUS.passed);
      assert.match(withinTranscript.join("\n"), /within hard limit 135\.0ms/);
      assert.equal(withinOutput.errors.length, 0);
    } finally {
      withinOutput.restore();
    }

    const exceededOutput = captureConsole();
    try {
      const status = await runProjectGateWithoutTranscript([], {
        clock: scriptedClock([100, 120, 150, 236]),
        createInvocationLogDirectory: () => "/tmp/project-gate-exceeded-performance",
        loadRunModule: async () => ({
          resolvedEntryPath: prepared.resolvedEntryPath,
          resultContributor: defaultResultContributor,
          run: async () => runResult
        }),
        prepareCandidate: async () => prepared
      });
      assert.equal(status, PROJECT_GATE_EXIT_STATUS.failed);
      assert.match(
        exceededOutput.errors.join("\n"),
        /elapsed-to-initial-result 136\.0ms .* exceeded hard limit 135\.0ms; slowest Checks: lint-product=70\.0ms, typecheck-scripts=60\.0ms/
      );
    } finally {
      exceededOutput.restore();
    }

    const mismatchOutput = captureConsole();
    const mismatchTranscript: string[] = [];
    try {
      const status = await runProjectGateWithoutTranscript([], {
        clock: scriptedClock([100, 120, 150, 220]),
        createInvocationLogDirectory: () => "/tmp/project-gate-mismatched-performance",
        loadRunModule: async () => ({
          resolvedEntryPath: prepared.resolvedEntryPath,
          resultContributor: defaultResultContributor,
          run: async () => ({ ...runResult, declarativeFingerprint: "b".repeat(64) })
        }),
        prepareCandidate: async () => prepared,
        startTranscript: () => ({
          complete: () => "succeeded" as const,
          writeGateMessage: (message) => mismatchTranscript.push(message.text)
        })
      });
      assert.equal(status, PROJECT_GATE_EXIT_STATUS.passed);
      assert.equal(mismatchOutput.errors.length, 0);
      assert.match(mismatchOutput.logs.join("\n"), /project gate result: passed/);
      assert.match(mismatchTranscript.join("\n"), /project-gate-performance-within-limit/);
      assert.match(
        mismatchTranscript.join("\n"),
        /elapsed-to-initial-result 120\.0ms \(candidate preparation 20\.0ms; adapter\/setup 30\.0ms; Product Run 70\.0ms\)/
      );
    } finally {
      mismatchOutput.restore();
    }

    const invalidOutput = captureConsole();
    try {
      const status = await runProjectGateWithoutTranscript([], {
        clock: scriptedClock([100, Number.NaN, Number.NaN, Number.NaN]),
        createInvocationLogDirectory: () => "/tmp/project-gate-invalid-timing",
        loadRunModule: async () => ({
          resolvedEntryPath: prepared.resolvedEntryPath,
          resultContributor: defaultResultContributor,
          run: async () => runResult
        }),
        prepareCandidate: async () => prepared
      });
      assert.equal(status, PROJECT_GATE_EXIT_STATUS.failed);
      assert.match(invalidOutput.errors.join("\n"), /hard limit could not be evaluated/);
    } finally {
      invalidOutput.restore();
    }
  });

  it("fails before candidate preparation without a local standard-workload baseline", async () => {
    for (const arguments_ of [[], ["--all"]]) {
      let preparedCandidate = false;
      const output = captureConsole();
      try {
        const status = await runProjectGateWithoutTranscript(arguments_, {
          loadPerformanceBaselines: () => ({ kind: "missing" }),
          prepareCandidate: async () => {
            preparedCandidate = true;
            return prepared;
          }
        });
        assert.equal(status, PROJECT_GATE_EXIT_STATUS.failed);
        assert.equal(preparedCandidate, false);
        assert.match(output.errors.join("\n"), /performance baseline missing/);
      } finally {
        output.restore();
      }
    }
    let preparedCandidate = false;
    const output = captureConsole();
    try {
      const status = await runProjectGateWithoutTranscript(["--all"], {
        loadPerformanceBaselines: () => ({ kind: "loaded", baselines: [performanceBaseline] }),
        prepareCandidate: async () => {
          preparedCandidate = true;
          return prepared;
        }
      });
      assert.equal(status, PROJECT_GATE_EXIT_STATUS.failed);
      assert.equal(preparedCandidate, false);
      assert.match(output.errors.join("\n"), /performance baseline missing for all/);
    } finally {
      output.restore();
    }
  });

  it("leaves focused selections outside the total-time budget", async () => {
    const output = captureConsole();
    try {
      const status = await runProjectGateWithoutTranscript(["--typecheck"], {
        loadPerformanceBaselines: () => ({ kind: "missing" }),
        loadRunModule: async () => ({
          resolvedEntryPath: prepared.resolvedEntryPath,
          resultContributor: defaultResultContributor,
          run: async () => completedResult("passed")
        }),
        prepareCandidate: async () => prepared
      });
      assert.equal(status, PROJECT_GATE_EXIT_STATUS.passed);
      assert.equal(output.errors.length, 0);
    } finally {
      output.restore();
    }
  });

  it("fails closed when resultContributor throws", async () => {
    const output = captureConsole();
    try {
      const status = await runProjectGateWithoutTranscript([], {
        createInvocationLogDirectory: () => "/tmp/project-gate-result-contributor",
        loadRunModule: async () => ({
          resolvedEntryPath: prepared.resolvedEntryPath,
          resultContributor: () => {
            throw new Error("fixture resultContributor failure");
          },
          run: async () => completedResult("passed")
        }),
        prepareCandidate: async () => prepared
      });

      assert.equal(status, PROJECT_GATE_EXIT_STATUS.unavailable);
      assert.match(output.errors.join("\n"), /\[result-contributor-failed]:/);
      assert.equal(
        output.logs.filter((line) => line === "project gate result: unavailable").length,
        1
      );
    } finally {
      output.restore();
    }
  });

  it("fails closed when resultContributor returns an invalid result", async () => {
    const output = captureConsole();
    const malformedMessages: ProjectGateMessage[] = [];
    Reflect.defineProperty(malformedMessages, "0", {
      configurable: true,
      enumerable: true,
      value: { unexpected: true },
      writable: true
    });
    try {
      const status = await runProjectGateWithoutTranscript([], {
        createInvocationLogDirectory: () => "/tmp/project-gate-result-contributor",
        loadRunModule: async () => ({
          resolvedEntryPath: prepared.resolvedEntryPath,
          resultContributor: () => ({ blocks: false, messages: malformedMessages }),
          run: async () => completedResult("passed")
        }),
        prepareCandidate: async () => prepared
      });

      assert.equal(status, PROJECT_GATE_EXIT_STATUS.unavailable);
      assert.equal(parseProjectGateMessageContribution({ status: "passed" }), undefined);
      assert.match(output.errors.join("\n"), /\[result-contributor-invalid-result]:/);
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

function runProjectGateWithoutTranscript(
  arguments_: readonly string[],
  stepOverrides: Parameters<typeof runProjectGate>[1] = {}
): Promise<ProjectGateExitStatus> {
  return runProjectGate(arguments_, {
    loadPerformanceBaselines: () => ({
      kind: "loaded",
      baselines: [performanceBaseline, { ...performanceBaseline, profile: "all" }]
    }),
    startTranscript: () =>
      Object.freeze({
        complete: () => "succeeded" as const,
        writeGateMessage: () => undefined
      }),
    ...stepOverrides
  });
}

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

function processOutput(value: string | Buffer | null): string {
  return typeof value === "string" ? value : (value?.toString() ?? "");
}
