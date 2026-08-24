import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { isNonArrayRecord, isStringArray } from "../../foundation/type-guards.ts";
import { defineCheck, type Check } from "vibe-check";
import type { TestEvidenceRuleTestInvocations } from "../../test-evidence/test-rules.ts";
import { defineProjectGateEntries } from "./entries.ts";
import { projectGateCheckForSelection } from "./eligibility.ts";
import { createNativeOperationCheck } from "./checks/native.ts";
import { createProjectGateDefinition, createProjectGateEntries } from "./definition.ts";
import { writeProcessTranscript } from "./checks/process.ts";
import { projectGateAggregation } from "./project-run.ts";
import {
  createTestEvidenceRuleTestsCheck,
  type TestEvidenceRuleTestsCheckDependencies
} from "./checks/test-evidence-rule-tests.ts";

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

describe("Project Gate Definition", () => {
  it("projects ordinary Check entries without a command catalog or policy", () => {
    const entries = createProjectGateEntries({ invocationLogDirectory: "/tmp/project-gate-logs" });
    const definition = createProjectGateDefinition(entries, {
      profile: "required",
      disabledTags: []
    });

    assert.deepEqual(
      definition.checks.map(({ checkId }) => checkId),
      expectedCheckIds
    );
    assert.deepEqual(definition.effects, {
      cache: { directory: ".cache/vibe-check", enabled: false },
      output: { directory: "artifacts/vibe-check", enabled: false },
      progress: { enabled: true }
    });
    assert.deepEqual(definition.scheduler, { maxParallel: 4 });
    assert.equal(Object.hasOwn(definition, "policies"), false);
    assert.equal(Object.hasOwn(definition, "selectedPolicy"), false);

    const nativeDocsCheck = definition.checks.find(
      ({ checkId }) => checkId === "docs-json-validator"
    );
    const repositoryQualityCheck = definition.checks.find(
      ({ checkId }) => checkId === "repository-quality"
    );
    assert.equal(nativeDocsCheck?.options, undefined);
    assert.deepEqual(repositoryQualityCheck?.dependsOn ?? [], []);
    const repositoryQualityOptions = repositoryQualityCheck?.options;
    assert.ok(isNonArrayRecord(repositoryQualityOptions));
    assert.equal(repositoryQualityOptions.command, "mise");
    const processArgs = repositoryQualityOptions.args;
    assert.ok(isStringArray(processArgs));
    assert.deepEqual(processArgs.slice(0, 3), ["exec", "--", "bun"]);
    const scanOnlyEntry = processArgs[3];
    assert.equal(typeof scanOnlyEntry, "string");
    if (typeof scanOnlyEntry !== "string") throw new Error("fixture scan entry must be a string");
    assert.match(scanOnlyEntry, /scripts\/project\/quality\/scan\.ts$/);
    assert.equal(scanOnlyEntry.includes("run-quality"), false);

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
          { check: dependent, profiles: ["required", "full"], tags: [] }
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
    const missingDependency = defineCheck({
      checkId: "fixture-missing-dependency",
      dependsOn: ["fixture-absent"],
      displayName: "Fixture missing dependency"
    });
    assert.throws(
      () =>
        defineProjectGateEntries([{ check: missingDependency, profiles: ["required"], tags: [] }]),
      /dependency is missing: fixture-missing-dependency -> fixture-absent/
    );
  });

  it("derives required, full, and partial aggregates from the same entries", async () => {
    const logDirectory = mkdtempSync(join(tmpdir(), "vibe-check-project-gate-"));
    try {
      const entries = createProjectGateEntries({ invocationLogDirectory: logDirectory });
      const selections = [
        { profile: "required" as const, disabledTags: [] as const },
        { profile: "full" as const, disabledTags: [] as const },
        { profile: "required" as const, disabledTags: ["quality"] as const }
      ];

      for (const selection of selections) {
        createProjectGateDefinition(entries, selection);
        assert.deepEqual(projectGateAggregation(entries, selection), {
          checks: expectedCheckIds.filter(
            (checkId) => checkId !== "repository-quality" || selection.disabledTags.length === 0
          ),
          empty: "failed",
          mode: "all",
          notApplicable: "fail",
          unavailable: "propagate"
        });
      }

      const repositoryQuality = entries.find(({ check }) => check.checkId === "repository-quality");
      assert.ok(repositoryQuality, "repository quality entry must exist");
      const excluded = projectGateCheckForSelection(repositoryQuality, {
        profile: "required",
        disabledTags: ["quality"]
      });
      assert.ok(excluded.execution, "eligible projection must preserve a Check callback");
      const result = await excluded.execution({
        dependencies: {
          get: () => ({ ok: false, error: { code: "dependency-not-declared", checkId: "fixture" } })
        },
        options: excluded.options ?? {},
        project: {
          root: process.cwd(),
          changedFiles: [],
          flags: [],
          files: { codeAreas: {}, excludeDirs: [], generatedFiles: [], include: [] },
          cache: { directory: "/tmp/cache", enabled: false, reportActivity: () => undefined }
        },
        records: { report: () => undefined },
        signal: new AbortController().signal
      });
      assert.deepEqual(result, {
        status: "not-applicable",
        reason: { code: "tag-disabled" }
      });
      assert.equal(existsSync(join(logDirectory, "repository-quality.log")), false);

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
        disabledTags: []
      });
      assert.deepEqual(await invokeCheck(profileExcluded), {
        status: "not-applicable",
        reason: { code: "profile-excluded" }
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
        assert.equal(existsSync(join(logDirectory, `${scenario.check.checkId}.log`)), false);
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
      assert.equal(existsSync(join(logDirectory, "fixture-native-cancelled.log")), false);

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
      assert.equal(existsSync(join(logDirectory, "fixture-native-operation-cancelled.log")), false);
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
      const transcriptPath = join(logDirectory, "test-evidence-rule-tests.log");
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
            message: "The ast-grep version did not match; transcript: test-evidence-rule-tests.log."
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
              "Command exited with code 7; signal: none; transcript: test-evidence-rule-tests.log."
          }
        ]
      });
      assert.deepEqual(failed.records, [
        {
          data: {
            command: "ast-grep",
            exitCode: 7,
            log: "test-evidence-rule-tests.log",
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
      get: (checkId: string) => ({ ok: false, error: { code: "dependency-not-declared", checkId } })
    },
    options: check.options ?? {},
    project: {
      root: process.cwd(),
      changedFiles: [],
      flags: [],
      files: { codeAreas: {}, excludeDirs: [], generatedFiles: [], include: [] },
      cache: { directory: "/tmp/cache", enabled: false, reportActivity: () => undefined }
    },
    records: {
      report: (identity, data) => records.push(Object.freeze({ data, identity }))
    },
    signal
  });
  return Object.freeze({ records, result });
}
