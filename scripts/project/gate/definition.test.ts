import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { defineCheck, markdownLinkValidation, run as packageRun } from "@zxyycom/vibe-check";
import { isNonArrayRecord } from "../../value-guards.ts";
import type { TestEvidenceRuleTestInvocations } from "../../test-evidence/ast-grep/rule-tests.ts";
import { defineProjectGateEntries, type ProjectGateEntry } from "./runtime/entries.ts";
import { projectGateFlagControlledCheck } from "./runtime/eligibility.ts";
import { selectionFlags, type ProjectGateSelection } from "./runtime/controls.ts";
import {
  createProjectGateDefinition,
  createProjectGateEntries,
  projectGateAggregation,
  PROJECT_GATE_RUN_CONFIG
} from "./definition.ts";
import { createExternalConsumerMaterialLease } from "./checks/external-consumer-material.ts";
import { invokeCheck, invokeCheckWithRecords } from "./checks/check-execution.test-support.ts";
import { writeProcessTranscript } from "./checks/process/process.ts";
import {
  createTestEvidenceRuleTestsCheck,
  type TestEvidenceRuleTestsCheckDependencies
} from "./checks/test-evidence/ast-grep-rule-tests-check.ts";
import { resolveProjectGateTestLanes } from "./checks/test-execution/lanes.ts";

const preparedCandidate = Object.freeze({
  artifactPath: "/tmp/project-gate-candidate/artifacts/vibe-check.tgz",
  candidateVersion: "0.0.0-local.fixture",
  consumerDirectory: "/tmp/project-gate-candidate/consumer",
  files: Object.freeze(["package/index.mjs"]),
  inputFingerprint: "a".repeat(64),
  installedPackageDirectory:
    "/tmp/project-gate-candidate/consumer/node_modules/@zxyycom/vibe-check",
  preparationAction: "reuse",
  preparationReason: "installation-current",
  resolvedEntryPath:
    "/tmp/project-gate-candidate/consumer/node_modules/@zxyycom/vibe-check/index.mjs",
  reused: true,
  sha256: "b".repeat(64),
  stagingDirectory: "/tmp/project-gate-candidate/staging"
});

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

const qualityCheckIds: ReadonlySet<string> = new Set([
  "duplicate-detection",
  "file-metrics",
  "function-metrics",
  "markdown-link-validation"
]);

const packageAcceptanceCheckIds: ReadonlySet<string> = new Set([
  "prepared-external-package-consumer",
  "tests-package-artifact",
  "tests-package-consumer-types",
  "tests-package-consumer-docs",
  "tests-package-consumer-runtime"
]);
const expectedRequiredCheckIds = expectedCheckIds.filter(
  (checkId) => !packageAcceptanceCheckIds.has(checkId)
);

const expectedCheckIdsBySelection: readonly Readonly<{
  readonly checkIds: readonly string[];
  readonly selection: ProjectGateSelection;
}>[] = [
  {
    checkIds: expectedRequiredCheckIds,
    selection: { kind: "required" }
  },
  { checkIds: expectedCheckIds, selection: { kind: "all" } },
  {
    checkIds: ["typecheck-product", "typecheck-scripts"],
    selection: { kind: "focused", presets: ["typecheck"] }
  },
  {
    checkIds: [
      "duplicate-detection",
      "file-metrics",
      "function-metrics",
      "markdown-link-validation",
      "docs-json-validator",
      "docs-schema-validator",
      "docs-example-validator",
      "docs-links-validator"
    ],
    selection: { kind: "focused", presets: ["docs", "quality"] }
  },
  {
    checkIds: [
      "tests-package-supporting",
      "tests-product-duplicate-detection",
      "tests-product-file-metrics",
      "tests-product-function-metrics",
      "tests-product-json",
      "tests-product-markdown-links",
      "tests-product-secret-detection",
      "tests-product-supporting-checks",
      "tests-product-runtime",
      "tests-scripts-project",
      "tests-scripts-test-evidence",
      "tests-scripts-validation",
      "tests-scripts-tooling",
      "test-evidence",
      "test-evidence-rule-tests"
    ],
    selection: { kind: "focused", presets: ["test"] }
  }
];

describe("Project Gate Definition", () => {
  it("projects the central composition manifest into an ordinary Project Definition", async () => {
    const entries = createProjectGateEntries({
      externalConsumerLease: createExternalConsumerMaterialLease(),
      preparedCandidate
    });
    const definition = createProjectGateDefinition(entries);

    assert.deepEqual(
      definition.checks.map(({ checkId }) => checkId),
      expectedCheckIds
    );
    assert.deepEqual(definition.outputs, {
      diagnosticLogging: { directory: ".log/vibe-check", enabled: false },
      machinePublication: { directory: "artifacts/vibe-check", enabled: false },
      progressRendering: { enabled: true }
    });
    assert.deepEqual(definition.scheduler, {
      admissionPolicy: {
        kind: "learned-critical-path",
        stateDirectory: ".cache/vibe-check/scheduler-history"
      },
      maxParallel: 3,
      measurementHooks: []
    });
    assert.deepEqual(PROJECT_GATE_RUN_CONFIG.selection, {
      complete: "all",
      default: "required",
      presets: ["docs", "lint", "quality", "test", "typecheck"]
    });
    assert.equal(Object.hasOwn(definition, "policies"), false);
    assert.equal(Object.hasOwn(definition, "selectedPolicy"), false);

    const nativeDocsCheck = definition.checks.find(
      ({ checkId }) => checkId === "docs-json-validator"
    );
    assert.equal(nativeDocsCheck?.options, undefined);
    assert.equal(
      definition.checks.find(({ checkId }) => checkId === "markdown-link-validation")?.displayName,
      "Markdown link validation"
    );
    assert.equal(
      definition.checks.find(({ checkId }) => checkId === "markdown-link-validation")
        ?.admissionPriority,
      undefined
    );
    assert.equal(
      definition.checks.find(({ checkId }) => checkId === "docs-links-validator")?.displayName,
      "Documentation path existence validation"
    );
    for (const checkId of [
      "docs-schema-validator",
      "docs-example-validator",
      "tests-scripts-validation"
    ]) {
      assert.deepEqual(entries.find(({ check }) => check.checkId === checkId)?.check.mutex, [
        "project-gate-documentation-materials"
      ]);
    }
    assert.equal(
      entries.find(({ check }) => check.checkId === "docs-links-validator")?.check.mutex,
      undefined
    );
    assert.equal(
      entries.find(({ check }) => check.checkId === "docs-json-validator")?.check.mutex,
      undefined
    );

    for (const checkId of qualityCheckIds) {
      const entry = entries.find(({ check }) => check.checkId === checkId);
      assert.equal(Object.hasOwn(entry ?? {}, "contributesToAggregate"), false);
      assert.equal(entry?.required, true);
      assert.equal(entry?.presets.includes("quality"), true);
    }
    const qualityEntry = entries.find(({ check }) => check.checkId === "duplicate-detection");
    assert.ok(qualityEntry);
    assert.deepEqual(projectGateFlagControlledCheck(qualityEntry).enabledByFlags, {
      flags: ["project-gate:all", "project-gate:required", "project-gate:preset=quality"],
      mode: "any",
      propagateDependsOn: true
    });

    const expectedTestLanes = resolveProjectGateTestLanes(process.cwd());
    for (const [checkId, files] of [
      ["tests-product-duplicate-detection", expectedTestLanes.productDuplicateDetection],
      ["tests-product-file-metrics", expectedTestLanes.productFileMetrics],
      ["tests-product-function-metrics", expectedTestLanes.productFunctionMetrics],
      ["tests-product-json", expectedTestLanes.productJsonChecks],
      ["tests-product-markdown-links", expectedTestLanes.productMarkdownLinks],
      ["tests-product-secret-detection", expectedTestLanes.productSecretDetection],
      ["tests-product-supporting-checks", expectedTestLanes.productSupportingChecks],
      ["tests-product-runtime", expectedTestLanes.productRuntime],
      ["tests-scripts-project", expectedTestLanes.scriptsProject],
      ["tests-scripts-test-evidence", expectedTestLanes.scriptsTestEvidence],
      ["tests-scripts-validation", expectedTestLanes.scriptsValidation],
      ["tests-scripts-tooling", expectedTestLanes.scriptsTooling],
      ["tests-package-supporting", expectedTestLanes.packageSupporting],
      ["tests-package-artifact", expectedTestLanes.packageArtifact],
      ["tests-package-consumer-types", expectedTestLanes.packageConsumerTypes],
      ["tests-package-consumer-docs", expectedTestLanes.packageConsumerDocs],
      ["tests-package-consumer-runtime", expectedTestLanes.packageConsumerRuntime]
    ] as const) {
      const entry = entries.find(({ check }) => check.checkId === checkId);
      assert.ok(entry, `${checkId} must exist`);
      assert.ok(isNonArrayRecord(entry.check.options));
      assert.equal(entry.check.options.command, process.execPath);
      assert.deepEqual(entry.check.options.args, ["test", ...files, "--reporter=dots"]);
      assert.equal(entry.check.options.args.includes("--parallel"), false);
      assert.equal(
        entry.check.options.timeoutMs,
        packageAcceptanceCheckIds.has(checkId) ? 30_000 : undefined
      );
    }
    const packageLifecycleEntry = entries.find(
      ({ check }) => check.checkId === "prepared-external-package-consumer"
    );
    assert.deepEqual(packageLifecycleEntry?.check.mutex, ["project-gate-package-lifecycle"]);
    assert.equal(
      entries.find(({ check }) => check.checkId === "tests-package-artifact")?.check.mutex,
      undefined
    );
    const preparedCandidateEntry = entries.find(
      ({ check }) => check.checkId === "prepared-package-candidate"
    );
    const externalConsumerProviderEntry = entries.find(
      ({ check }) => check.checkId === "prepared-external-package-consumer"
    );
    const packageArtifactEntry = entries.find(
      ({ check }) => check.checkId === "tests-package-artifact"
    );
    assert.deepEqual(packageArtifactEntry?.check.dependsOn, ["prepared-package-candidate"]);
    assert.deepEqual(externalConsumerProviderEntry?.check.dependsOn, [
      "prepared-package-candidate"
    ]);
    for (const checkId of [
      "tests-package-consumer-types",
      "tests-package-consumer-docs",
      "tests-package-consumer-runtime"
    ]) {
      assert.deepEqual(entries.find(({ check }) => check.checkId === checkId)?.check.dependsOn, [
        "prepared-external-package-consumer"
      ]);
    }
    assert.equal(typeof Reflect.get(preparedCandidateEntry?.check ?? {}, "parseData"), "function");

    const prerequisite = defineCheck({
      checkId: "fixture-prerequisite",
      displayName: "Fixture prerequisite"
    });
    const dependent = defineCheck({
      checkId: "fixture-dependent",
      dependsOn: ["fixture-prerequisite"],
      displayName: "Fixture dependent"
    });
    assert.doesNotThrow(() =>
      defineProjectGateEntries([
        { check: prerequisite, presets: [], required: false },
        { check: dependent, presets: [], required: true }
      ])
    );
    const observer = defineCheck({
      checkId: "fixture-observer",
      displayName: "Fixture observer",
      observes: ["fixture-prerequisite"]
    });
    assert.throws(
      () =>
        defineProjectGateEntries([
          { check: prerequisite, presets: [], required: true },
          { check: observer, presets: ["docs"], required: true }
        ]),
      /observes relation is not preset-selection closed: fixture-observer -> fixture-prerequisite/
    );
    assert.doesNotThrow(() =>
      defineProjectGateEntries([
        { check: prerequisite, presets: [], required: true },
        { check: dependent, presets: ["test"], required: true }
      ])
    );
    const selfDependent = defineCheck({
      checkId: "fixture-self-dependent",
      dependsOn: ["fixture-self-dependent"],
      displayName: "Fixture self-dependent"
    });
    assert.throws(
      () => defineProjectGateEntries([{ check: selfDependent, presets: [], required: true }]),
      /cannot depend on itself: fixture-self-dependent/
    );
    const selfObserver = defineCheck({
      checkId: "fixture-self-observer",
      displayName: "Fixture self observer",
      observes: ["fixture-self-observer"]
    });
    assert.throws(
      () => defineProjectGateEntries([{ check: selfObserver, presets: [], required: true }]),
      /cannot observe itself: fixture-self-observer/
    );
    const existingFlagControl = defineCheck({
      checkId: "fixture-existing-flag-control",
      displayName: "Fixture existing flag control",
      enabledByFlags: { flags: ["fixture"], mode: "any" }
    });
    assert.throws(
      () => defineProjectGateEntries([{ check: existingFlagControl, presets: [], required: true }]),
      /already owns enabledByFlags: fixture-existing-flag-control/
    );
    const invalidRequired: ProjectGateEntry = {
      check: prerequisite,
      presets: [],
      required: true
    };
    Object.defineProperty(invalidRequired, "required", { value: "true" });
    assert.throws(
      () => defineProjectGateEntries([invalidRequired]),
      /required marker is invalid: fixture-prerequisite/
    );
    const invalidPresets: ProjectGateEntry = {
      check: prerequisite,
      presets: [],
      required: true
    };
    Object.defineProperty(invalidPresets, "presets", { value: "test" });
    assert.throws(
      () => defineProjectGateEntries([invalidPresets]),
      /presets are not an exact collection: fixture-prerequisite/
    );
    const missingDependency = defineCheck({
      checkId: "fixture-missing-dependency",
      dependsOn: ["fixture-absent"],
      displayName: "Fixture missing dependency"
    });
    assert.throws(
      () => defineProjectGateEntries([{ check: missingDependency, presets: [], required: true }]),
      /dependsOn relation is missing: fixture-missing-dependency -> fixture-absent/
    );
    const missingObservation = defineCheck({
      checkId: "fixture-missing-observation",
      displayName: "Fixture missing observation",
      observes: ["fixture-absent"]
    });
    assert.throws(
      () => defineProjectGateEntries([{ check: missingObservation, presets: [], required: true }]),
      /observes relation is missing: fixture-missing-observation -> fixture-absent/
    );
  });

  it("keeps required, all, and focused membership golden while aggregation uses Product selection", () => {
    const entries = createProjectGateEntries({
      externalConsumerLease: createExternalConsumerMaterialLease(),
      preparedCandidate
    });
    const definition = createProjectGateDefinition(entries);
    assert.deepEqual(projectGateAggregation(), {
      checks: "effective",
      empty: "failed",
      mode: "all",
      notApplicable: "fail",
      unavailable: "propagate"
    });

    for (const expectation of expectedCheckIdsBySelection) {
      const flags = new Set(selectionFlags(expectation.selection));
      assert.deepEqual(
        definition.checks
          .filter((check) => check.enabledByFlags?.flags.some((flag) => flags.has(flag)))
          .map(({ checkId }) => checkId),
        expectation.checkIds
      );
    }

    for (const check of definition.checks) {
      assert.equal(check.enabledByFlags?.mode, "any");
      assert.equal(check.enabledByFlags?.flags.includes("project-gate:all"), true);
      assert.equal(check.enabledByFlags?.propagateDependsOn, true);
    }
    for (const packageCheckId of packageAcceptanceCheckIds) {
      const entry = entries.find(({ check }) => check.checkId === packageCheckId);
      assert.ok(entry, `${packageCheckId} must exist`);
      assert.equal(entry.required, false);
      assert.deepEqual(entry.presets, []);
      assert.deepEqual(projectGateFlagControlledCheck(entry).enabledByFlags, {
        flags: ["project-gate:all"],
        mode: "any",
        propagateDependsOn: true
      });
    }
  });

  it("executes only Product flag-selected Checks and aggregates the same identities", async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "vibe-check-project-gate-flags-"));
    try {
      const calls: string[] = [];
      const entries = defineProjectGateEntries([
        {
          check: defineCheck({
            checkId: "fixture-required",
            displayName: "Fixture required",
            execution: () => {
              calls.push("fixture-required");
              return { status: "passed", data: {} };
            }
          }),
          presets: [],
          required: true
        },
        {
          check: defineCheck({
            checkId: "fixture-quality",
            displayName: "Fixture quality",
            execution: () => {
              calls.push("fixture-quality");
              return { status: "passed", data: {} };
            }
          }),
          presets: ["quality"],
          required: false
        }
      ]);

      for (const scenario of [
        {
          disabledCheckId: "fixture-quality",
          selectedCheckId: "fixture-required",
          selection: { kind: "required" as const }
        },
        {
          disabledCheckId: "fixture-required",
          selectedCheckId: "fixture-quality",
          selection: {
            kind: "focused" as const,
            presets: ["quality" as const]
          }
        }
      ]) {
        calls.length = 0;
        const result = await packageRun(createProjectGateDefinition(entries), {
          checkAggregation: projectGateAggregation(),
          flags: selectionFlags(scenario.selection),
          outputs: {
            diagnosticLogging: { enabled: false },
            machinePublication: { enabled: false },
            progressRendering: { enabled: false }
          },
          projectRoot
        });
        assert.equal(result.kind, "completed");
        if (result.kind !== "completed") continue;
        assert.equal(result.aggregate, "passed");
        assert.deepEqual(calls, [scenario.selectedCheckId]);
        assert.equal(
          result.snapshot.checks.find(({ checkId }) => checkId === scenario.selectedCheckId)
            ?.outcome.status,
          "passed"
        );
        assert.deepEqual(
          result.snapshot.checks.find(({ checkId }) => checkId === scenario.disabledCheckId)
            ?.outcome,
          {
            status: "not-applicable",
            reason: { code: "flag-condition-not-matched" }
          }
        );
      }
    } finally {
      rmSync(projectRoot, { force: true, recursive: true });
    }
  });

  it("settles a blocking normal quality Finding through its owning Check and effective aggregate", async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "vibe-check-project-gate-quality-finding-"));
    try {
      const docsDirectory = join(projectRoot, "docs");
      mkdirSync(docsDirectory);
      const guidePath = join(docsDirectory, "guide.md");
      writeFileSync(join(docsDirectory, "target.md"), "# Target\n", "utf8");
      const entries = defineProjectGateEntries([
        {
          check: markdownLinkValidation({
            files: { include: ["docs/**/*.md"] },
            findingPolicy: "blocking"
          }),
          presets: ["quality"],
          required: false
        }
      ]);
      const definition = createProjectGateDefinition(entries);
      const runQuality = () =>
        packageRun(definition, {
          checkAggregation: projectGateAggregation(),
          flags: selectionFlags({ kind: "focused", presets: ["quality"] }),
          outputs: {
            diagnosticLogging: { enabled: false },
            machinePublication: { enabled: false },
            progressRendering: { enabled: false }
          },
          projectRoot
        });

      writeFileSync(guidePath, "[target](target.md)\n", "utf8");
      const zeroFindings = await runQuality();
      assert.equal(zeroFindings.kind, "completed");
      if (zeroFindings.kind !== "completed") return;
      assert.equal(zeroFindings.aggregate, "passed");
      assert.equal(zeroFindings.snapshot.records.length, 0);
      assert.equal(zeroFindings.snapshot.checks[0]?.outcome.status, "passed");

      writeFileSync(guidePath, "[missing](missing.md)\n", "utf8");
      const normalFinding = await runQuality();
      assert.equal(normalFinding.kind, "completed");
      if (normalFinding.kind !== "completed") return;
      assert.equal(normalFinding.snapshot.checks[0]?.checkId, "markdown-link-validation");
      assert.equal(normalFinding.snapshot.checks[0]?.outcome.status, "failed");
      assert.equal(normalFinding.snapshot.records.length, 1);
      assert.equal(normalFinding.aggregate, "failed");
    } finally {
      rmSync(projectRoot, { force: true, recursive: true });
    }
  });

  it("starts a downstream-only Gate Check with its prerequisite and aggregates Product selection", async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "vibe-check-project-gate-propagation-"));
    try {
      const calls: string[] = [];
      const entries = defineProjectGateEntries([
        {
          check: defineCheck({
            checkId: "fixture-prerequisite",
            displayName: "Fixture prerequisite",
            execution: () => {
              calls.push("fixture-prerequisite");
              return { status: "passed", data: {} };
            }
          }),
          presets: [],
          required: false
        },
        {
          check: defineCheck({
            checkId: "fixture-downstream",
            dependsOn: ["fixture-prerequisite"],
            displayName: "Fixture downstream",
            execution: () => {
              calls.push("fixture-downstream");
              return { status: "passed", data: {} };
            }
          }),
          presets: ["quality"],
          required: false
        },
        {
          check: defineCheck({
            checkId: "fixture-unselected",
            displayName: "Fixture unselected",
            execution: () => {
              calls.push("fixture-unselected");
              return { status: "passed", data: {} };
            }
          }),
          presets: ["docs"],
          required: false
        }
      ]);

      const result = await packageRun(createProjectGateDefinition(entries), {
        checkAggregation: projectGateAggregation(),
        flags: selectionFlags({ kind: "focused", presets: ["quality"] }),
        outputs: {
          diagnosticLogging: { enabled: false },
          machinePublication: { enabled: false },
          progressRendering: { enabled: false }
        },
        projectRoot
      });
      assert.equal(result.kind, "completed");
      if (result.kind !== "completed") return;
      assert.equal(result.aggregate, "passed");
      assert.deepEqual(calls, ["fixture-prerequisite", "fixture-downstream"]);
      assert.deepEqual(
        result.snapshot.checks.map(({ checkId, outcome }) => [checkId, outcome.status]),
        [
          ["fixture-downstream", "passed"],
          ["fixture-prerequisite", "passed"],
          ["fixture-unselected", "not-applicable"]
        ]
      );
    } finally {
      rmSync(projectRoot, { force: true, recursive: true });
    }
  });

  it("preserves two-step ast-grep process evidence and failures", async () => {
    const logDirectory = mkdtempSync(join(tmpdir(), "vibe-check-project-gate-"));
    try {
      const invocations = Object.freeze({
        ruleTests: Object.freeze({
          args: ["test"],
          command: "ast-grep",
          cwd: logDirectory,
          label: "ast-grep test"
        }),
        version: Object.freeze({
          args: ["--version"],
          command: "ast-grep",
          cwd: logDirectory,
          label: "ast-grep --version"
        })
      });
      const passed = processResult(0, "ast-grep 0.45.0");
      const rulePassed = processResult(0, "rule output");
      const artifactDirectory = ruleTestArtifactDirectory(logDirectory);
      const successful = await invokeCheck(
        createTestEvidenceRuleTestsCheck(
          testEvidenceRuleDependencies({ ruleTests: rulePassed, version: passed }, invocations)
        ),
        new AbortController().signal,
        artifactDirectory
      );
      assert.deepEqual(successful, {
        status: "passed",
        data: { ruleTestsExitCode: 0, versionExitCode: 0 }
      });
      const transcriptPath = join(artifactDirectory, "process.log");
      assert.match(readFileSync(transcriptPath, "utf8"), /step: version/);
      assert.match(readFileSync(transcriptPath, "utf8"), /step: rule-tests/);

      const versionMismatch = await invokeCheckWithRecords(
        createTestEvidenceRuleTestsCheck(
          testEvidenceRuleDependencies({ version: processResult(0, "wrong version") }, invocations)
        ),
        new AbortController().signal,
        artifactDirectory
      );
      assert.deepEqual(versionMismatch.result, {
        status: "failed",
        data: { versionExitCode: 0 },
        messages: [
          {
            level: "error",
            code: "ast-grep-version-mismatch",
            message:
              "The ast-grep version did not match; transcript: checks/test-evidence-rule-tests/process.log."
          }
        ]
      });
      assert.deepEqual(versionMismatch.records, [
        {
          data: {
            expectedVersion: "ast-grep 0.45.0",
            kind: "ast-grep-version-mismatch",
            log: "checks/test-evidence-rule-tests/process.log",
            mismatch: "version-output",
            versionExitCode: 0
          },
          identity: { id: "ast-grep-version-mismatch" }
        }
      ]);
      assert.doesNotMatch(JSON.stringify(versionMismatch), /wrong version/);
      assert.doesNotMatch(JSON.stringify(versionMismatch), /stdout/);
      assert.doesNotMatch(JSON.stringify(versionMismatch), /stderr/);
      assert.doesNotMatch(readFileSync(transcriptPath, "utf8"), /step: rule-tests/);

      const failed = await invokeCheckWithRecords(
        createTestEvidenceRuleTestsCheck(
          testEvidenceRuleDependencies(
            { ruleTests: processResult(7), version: passed },
            invocations
          )
        ),
        new AbortController().signal,
        artifactDirectory
      );
      assert.deepEqual(failed.result, {
        status: "failed",
        data: { exitCode: 7 },
        messages: [
          {
            level: "error",
            code: "command-failed",
            message:
              "Command exited with code 7; signal: none; transcript: checks/test-evidence-rule-tests/process.log."
          }
        ]
      });
      assert.deepEqual(failed.records, [
        {
          data: {
            command: "ast-grep",
            exitCode: 7,
            log: "checks/test-evidence-rule-tests/process.log",
            signal: "none"
          },
          identity: { id: "command-failure" }
        }
      ]);

      const unavailable = await invokeCheck(
        createTestEvidenceRuleTestsCheck(
          testEvidenceRuleDependencies(
            {
              version: {
                ...processResult(null),
                error: new Error("fixture unavailable")
              }
            },
            invocations
          )
        ),
        new AbortController().signal,
        artifactDirectory
      );
      assert.deepEqual(unavailable, {
        status: "unavailable",
        reason: { code: "process-unavailable" }
      });

      const controller = new AbortController();
      const cancelled = await invokeCheck(
        createTestEvidenceRuleTestsCheck(
          testEvidenceRuleDependencies(
            { ruleTests: rulePassed, version: passed },
            invocations,
            () => controller.abort()
          )
        ),
        controller.signal,
        artifactDirectory
      );
      assert.deepEqual(cancelled, {
        status: "unavailable",
        reason: { code: "execution-cancelled" }
      });
      assert.equal(existsSync(transcriptPath), true);
    } finally {
      rmSync(logDirectory, { force: true, recursive: true });
    }
  });
});

function testEvidenceRuleDependencies(
  result: Readonly<{
    readonly ruleTests?: ReturnType<typeof processResult>;
    readonly version: ReturnType<typeof processResult>;
  }>,
  invocations: TestEvidenceRuleTestInvocations,
  afterRun?: () => void
): TestEvidenceRuleTestsCheckDependencies {
  return {
    runRuleTests: async () => {
      afterRun?.();
      return result;
    },
    ruleTestInvocations: () => invocations,
    writeTranscript: writeProcessTranscript
  };
}

function processResult(
  status: number | null,
  stdout = ""
): Readonly<{
  readonly error?: Error;
  readonly signal: null;
  readonly status: number | null;
  readonly stderr: string;
  readonly stdout: string;
}> {
  return Object.freeze({ signal: null, status, stderr: "", stdout });
}

function ruleTestArtifactDirectory(root: string): string {
  return join(root, "checks", "test-evidence-rule-tests");
}
