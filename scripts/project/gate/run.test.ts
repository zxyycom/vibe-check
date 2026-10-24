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
import type { ProjectGatePerformancePolicy } from "./runtime/performance-policy.ts";
import { currentProjectGatePerformanceRuntime } from "./runtime/performance-observation.ts";
import { PROJECT_GATE_RUN_CONFIG } from "./definition.ts";

const defaultResultContributor = PROJECT_GATE_RUN_CONFIG.resultContributor;
const passThroughResultContributor = () => ({ blocks: false, messages: [] });
import {
  startProjectGateTranscript,
  type ProjectGateTranscript,
  type ProjectGateTranscriptCompletion
} from "./runtime/transcript.ts";

const prepared = Object.freeze({
  documentation: {
    documents: [],
    machineMaterials: [],
    expectedJSDocExamplePayloads: [],
    readme: ""
  },
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

const performanceBudget = Object.freeze({
  maxElapsedMs: 135,
  maxMeanCheckMs: 2000,
  maxP95CheckMs: 5000
});
const performancePolicy: ProjectGatePerformancePolicy = Object.freeze({
  fast: performanceBudget,
  changed: performanceBudget,
  all: performanceBudget
});

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

  it("defaults to fast and normalizes combinable focused presets into opaque flags", () => {
    assert.deepEqual(parseProjectGateArguments([]), {
      ok: true,
      action: "run",
      value: { kind: "fast" }
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
    assert.deepEqual(parseProjectGateArguments(["--changed"]), {
      ok: true,
      action: "run",
      value: { kind: "changed" }
    });
    for (const kind of ["fast", "changed", "all"] as const) {
      assert.deepEqual(selectionFromFlags(selectionFlags({ kind })), { kind });
    }
    for (const arguments_ of [
      ["--changed", "--all"],
      ["--changed", "--test"],
      ["--changed", "--changed"]
    ]) {
      assert.equal(parseProjectGateArguments(arguments_).ok, false);
    }
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
    assert.match(help, /--changed/);
    assert.match(help, /Focused presets can be combined/);
    assert.match(help, /--release-receipt <path>/);
    assert.equal(
      projectGateSelectionSummary({ kind: "fast" }),
      "selection=fast; acceptance=partial; package-acceptance=not-selected"
    );
    assert.equal(
      projectGateSelectionSummary({ kind: "focused", presets: ["materials", "quality"] }),
      "selection=focused; presets=materials,quality; acceptance=partial; package-acceptance=not-selected"
    );
    assert.equal(
      projectGateSelectionSummary({ kind: "changed" }),
      "selection=changed; acceptance=affected; package-acceptance=affected"
    );
    assert.equal(
      projectGateSelectionSummary({ kind: "all" }),
      "selection=all; acceptance=routine-complete; package-acceptance=selected; consumer-types=not-selected"
    );
    for (const preset of ["consumer-types", "admission-workbench"] as const) {
      assert.deepEqual(parseProjectGateArguments([`--${preset}`]), {
        ok: true,
        action: "run",
        value: { kind: "focused", presets: [preset] }
      });
      assert.match(help, new RegExp(`--${preset}`));
    }
    const releaseSelection = { kind: "all", release: true } as const;
    assert.deepEqual(selectionFromFlags(selectionFlags(releaseSelection)), releaseSelection);
    assert.match(
      projectGateSelectionSummary(releaseSelection),
      /acceptance=release.*consumer-types=selected/
    );
    assert.match(
      projectGateSelectionSummary({ kind: "focused", presets: ["consumer-types"] }),
      /package-acceptance=consumer-types-only/
    );
    assert.equal(parseProjectGateArguments(["unexpected"]).ok, false);
    assert.equal(parseProjectGateArguments(["--profile", "full"]).ok, false);
    assert.equal(parseProjectGateArguments(["--enable-tag", "docs"]).ok, false);
    assert.equal(parseProjectGateArguments(["--all", "--materials"]).ok, false);
    assert.equal(
      selectionFromFlags(["project-gate:preset=quality", "project-gate:preset=materials"]),
      undefined
    );
    for (const flags of [
      ["project-gate:all", "project-gate:fast"],
      ["project-gate:changed", "project-gate:preset=test"],
      ["project-gate:required"],
      ["project-gate:release"],
      ["project-gate:release", "project-gate:all"],
      ["project-gate:changed", "project-gate:release"]
    ]) {
      assert.equal(selectionFromFlags(flags), undefined);
    }
    assert.equal(
      parseProjectGateInvocationArguments(["--changed", "--release-receipt", "receipt.json"]).ok,
      false
    );
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
        selection: { kind: "all", release: true }
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
    let preparationCalls = 0;
    let logDirectoryCalls = 0;
    let moduleLoadCalls = 0;
    const status = await runProjectGateWithoutTranscript([], {
      createInvocationLogDirectory: (): string => {
        logDirectoryCalls += 1;
        throw new Error("logs must not be created");
      },
      loadRunModule: async () => {
        moduleLoadCalls += 1;
        throw new Error("must not load");
      },
      prepareCandidate: async () => {
        preparationCalls += 1;
        throw new Error("fixture preparation failure");
      }
    });

    assert.equal(status, PROJECT_GATE_EXIT_STATUS.unavailable);
    assert.equal(preparationCalls, 1);
    assert.equal(logDirectoryCalls, 0);
    assert.equal(moduleLoadCalls, 0);
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
    let observedFlags: readonly string[] | undefined;
    const status = await runProjectGateWithoutTranscript(
      ["--all", "--release-receipt", "build/releases/zxyycom-vibe-check-0.0.1.release.json"],
      {
        createInvocationLogDirectory: () => "/tmp/project-gate-release",
        loadRunModule: async () => ({
          resolvedEntryPath: preparedRelease.resolvedEntryPath,
          resultContributor: passThroughResultContributor,
          run: async ({ preparedCandidate, flags }) => {
            observedFlags = flags;
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
    assert.deepEqual(observedFlags, ["project-gate:all", "project-gate:release"]);
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
        performancePolicy,
        repositoryRoot,
        runResult,
        selection: { kind: "fast" },
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
        /project gate start: candidate=0\.0\.0-local\.fixture; source=local; selection=fast/
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

  it("blocks total and Check budgets with failure evidence without revising Product facts or retrying", async () => {
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
      assert.match(withinTranscript.join("\n"), /within budget 135\.0ms/);
      assert.match(
        withinTranscript.join("\n"),
        /executed Checks=2; cumulative execution 130\.0ms \(not wall time\); mean 65\.0ms/
      );
      assert.equal(withinOutput.errors.length, 0);
    } finally {
      withinOutput.restore();
    }

    const root = mkdtempSync(join(tmpdir(), "vibe-check-gate-performance-failure-"));
    const originalRunResult = JSON.stringify(runResult);
    try {
      for (const profile of ["fast", "changed", "all"] as const) {
        for (const scenario of [
          {
            name: "elapsed",
            elapsedMs: 136,
            maxMeanCheckMs: 2000,
            maxP95CheckMs: 5000,
            exceeded: []
          },
          {
            name: "mean",
            elapsedMs: 45,
            maxMeanCheckMs: 50,
            maxP95CheckMs: 5000,
            exceeded: ["mean"]
          },
          {
            name: "p95",
            elapsedMs: 45,
            maxMeanCheckMs: 2000,
            maxP95CheckMs: 65,
            exceeded: ["p95"]
          },
          {
            name: "all",
            elapsedMs: 136,
            maxMeanCheckMs: 50,
            maxP95CheckMs: 65,
            exceeded: ["mean", "p95"]
          }
        ]) {
          const directory = join(root, `${profile}-${scenario.name}`);
          mkdirSync(directory);
          const budgets = Object.freeze({
            ...performancePolicy,
            [profile]: Object.freeze({
              ...performanceBudget,
              maxMeanCheckMs: scenario.maxMeanCheckMs,
              maxP95CheckMs: scenario.maxP95CheckMs
            })
          });
          const originalBudgets = JSON.stringify(budgets);
          const calls = { prepare: 0, load: 0, run: 0 };
          const output = captureConsole();
          try {
            const status = await runProjectGateWithoutTranscript(
              profile === "fast" ? [] : [`--${profile}`],
              {
                clock: scriptedClock([100, 110, 125, 100 + scenario.elapsedMs]),
                createInvocationLogDirectory: () => directory,
                loadPerformancePolicy: () => budgets,
                loadRunModule: async () => {
                  calls.load += 1;
                  return {
                    resolvedEntryPath: prepared.resolvedEntryPath,
                    resultContributor: defaultResultContributor,
                    run: async () => {
                      calls.run += 1;
                      return runResult;
                    }
                  };
                },
                prepareCandidate: async () => {
                  calls.prepare += 1;
                  return prepared;
                },
                startTranscript: startProjectGateTranscript
              }
            );
            assert.equal(status, PROJECT_GATE_EXIT_STATUS.failed);
            assert.deepEqual(calls, { prepare: 1, load: 1, run: 1 });
            assert.equal(JSON.stringify(budgets), originalBudgets);
            assert.equal(JSON.stringify(runResult), originalRunResult);
            assert.equal(output.warnings.length, 0);
            assert.match(output.logs.join("\n"), /project gate result: failed/);
            if (scenario.elapsedMs > performanceBudget.maxElapsedMs) {
              assert.match(
                output.errors.join("\n"),
                /elapsed-to-initial-result 136\.0ms .* exceeded budget 135\.0ms/
              );
            }
            if (scenario.exceeded.length > 0) {
              assert.ok(
                output.errors
                  .join("\n")
                  .includes(`exceeded Check budgets: ${scenario.exceeded.join(", ")}`)
              );
              assert.match(
                output.errors.join("\n"),
                /slowest Checks: lint-product=70\.0ms, typecheck-scripts=60\.0ms/
              );
            }
            const transcript = readFileSync(join(directory, "gate.log"), "utf8");
            const prefix =
              "[GATE] [INFO] project gate info [project-gate-performance-failure-context]: ";
            const contextLine = transcript.split("\n").find((line) => line.startsWith(prefix));
            const evidence: unknown = JSON.parse(contextLine?.slice(prefix.length) ?? "");
            assert.ok(isNonArrayRecord(evidence));
            assert.equal(evidence.profile, profile);
            assert.deepEqual(evidence.checkDurations, runResult.checkDurations);
            assert.deepEqual(evidence.measurements, { meanCheckMs: 65, p95CheckMs: 70 });
            assert.deepEqual(evidence.runtime, currentProjectGatePerformanceRuntime());
            assert.deepEqual(evidence.candidate, {
              version: prepared.candidateVersion,
              sha256: prepared.sha256,
              inputFingerprint: prepared.inputFingerprint,
              preparationAction: prepared.preparationAction,
              preparationReason: prepared.preparationReason
            });
            assert.match(transcript, /\[RESULT:FAILED\]/);
            assert.match(transcript, /\[EXIT:1\]/);
            assert.doesNotMatch(
              [...output.logs, ...output.errors].join("\n"),
              /performance-failure-context/
            );
          } finally {
            output.restore();
          }
        }
      }
    } finally {
      rmSync(root, { force: true, recursive: true });
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
      assert.match(invalidOutput.errors.join("\n"), /performance budgets could not be evaluated/);
    } finally {
      invalidOutput.restore();
    }
  });

  it("fails before candidate preparation when the version-controlled performance policy is invalid", async () => {
    const invalidBudgets: unknown[] = [
      null,
      {},
      { ...performancePolicy, changed: undefined },
      { ...performancePolicy, runtime: currentProjectGatePerformanceRuntime() },
      {
        ...performancePolicy,
        fast: { ...performanceBudget, declarativeFingerprint: "a".repeat(64) }
      },
      { ...performancePolicy, all: { maxElapsedMs: 135, maxMeanCheckMs: 2000 } },
      ...[0, -1, 0.1, "135", Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1].map(
        (limit) => ({
          ...performancePolicy,
          fast: { ...performanceBudget, maxElapsedMs: limit }
        })
      )
    ];
    for (const arguments_ of [[], ["--changed"], ["--all"]]) {
      for (const policy of [...invalidBudgets, "throw"]) {
        const calls = { prepare: 0, load: 0, log: 0 };
        const output = captureConsole();
        try {
          const status = await runProjectGateWithoutTranscript(arguments_, {
            loadPerformancePolicy: () => {
              if (policy === "throw") throw new Error("fixture policy unavailable");
              return policy;
            },
            loadRunModule: async () => {
              calls.load += 1;
              throw new Error("must not load");
            },
            createInvocationLogDirectory: () => {
              calls.log += 1;
              throw new Error("must not create logs");
            },
            prepareCandidate: async () => {
              calls.prepare += 1;
              return prepared;
            }
          });
          assert.equal(status, PROJECT_GATE_EXIT_STATUS.failed);
          assert.deepEqual(calls, { prepare: 0, load: 0, log: 0 });
          assert.match(
            output.errors.join("\n"),
            /performance policy (?:is invalid|could not be loaded)/
          );
        } finally {
          output.restore();
        }
      }
    }
  });

  it("leaves focused selections outside the total-time budget", async () => {
    const output = captureConsole();
    try {
      const status = await runProjectGateWithoutTranscript(["--typecheck"], {
        loadPerformancePolicy: () => {
          throw new Error("focused must not load policy");
        },
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
    loadPerformancePolicy: () => performancePolicy,
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
