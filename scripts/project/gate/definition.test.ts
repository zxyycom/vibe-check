import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { isNonArrayRecord } from "../../value-guards.ts";
import { defineCheck, type Check } from "@zxyycom/vibe-check";
import type { TestEvidenceRuleTestInvocations } from "../../test-evidence/ast-grep/rule-tests.ts";
import { defineProjectGateEntries } from "./runtime/entries.ts";
import { projectGateCheckForSelection } from "./runtime/eligibility.ts";
import { createNativeOperationCheck } from "./checks/process/native-operation.ts";
import { createProjectGateDefinition, createProjectGateEntries } from "./definition.ts";
import { createExternalConsumerMaterialLease } from "./checks/external-consumer-material.ts";
import { writeProcessTranscript } from "./checks/process/process.ts";
import { projectGateAggregation } from "./runtime/bound-run.ts";
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

const qualityCheckIds: ReadonlySet<string> = new Set([
  "duplicate-detection",
  "file-metrics",
  "function-metrics",
  "markdown-link-validation"
]);

const packageAcceptanceCheckIds: ReadonlySet<string> = new Set([
  "prepared-external-package-consumer",
  "tests-package-artifact",
  "tests-package-candidate",
  "tests-package-consumer-types",
  "tests-package-consumer-docs",
  "tests-package-consumer-runtime"
]);

describe("Project Gate Definition", () => {
  it("projects ordinary Check entries without a command catalog or policy", async () => {
    const entries = createProjectGateEntries({
      externalConsumerLease: createExternalConsumerMaterialLease(),
      invocationLogDirectory: "/tmp/project-gate-logs",
      preparedCandidate
    });
    const definition = createProjectGateDefinition(entries, {
      profile: "required",
      disabledTags: [],
      enabledTags: []
    });

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
      admissionPolicy: { kind: "static" },
      maxParallel: 3,
      measurementHooks: []
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
      assert.deepEqual(entry?.profiles, ["required", "full"]);
      assert.deepEqual(entry?.tags, ["quality"]);
    }
    const qualityEntry = entries.find(({ check }) => check.checkId === "duplicate-detection");
    assert.ok(qualityEntry);
    assert.deepEqual(
      await invokeCheck(
        projectGateCheckForSelection(qualityEntry, {
          profile: "required",
          disabledTags: ["quality"],
          enabledTags: []
        })
      ),
      {
        status: "not-applicable",
        reason: { code: "tag-quality-disabled" },
        messages: [
          {
            level: "info",
            code: "project-gate-check-not-run",
            message: "Duplicate detection did not run because tag quality was disabled."
          }
        ]
      }
    );

    const expectedTestLanes = resolveProjectGateTestLanes(process.cwd());
    for (const [checkId, files] of [
      ["tests-product-duplicate-detection", expectedTestLanes.productDuplicateDetection],
      ["tests-product-file-metrics", expectedTestLanes.productFileMetrics],
      ["tests-product-function-metrics", expectedTestLanes.productFunctionMetrics],
      ["tests-product-json", expectedTestLanes.productJsonChecks],
      ["tests-product-markdown-links", expectedTestLanes.productMarkdownLinks],
      ["tests-product-supporting-checks", expectedTestLanes.productSupportingChecks],
      ["tests-product-runtime", expectedTestLanes.productRuntime],
      ["tests-scripts-project", expectedTestLanes.scriptsProject],
      ["tests-scripts-test-evidence", expectedTestLanes.scriptsTestEvidence],
      ["tests-scripts-validation", expectedTestLanes.scriptsValidation],
      ["tests-scripts-tooling", expectedTestLanes.scriptsTooling],
      ["tests-package-supporting", expectedTestLanes.packageSupporting],
      ["tests-package-artifact", expectedTestLanes.packageArtifact],
      ["tests-package-candidate", expectedTestLanes.packageCandidate],
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
    for (const checkId of ["tests-package-candidate", "prepared-external-package-consumer"]) {
      const entry = entries.find(({ check }) => check.checkId === checkId);
      assert.deepEqual(entry?.check.mutex, ["project-gate-package-lifecycle"]);
    }
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
    assert.throws(
      () =>
        defineProjectGateEntries([
          { check: prerequisite, profiles: ["full"], tags: [] },
          {
            check: dependent,
            profiles: ["required", "full"],
            tags: []
          }
        ]),
      /selection-closed: fixture-dependent -> fixture-prerequisite/
    );
    const observer = defineCheck({
      checkId: "fixture-observer",
      displayName: "Fixture observer",
      observes: ["fixture-prerequisite"]
    });
    assert.throws(
      () =>
        defineProjectGateEntries([
          { check: prerequisite, profiles: ["full"], tags: [] },
          {
            check: observer,
            profiles: ["required", "full"],
            tags: []
          }
        ]),
      /observes relation is not selection-closed: fixture-observer -> fixture-prerequisite/
    );
    assert.throws(
      () =>
        defineProjectGateEntries([
          {
            check: prerequisite,
            profiles: ["required", "full"],
            tags: ["docs"]
          },
          {
            check: dependent,
            profiles: ["required", "full"],
            tags: []
          }
        ]),
      /selection-closed: fixture-dependent -> fixture-prerequisite/
    );
    const selfDependent = defineCheck({
      checkId: "fixture-self-dependent",
      dependsOn: ["fixture-self-dependent"],
      displayName: "Fixture self-dependent"
    });
    assert.throws(
      () => defineProjectGateEntries([{ check: selfDependent, profiles: ["required"], tags: [] }]),
      /cannot depend on itself: fixture-self-dependent/
    );
    const selfObserver = defineCheck({
      checkId: "fixture-self-observer",
      displayName: "Fixture self observer",
      observes: ["fixture-self-observer"]
    });
    assert.throws(
      () => defineProjectGateEntries([{ check: selfObserver, profiles: ["required"], tags: [] }]),
      /cannot observe itself: fixture-self-observer/
    );
    const missingDependency = defineCheck({
      checkId: "fixture-missing-dependency",
      dependsOn: ["fixture-absent"],
      displayName: "Fixture missing dependency"
    });
    assert.throws(
      () =>
        defineProjectGateEntries([
          {
            check: missingDependency,
            profiles: ["required"],
            tags: []
          }
        ]),
      /dependsOn relation is missing: fixture-missing-dependency -> fixture-absent/
    );
    const missingObservation = defineCheck({
      checkId: "fixture-missing-observation",
      displayName: "Fixture missing observation",
      observes: ["fixture-absent"]
    });
    assert.throws(
      () =>
        defineProjectGateEntries([
          {
            check: missingObservation,
            profiles: ["required"],
            tags: []
          }
        ]),
      /observes relation is missing: fixture-missing-observation -> fixture-absent/
    );
  });

  it("derives required, full, and partial aggregates from the same entries", async () => {
    const logDirectory = mkdtempSync(join(tmpdir(), "vibe-check-project-gate-"));
    try {
      const entries = createProjectGateEntries({
        externalConsumerLease: createExternalConsumerMaterialLease(),
        invocationLogDirectory: logDirectory,
        preparedCandidate
      });
      const selections = [
        {
          profile: "required" as const,
          disabledTags: [] as const,
          enabledTags: [] as const
        },
        { profile: "full" as const, disabledTags: [] as const, enabledTags: [] as const },
        {
          profile: "required" as const,
          disabledTags: [] as const,
          enabledTags: ["package-tests"] as const
        },
        {
          profile: "full" as const,
          disabledTags: ["package-tests"] as const,
          enabledTags: [] as const
        },
        {
          profile: "required" as const,
          disabledTags: ["quality"] as const,
          enabledTags: [] as const
        }
      ];

      for (const selection of selections) {
        const disabledTags = new Set<string>(selection.disabledTags);
        const enabledTags = new Set<string>(selection.enabledTags);
        createProjectGateDefinition(entries, selection);
        assert.deepEqual(projectGateAggregation(entries, selection), {
          checks: entries
            .filter(
              (entry) =>
                entry.profiles.includes(selection.profile) &&
                !entry.tags.some((tag) => disabledTags.has(tag)) &&
                (selection.profile === "full" ||
                  !entry.tags.includes("package-tests") ||
                  enabledTags.has("package-tests"))
            )
            .map(({ check }) => check.checkId),
          empty: "failed",
          mode: "all",
          notApplicable: "fail",
          unavailable: "propagate"
        });
      }

      for (const packageCheckId of [
        "prepared-external-package-consumer",
        "tests-package-artifact",
        "tests-package-candidate",
        "tests-package-consumer-types",
        "tests-package-consumer-docs",
        "tests-package-consumer-runtime"
      ]) {
        const packageTests = entries.find(({ check }) => check.checkId === packageCheckId);
        assert.ok(packageTests, `${packageCheckId} must exist`);
        const notEnabled = projectGateCheckForSelection(packageTests, {
          profile: "required",
          disabledTags: [],
          enabledTags: []
        });
        assert.deepEqual(await invokeCheck(notEnabled), {
          status: "not-applicable",
          reason: { code: "tag-package-tests-not-enabled" },
          messages: [
            {
              level: "info",
              code: "project-gate-check-not-run",
              message: `${packageTests.check.displayName} did not run; use --enable-tag package-tests or --profile full.`
            }
          ]
        });
      }

      let profileExcludedWorkStarted = false;
      const profileOnlyEntry = defineProjectGateEntries([
        {
          check: defineCheck({
            checkId: "fixture-full-only",
            displayName: "Fixture full-only Check",
            execution: () => {
              profileExcludedWorkStarted = true;
              return { status: "passed", data: {} };
            }
          }),
          profiles: ["full"],
          tags: []
        }
      ])[0];
      if (profileOnlyEntry === undefined) throw new Error("fixture entry must be present");
      const profileExcluded = projectGateCheckForSelection(profileOnlyEntry, {
        profile: "required",
        disabledTags: [],
        enabledTags: []
      });
      assert.deepEqual(await invokeCheck(profileExcluded), {
        status: "not-applicable",
        reason: { code: "profile-required-excluded" },
        messages: [
          {
            level: "info",
            code: "project-gate-check-not-run",
            message:
              "Fixture full-only Check did not run because profile required does not include it."
          }
        ]
      });
      assert.equal(profileExcludedWorkStarted, false);
    } finally {
      rmSync(logDirectory, { force: true, recursive: true });
    }
  });

  it("keeps native Check outcomes transcript-free", async () => {
    const logDirectory = mkdtempSync(join(tmpdir(), "vibe-check-project-gate-"));
    try {
      const scenarios = [
        {
          check: createNativeOperationCheck({
            checkId: "fixture-native-pass",
            displayName: "Fixture native pass",
            operation: () => ({ passed: true })
          }),
          expected: { status: "passed", data: { outcome: "completed" } }
        },
        {
          check: createNativeOperationCheck({
            checkId: "fixture-native-diagnostic",
            displayName: "Fixture native diagnostic",
            operation: () => ({
              passed: false,
              code: "test-evidence-case.entity.case-missing",
              diagnosticCount: 2,
              focusedCommand: "bun run test-evidence -- check --root .",
              summary:
                "Test Evidence reported 2 blocking diagnostic(s); first code: case.entity.case-missing"
            })
          }),
          expected: {
            status: "failed",
            data: {
              outcome: "failed",
              diagnosticCode: "test-evidence-case.entity.case-missing",
              diagnosticCount: 2
            },
            messages: [
              {
                level: "error",
                code: "test-evidence-case.entity.case-missing",
                message:
                  "Test Evidence reported 2 blocking diagnostic(s); first code: case.entity.case-missing; run: bun run test-evidence -- check --root ."
              }
            ]
          },
          records: [
            {
              data: { code: "test-evidence-case.entity.case-missing", count: 2 },
              identity: { id: "native-operation-diagnostic" }
            }
          ]
        },
        {
          check: createNativeOperationCheck({
            checkId: "fixture-native-docs-diagnostic",
            displayName: "Fixture native docs diagnostic",
            operation: () => ({
              passed: false,
              code: "docs-example-validator-invalid",
              diagnosticCount: 1,
              focusedCommand: "bun run validate -- docs examples",
              summary: "The Docs example validator reported a validation error"
            })
          }),
          expected: {
            status: "failed",
            data: {
              outcome: "failed",
              diagnosticCode: "docs-example-validator-invalid",
              diagnosticCount: 1
            },
            messages: [
              {
                level: "error",
                code: "docs-example-validator-invalid",
                message:
                  "The Docs example validator reported a validation error; run: bun run validate -- docs examples"
              }
            ]
          },
          records: [
            {
              data: { code: "docs-example-validator-invalid", count: 1 },
              identity: { id: "native-operation-diagnostic" }
            }
          ]
        },
        {
          check: createNativeOperationCheck({
            checkId: "fixture-native-decision-diagnostic",
            displayName: "Fixture native Decision diagnostic",
            operation: () => ({
              passed: false,
              code: "decision-records-invalid",
              diagnosticCount: 3,
              focusedCommand: "bun run decisions -- check",
              summary: "Decision Records reported 3 validation error(s)"
            })
          }),
          expected: {
            status: "failed",
            data: {
              outcome: "failed",
              diagnosticCode: "decision-records-invalid",
              diagnosticCount: 3
            },
            messages: [
              {
                level: "error",
                code: "decision-records-invalid",
                message:
                  "Decision Records reported 3 validation error(s); run: bun run decisions -- check"
              }
            ]
          },
          records: [
            {
              data: { code: "decision-records-invalid", count: 3 },
              identity: { id: "native-operation-diagnostic" }
            }
          ]
        },
        {
          check: createNativeOperationCheck({
            checkId: "fixture-native-throw",
            displayName: "Fixture native throw",
            operation: () => {
              throw new Error("fixture failure");
            }
          }),
          expected: {
            status: "unavailable",
            reason: { code: "native-operation-unavailable" }
          }
        }
      ];
      for (const scenario of scenarios) {
        const invocation = await invokeCheckWithRecords(scenario.check);
        assert.deepEqual(invocation.result, scenario.expected);
        assert.deepEqual(invocation.records, scenario.records ?? []);
        assert.equal(
          existsSync(join(logDirectory, "process", `${scenario.check.checkId}.log`)),
          false
        );
      }

      const cancelled = new AbortController();
      cancelled.abort();
      const check = createNativeOperationCheck({
        checkId: "fixture-native-cancelled",
        displayName: "Fixture native cancelled",
        operation: () => {
          throw new Error("must not run");
        }
      });
      assert.deepEqual(await invokeCheck(check, cancelled.signal), {
        status: "unavailable",
        reason: { code: "execution-cancelled" }
      });
      assert.equal(
        existsSync(join(logDirectory, "process", "fixture-native-cancelled.log")),
        false
      );

      const afterOperationCancellation = new AbortController();
      let operationWorkspaceRoot: string | undefined;
      let operationSignal: AbortSignal | undefined;
      const operationCancelled = createNativeOperationCheck({
        checkId: "fixture-native-operation-cancelled",
        displayName: "Fixture native operation cancellation",
        operation: (workspaceRoot, signal) => {
          operationWorkspaceRoot = workspaceRoot;
          operationSignal = signal;
          afterOperationCancellation.abort();
          return { passed: true };
        }
      });
      assert.deepEqual(await invokeCheck(operationCancelled, afterOperationCancellation.signal), {
        status: "unavailable",
        reason: { code: "execution-cancelled" }
      });
      assert.equal(operationWorkspaceRoot, process.cwd());
      assert.equal(operationSignal, afterOperationCancellation.signal);
      assert.equal(
        existsSync(join(logDirectory, "process", "fixture-native-operation-cancelled.log")),
        false
      );
    } finally {
      rmSync(logDirectory, { force: true, recursive: true });
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
      const successful = await invokeCheck(
        createTestEvidenceRuleTestsCheck(
          logDirectory,
          testEvidenceRuleDependencies({ ruleTests: rulePassed, version: passed }, invocations)
        )
      );
      assert.deepEqual(successful, {
        status: "passed",
        data: { ruleTestsExitCode: 0, versionExitCode: 0 }
      });
      const transcriptPath = join(logDirectory, "process", "test-evidence-rule-tests.log");
      assert.match(readFileSync(transcriptPath, "utf8"), /step: version/);
      assert.match(readFileSync(transcriptPath, "utf8"), /step: rule-tests/);

      const versionMismatch = await invokeCheck(
        createTestEvidenceRuleTestsCheck(
          logDirectory,
          testEvidenceRuleDependencies({ version: processResult(0, "wrong version") }, invocations)
        )
      );
      assert.deepEqual(versionMismatch, {
        status: "failed",
        data: { versionExitCode: 0 },
        messages: [
          {
            level: "error",
            code: "ast-grep-version-mismatch",
            message:
              "The ast-grep version did not match; transcript: process/test-evidence-rule-tests.log."
          }
        ]
      });
      assert.doesNotMatch(readFileSync(transcriptPath, "utf8"), /step: rule-tests/);

      const failed = await invokeCheckWithRecords(
        createTestEvidenceRuleTestsCheck(
          logDirectory,
          testEvidenceRuleDependencies(
            { ruleTests: processResult(7), version: passed },
            invocations
          )
        )
      );
      assert.deepEqual(failed.result, {
        status: "failed",
        data: { exitCode: 7 },
        messages: [
          {
            level: "error",
            code: "command-failed",
            message:
              "Command exited with code 7; signal: none; transcript: process/test-evidence-rule-tests.log."
          }
        ]
      });
      assert.deepEqual(failed.records, [
        {
          data: {
            command: "ast-grep",
            exitCode: 7,
            log: "process/test-evidence-rule-tests.log",
            signal: "none"
          },
          identity: { id: "command-failure" }
        }
      ]);

      const unavailable = await invokeCheck(
        createTestEvidenceRuleTestsCheck(
          logDirectory,
          testEvidenceRuleDependencies(
            { version: { ...processResult(null), error: new Error("fixture unavailable") } },
            invocations
          )
        )
      );
      assert.deepEqual(unavailable, {
        status: "unavailable",
        reason: { code: "process-unavailable" }
      });

      const controller = new AbortController();
      const cancelled = await invokeCheck(
        createTestEvidenceRuleTestsCheck(
          logDirectory,
          testEvidenceRuleDependencies(
            { ruleTests: rulePassed, version: passed },
            invocations,
            () => controller.abort()
          )
        ),
        controller.signal
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

async function invokeCheck(check: Check, signal = new AbortController().signal) {
  return (await invokeCheckWithRecords(check, signal)).result;
}

async function invokeCheckWithRecords(check: Check, signal = new AbortController().signal) {
  if (check.execution === undefined)
    throw new Error("fixture Check must have an execution callback");
  const records: Array<
    Readonly<{ readonly data: object; readonly identity: { readonly id: string } }>
  > = [];
  const result = await check.execution({
    dependencies: {
      get: (checkId: string) => ({
        ok: false,
        error: { code: "dependency-not-declared", checkId }
      }),
      list: () => Object.freeze([])
    },
    options: check.options ?? {},
    project: {
      root: process.cwd(),
      flags: []
    },
    records: {
      report: (identity, data) => records.push(Object.freeze({ data, identity }))
    },
    signal
  });
  return Object.freeze({ records, result });
}
