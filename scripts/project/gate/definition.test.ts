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
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, it } from "node:test";

import { defineCheck, markdownLinkValidation, run as packageRun } from "@zxyycom/vibe-check";
import type {
  CheckFlagCondition,
  CheckFlagEnablement,
  CheckProjectContext
} from "@zxyycom/vibe-check";
import { isNonArrayRecord } from "../../value-guards.ts";
import type { TestEvidenceRuleTestInvocations } from "../../test-evidence/ast-grep/rule-tests.ts";
import type { MaterialValidationResult } from "../../validation/repository-material/workflow.ts";
import { defineProjectGateEntries, type ProjectGateEntry } from "./runtime/entries.ts";
import { projectGateFlagControlledCheck } from "./runtime/eligibility.ts";
import { selectionFlags, type ProjectGateSelection } from "./runtime/controls.ts";
import {
  createLintProductCheck,
  createProjectGateDefinition,
  createProjectGateEntries,
  PROJECT_GATE_RUN_CONFIG
} from "./definition.ts";
import { createExternalConsumerMaterialLease } from "./checks/external-consumer-material.ts";
import { createMaterialValidationCheck } from "./checks/materials-validation.ts";
import { invokeCheck, invokeCheckWithRecords } from "./checks/check-execution.test-support.ts";
import { createOxlintFailureProjection } from "./checks/oxlint-failure-records.ts";
import { writeProcessTranscript } from "./checks/process/transcript.ts";
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

const qualityCheckIds: ReadonlySet<string> = new Set([
  "duplicate-detection",
  "file-metrics",
  "function-metrics",
  "markdown-link-validation"
]);
const bunTestRunnerCheckIds: readonly string[] = expectedCheckIds.filter((checkId) =>
  checkId.startsWith("tests-")
);

const packageAcceptanceCheckIds: ReadonlySet<string> = new Set([
  "prepared-external-package-consumer",
  "tests-package-artifact",
  "tests-package-consumer-types",
  "tests-package-consumer-docs",
  "tests-package-consumer-runtime"
]);
const incrementalRepositoryMaterialCheckIds: ReadonlySet<string> = new Set([
  "materials-json-validator",
  "materials-schema-validator",
  "materials-schema-publication-validator",
  "materials-examples-validator"
]);
const expectedRequiredCheckIds = expectedCheckIds.filter(
  (checkId) =>
    !packageAcceptanceCheckIds.has(checkId) &&
    checkId !== "tests-product-runtime" &&
    !incrementalRepositoryMaterialCheckIds.has(checkId)
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
      "materials-json-validator",
      "materials-schema-validator",
      "materials-schema-publication-validator",
      "materials-examples-validator",
      "materials-links-validator"
    ],
    selection: { kind: "focused", presets: ["materials", "quality"] }
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
      progressRendering: {
        enabled: true,
        formatter: null,
        messagePreviewLimit: 5,
        recordPreviewLimit: 5,
        textPreviewCodePointLimit: 240
      }
    });
    assert.equal(definition.scheduler.admissionPolicy.kind, "custom");
    assert.equal(
      definition.scheduler.admissionPolicy.kind === "custom" &&
        definition.scheduler.admissionPolicy.strategy.kind,
      "prepared"
    );
    assert.deepEqual(
      {
        maxParallel: definition.scheduler.maxParallel,
        terminalEffects: definition.scheduler.terminalEffects,
        resourceCapacities: definition.scheduler.resourceCapacities
      },
      {
        maxParallel: 3,
        terminalEffects: [],
        resourceCapacities: {
          "project-gate-bun-test-runners": 2,
          "project-gate-repository-scans": 2
        }
      }
    );
    for (const check of definition.checks) {
      assert.deepEqual(check.resourceClaims, expectedResourceClaimsFor(check.checkId));
    }
    assert.deepEqual(PROJECT_GATE_RUN_CONFIG.selection, {
      complete: "all",
      default: "required",
      presets: ["materials", "lint", "quality", "test", "typecheck"]
    });
    assert.equal(Object.hasOwn(definition, "policies"), false);
    assert.equal(Object.hasOwn(definition, "selectedPolicy"), false);
    assert.deepEqual(definition.changes, {
      source: { compareWith: "origin/main" },
      flags: {
        "product-runtime": { exclude: [], include: ["src/**"] },
        "repository-material": {
          exclude: [],
          include: [
            "AGENTS.md",
            "README.md",
            ".oxfmtrc.json",
            ".oxlintrc.json",
            "changes/**",
            "docs/**",
            "mise.lock",
            "mise.toml",
            "package.json",
            "pnpm-lock.yaml",
            "pnpm-workspace.yaml",
            "scripts/**",
            "src/**",
            "tsconfig.json"
          ]
        }
      }
    });

    const nativeMaterialCheck = definition.checks.find(
      ({ checkId }) => checkId === "materials-json-validator"
    );
    assert.deepEqual(nativeMaterialCheck?.options, {
      files: {
        exclude: [
          "**/.cache/**",
          "**/.git",
          "**/.git/**",
          "**/.log/**",
          "**/.pytest_cache/**",
          "**/.tmp/**",
          "**/.venv/**",
          "**/.vibe-check/**",
          "**/__pycache__/**",
          "**/artifacts/**",
          "**/build/**",
          "**/coverage/**",
          "**/dist/**",
          "**/generated/**",
          "**/*.generated.*",
          "**/node_modules/**",
          "**/target/**",
          "**/tmp/**",
          "**/vendor/**",
          "**/venv/**"
        ],
        include: ["docs/**/*.json"],
        source: "filesystem"
      },
      maximumBytes: 2097152
    });
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
      definition.checks.find(({ checkId }) => checkId === "materials-links-validator")?.displayName,
      "Repository material link validation"
    );
    for (const checkId of [
      "materials-schema-validator",
      "materials-schema-publication-validator",
      "materials-examples-validator",
      "tests-scripts-validation"
    ]) {
      assert.deepEqual(entries.find(({ check }) => check.checkId === checkId)?.check.mutex, [
        "project-gate-repository-materials"
      ]);
    }
    assert.equal(
      entries.find(({ check }) => check.checkId === "materials-links-validator")?.check.mutex,
      undefined
    );
    assert.equal(
      entries.find(({ check }) => check.checkId === "materials-json-validator")?.check.mutex,
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
      when: {
        kind: "any",
        conditions: ["project-gate:all", "project-gate:required", "project-gate:preset=quality"]
      },
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
      assert.equal(entry.check.options.executable, process.execPath);
      assert.deepEqual(entry.check.options.arguments, ["test", ...files, "--reporter=dots"]);
      assert.equal(entry.check.options.arguments.includes("--parallel"), false);
      assert.equal(entry.check.options.workingDirectory, process.cwd());
      assert.deepEqual(entry.check.options.output, { mode: "transcript" });
      assert.ok(isNonArrayRecord(entry.check.options.environment));
      const dependencyBacked = packageAcceptanceCheckIds.has(checkId);
      assert.equal(entry.check.options.environment.mode, dependencyBacked ? "exact" : "inherit");
      if (!dependencyBacked) {
        assert.ok(isNonArrayRecord(entry.check.options.environment.overrides));
        assert.equal(entry.check.options.environment.overrides.NO_COLOR, "1");
      }
      assert.equal(
        entry.check.options.timeoutMs,
        packageAcceptanceCheckIds.has(checkId) ? 30_000 : 120_000
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
          { check: observer, presets: ["materials"], required: true }
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
      enabledByFlags: { when: "fixture" }
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

  it("settles lint-product with structured oxlint Records or exactly one generic fallback", async () => {
    const failureProjection = createOxlintFailureProjection({
      scope: "product",
      workspaceRoot: process.cwd()
    });
    const fixtureRoot = mkdtempSync(join(tmpdir(), "vibe-check-lint-product-wiring-"));
    const executeFixture = (stdout: string, artifactName: string) =>
      invokeCheckWithRecords(
        createLintProductCheck({
          failureProjection,
          invocation: {
            args: ["--eval", `process.stdout.write(${JSON.stringify(stdout)}); process.exit(1);`],
            command: process.execPath,
            cwd: process.cwd()
          }
        }),
        new AbortController().signal,
        join(fixtureRoot, artifactName)
      );
    try {
      const structured = await executeFixture(
        oxlintOutput("eslint(no-unused-vars)"),
        "lint-product-structured"
      );
      assert.deepEqual(structured.result, {
        status: "failed",
        data: { exitCode: 1 },
        messages: [
          {
            level: "error",
            code: "command-failed",
            message:
              "Command exited with code 1; signal: none; transcript: checks/lint-product-structured/process.log."
          }
        ]
      });
      assert.equal(
        JSON.stringify(structured.records),
        JSON.stringify([
          {
            data: {
              kind: "oxlint-diagnostic",
              location: { column: 2, line: 3 },
              occurrence: 1,
              path: "src/fixture.ts",
              rule: "eslint(no-unused-vars)",
              severity: "error"
            },
            identity: { id: "oxlint:src%2Ffixture.ts:3:2:eslint%28no-unused-vars%29:1" }
          }
        ])
      );
      assert.match(
        readFileSync(join(fixtureRoot, "lint-product-structured", "process.log"), "utf8"),
        /status=failed/
      );

      const fallbackOutputs = ["not JSON", oxlintOutput("eslint(https://user:token@example.test)")];
      for (const [index, stdout] of fallbackOutputs.entries()) {
        const artifactName = `lint-product-fallback-${index + 1}`;
        const fallback = await executeFixture(stdout, artifactName);
        assert.deepEqual(fallback.result, {
          status: "failed",
          data: { exitCode: 1 },
          messages: [
            {
              level: "error",
              code: "command-failed",
              message: `Command exited with code 1; signal: none; transcript: checks/${artifactName}/process.log.`
            }
          ]
        });
        assert.deepEqual(fallback.records, [
          {
            identity: { id: "command-failure" },
            data: {
              command: basename(process.execPath),
              exitCode: 1,
              log: `checks/${artifactName}/process.log`,
              signal: "none"
            }
          }
        ]);
      }
    } finally {
      rmSync(fixtureRoot, { force: true, recursive: true });
    }
  });

  it("keeps required, all, and focused membership golden while aggregation uses Product selection", () => {
    const entries = createProjectGateEntries({
      externalConsumerLease: createExternalConsumerMaterialLease(),
      preparedCandidate
    });
    const definition = createProjectGateDefinition(entries);
    assert.equal("aggregation" in PROJECT_GATE_RUN_CONFIG, false);

    for (const expectation of expectedCheckIdsBySelection) {
      const flags = new Set(selectionFlags(expectation.selection));
      assert.deepEqual(
        definition.checks
          .filter((check) => matchesFlagEnablement(check.enabledByFlags, flags))
          .map(({ checkId }) => checkId),
        expectation.checkIds
      );
    }

    for (const check of definition.checks) {
      assert.equal(check.enabledByFlags?.propagateDependsOn, true);
      if (check.checkId === "tests-product-runtime") continue;
      assert.equal(
        matchesFlagEnablement(check.enabledByFlags, new Set(["project-gate:all"])),
        true
      );
    }
    assert.deepEqual(
      definition.checks.find(({ checkId }) => checkId === "tests-product-runtime")?.enabledByFlags,
      {
        when: {
          kind: "any",
          conditions: [
            {
              kind: "all",
              conditions: ["project-gate:required", "vibe-check:change:product-runtime"]
            },
            "project-gate:preset=test",
            "project-gate:all"
          ]
        },
        propagateDependsOn: true
      }
    );
    for (const checkId of incrementalRepositoryMaterialCheckIds) {
      assert.deepEqual(
        definition.checks.find((check) => check.checkId === checkId)?.enabledByFlags,
        {
          when: {
            kind: "any",
            conditions: [
              {
                kind: "all",
                conditions: ["project-gate:required", "vibe-check:change:repository-material"]
              },
              "project-gate:preset=materials",
              "project-gate:all"
            ]
          },
          propagateDependsOn: true
        }
      );
    }
    for (const packageCheckId of packageAcceptanceCheckIds) {
      const entry = entries.find(({ check }) => check.checkId === packageCheckId);
      assert.ok(entry, `${packageCheckId} must exist`);
      assert.equal(entry.required, false);
      assert.deepEqual(entry.presets, []);
      assert.deepEqual(projectGateFlagControlledCheck(entry).enabledByFlags, {
        when: { kind: "any", conditions: ["project-gate:all"] },
        propagateDependsOn: true
      });
    }
  });

  it("selects the product-runtime lane only for a runtime change, unavailable source, or explicit force path", async () => {
    for (const scenario of [
      { kind: "unchanged", flags: ["project-gate:required"], runs: false },
      { kind: "changed", flags: ["project-gate:required"], runs: true },
      { kind: "unavailable", flags: ["project-gate:required"], runs: true },
      { kind: "test", flags: ["project-gate:preset=test"], runs: true },
      { kind: "all", flags: ["project-gate:all"], runs: true }
    ] as const) {
      const fixture =
        scenario.kind === "unavailable"
          ? mkdtempSync(join(tmpdir(), "vibe-check-gate-changes-"))
          : gitFixture();
      let calls = 0;
      let project: CheckProjectContext | undefined;
      try {
        if (scenario.kind === "changed") commitRuntimeChange(fixture);
        const definition = createProjectGateDefinition(
          defineProjectGateEntries([
            {
              check: defineCheck({
                checkId: "tests-product-runtime",
                displayName: "Fixture Product runtime tests",
                execute: ({ project: context }) => {
                  calls += 1;
                  project = context;
                  return { data: {}, status: "passed" };
                }
              }),
              presets: ["test"],
              required: true
            }
          ])
        );
        const result = await packageRun(definition, {
          flags: scenario.flags,
          outputs: {
            diagnosticLogging: { enabled: false },
            machinePublication: { enabled: false },
            progressRendering: { enabled: false }
          },
          projectRoot: fixture
        });
        assert.equal(result.kind, "completed", scenario.kind);
        assert.equal(calls, scenario.runs ? 1 : 0, scenario.kind);
        const outcome =
          result.kind === "completed" ? result.snapshot.checks[0]?.outcome : undefined;
        assert.equal(outcome?.status, scenario.runs ? "passed" : "not-applicable", scenario.kind);
        if (scenario.kind === "unchanged") {
          assert.deepEqual(project, undefined);
          continue;
        }
        assert.equal(
          project?.changes?.ok,
          scenario.kind === "unavailable" ? false : true,
          scenario.kind
        );
        if (scenario.kind === "changed") {
          assert.deepEqual(project?.changes, {
            files: [
              {
                flags: [
                  "vibe-check:change:product-runtime",
                  "vibe-check:change:repository-material"
                ],
                path: "src/runtime.ts"
              }
            ],
            ok: true
          });
        }
        if (scenario.kind === "unavailable") {
          assert.deepEqual(project?.changes, {
            ok: false,
            reason: { code: "git-changes-unavailable" }
          });
        }
      } finally {
        rmSync(fixture, { force: true, recursive: true });
      }
    }
  });

  it("selects closed repository-material Checks from one change snapshot while links remain full", async () => {
    const scenarios = [
      {
        kind: "unchanged",
        flags: ["project-gate:required"],
        change: "none",
        material: false,
        expected: ["materials-links-validator", "fixture-quality"]
      },
      {
        kind: "committed",
        flags: ["project-gate:required"],
        change: "commit",
        material: true,
        expected: [
          "fixture-material-prerequisite",
          "materials-json-validator",
          "materials-links-validator",
          "fixture-quality"
        ]
      },
      {
        kind: "rename",
        flags: ["project-gate:required"],
        change: "rename",
        material: true,
        expected: [
          "fixture-material-prerequisite",
          "materials-json-validator",
          "materials-links-validator",
          "fixture-quality"
        ]
      },
      {
        kind: "delete",
        flags: ["project-gate:required"],
        change: "delete",
        material: true,
        expected: [
          "fixture-material-prerequisite",
          "materials-json-validator",
          "materials-links-validator",
          "fixture-quality"
        ]
      },
      {
        kind: "staged",
        flags: ["project-gate:required"],
        change: "staged",
        material: true,
        expected: [
          "fixture-material-prerequisite",
          "materials-json-validator",
          "materials-links-validator",
          "fixture-quality"
        ]
      },
      {
        kind: "unstaged",
        flags: ["project-gate:required"],
        change: "unstaged",
        material: true,
        expected: [
          "fixture-material-prerequisite",
          "materials-json-validator",
          "materials-links-validator",
          "fixture-quality"
        ]
      },
      {
        kind: "untracked",
        flags: ["project-gate:required"],
        change: "untracked",
        material: true,
        expected: [
          "fixture-material-prerequisite",
          "materials-json-validator",
          "materials-links-validator",
          "fixture-quality"
        ]
      },
      {
        kind: "pnpm-lock",
        flags: ["project-gate:required"],
        change: "pnpm-lock",
        material: true,
        expected: [
          "fixture-material-prerequisite",
          "materials-json-validator",
          "materials-links-validator",
          "fixture-quality"
        ]
      },
      {
        kind: "outside-link-target",
        flags: ["project-gate:required"],
        change: "outside",
        material: false,
        expected: ["materials-links-validator", "fixture-quality"]
      },
      {
        kind: "runtime-material-overlap",
        flags: ["project-gate:required"],
        change: "overlap",
        material: true,
        expected: [
          "fixture-material-prerequisite",
          "materials-json-validator",
          "materials-links-validator",
          "fixture-quality",
          "tests-product-runtime"
        ]
      },
      {
        kind: "materials",
        flags: ["project-gate:preset=materials"],
        change: "none",
        material: true,
        expected: [
          "fixture-material-prerequisite",
          "materials-json-validator",
          "materials-links-validator"
        ]
      },
      {
        kind: "quality",
        flags: ["project-gate:preset=quality"],
        change: "none",
        material: false,
        expected: ["fixture-quality"]
      },
      {
        kind: "all",
        flags: ["project-gate:all"],
        change: "none",
        material: true,
        expected: [
          "fixture-material-prerequisite",
          "materials-json-validator",
          "materials-links-validator",
          "fixture-quality",
          "tests-product-runtime"
        ]
      }
    ] as const;

    for (const scenario of scenarios) {
      const root = gitFixture();
      const calls: string[] = [];
      let materialProject: CheckProjectContext | undefined;
      try {
        applyRepositoryMaterialChange(root, scenario.change);
        const entries = defineProjectGateEntries([
          {
            check: defineCheck({
              checkId: "fixture-material-prerequisite",
              displayName: "Fixture material prerequisite",
              execute: () => {
                calls.push("fixture-material-prerequisite");
                return { data: {}, status: "passed" };
              }
            }),
            presets: [],
            required: false
          },
          {
            check: defineCheck({
              checkId: "materials-json-validator",
              dependsOn: ["fixture-material-prerequisite"],
              displayName: "Fixture material validator",
              execute: ({ project }) => {
                calls.push("materials-json-validator");
                materialProject = project;
                return { data: {}, status: "passed" };
              }
            }),
            presets: ["materials"],
            required: true
          },
          {
            check: defineCheck({
              checkId: "materials-links-validator",
              displayName: "Fixture material links",
              execute: () => {
                calls.push("materials-links-validator");
                return { data: {}, status: "passed" };
              }
            }),
            presets: ["materials"],
            required: true
          },
          {
            check: defineCheck({
              checkId: "fixture-quality",
              displayName: "Fixture quality",
              execute: () => {
                calls.push("fixture-quality");
                return { data: {}, status: "passed" };
              }
            }),
            presets: ["quality"],
            required: true
          },
          {
            check: defineCheck({
              checkId: "tests-product-runtime",
              displayName: "Fixture Product runtime",
              execute: () => {
                calls.push("tests-product-runtime");
                return { data: {}, status: "passed" };
              }
            }),
            presets: ["test"],
            required: true
          }
        ]);
        const result = await packageRun(createProjectGateDefinition(entries), {
          flags: scenario.flags,
          outputs: {
            diagnosticLogging: { enabled: false },
            machinePublication: { enabled: false },
            progressRendering: { enabled: false }
          },
          projectRoot: root
        });
        assert.equal(result.kind, "completed", scenario.kind);
        if (result.kind !== "completed") continue;
        assert.equal(result.aggregate, "passed", scenario.kind);
        assert.deepEqual([...calls].sort(), [...scenario.expected].sort(), scenario.kind);
        if (scenario.material) {
          assert.ok(
            calls.indexOf("fixture-material-prerequisite") <
              calls.indexOf("materials-json-validator"),
            scenario.kind
          );
        }
        assert.equal(materialProject !== undefined, scenario.material, scenario.kind);
        assert.equal(
          result.snapshot.checks.find(({ checkId }) => checkId === "materials-json-validator")
            ?.outcome.status,
          scenario.material ? "passed" : "not-applicable",
          scenario.kind
        );
        if (materialProject !== undefined) {
          assert.equal(
            materialProject.flags.includes("vibe-check:change:repository-material"),
            scenario.flags[0] === "project-gate:required",
            scenario.kind
          );
          assert.equal(materialProject.changes?.ok, true, scenario.kind);
        }
      } finally {
        rmSync(root, { force: true, recursive: true });
      }
    }

    for (const unavailable of ["missing-ref", "non-git"] as const) {
      const unavailableRoot =
        unavailable === "missing-ref"
          ? gitFixture()
          : mkdtempSync(join(tmpdir(), "vibe-check-gate-materials-unavailable-"));
      try {
        if (unavailable === "missing-ref") {
          git(unavailableRoot, ["update-ref", "-d", "refs/remotes/origin/main"]);
        }
        let calls = 0;
        let project: CheckProjectContext | undefined;
        const result = await packageRun(
          createProjectGateDefinition(
            defineProjectGateEntries([
              {
                check: defineCheck({
                  checkId: "materials-json-validator",
                  displayName: "Unavailable material validator",
                  execute: ({ project: context }) => {
                    calls += 1;
                    project = context;
                    return { data: {}, status: "passed" };
                  }
                }),
                presets: ["materials"],
                required: true
              }
            ])
          ),
          {
            flags: ["project-gate:required"],
            outputs: {
              diagnosticLogging: { enabled: false },
              machinePublication: { enabled: false },
              progressRendering: { enabled: false }
            },
            projectRoot: unavailableRoot
          }
        );
        assert.equal(result.kind, "completed", unavailable);
        assert.equal(calls, 1, unavailable);
        assert.deepEqual(
          project?.changes,
          { ok: false, reason: { code: "git-changes-unavailable" } },
          unavailable
        );
        assert.equal(
          project?.flags.includes("vibe-check:change:repository-material"),
          true,
          unavailable
        );
      } finally {
        rmSync(unavailableRoot, { force: true, recursive: true });
      }
    }
  });

  it("fails the real schema-publication provider when a Product schema change causes generated drift", async () => {
    const providerRoot = mkdtempSync(join(tmpdir(), "vibe-check-material-provider-"));
    try {
      for (const directory of ["docs", "scripts", "src"] as const) {
        cpSync(join(process.cwd(), directory), join(providerRoot, directory), { recursive: true });
      }
      symlinkSync(join(process.cwd(), "node_modules"), join(providerRoot, "node_modules"));
      initializeGitFixture(providerRoot);
      const copiedSchemaPath = join(providerRoot, "src", "machine-output", "v4", "schema.ts");
      const copiedSchema = readFileSync(copiedSchemaPath, "utf8");
      writeFileSync(
        copiedSchemaPath,
        copiedSchema.replace('title: "Vibe Check machine run v4"', 'title: "Drifted run schema"'),
        "utf8"
      );
      git(providerRoot, ["add", "src/machine-output/v4/schema.ts"]);
      git(providerRoot, ["commit", "--quiet", "-m", "schema source change"]);
      const loadedWorkflow: unknown = await import(
        pathToFileURL(
          join(providerRoot, "scripts", "validation", "repository-material", "workflow.ts")
        ).href
      );
      const validate = async (): Promise<MaterialValidationResult> => {
        if (!isNonArrayRecord(loadedWorkflow))
          throw new Error("copied material workflow is invalid");
        const provider = loadedWorkflow.validateRepositoryMaterialSchemaPublication;
        if (!isMaterialProvider(provider)) throw new Error("copied schema provider is invalid");
        const result: unknown = await provider();
        if (!isMaterialValidationResult(result))
          throw new Error("copied schema provider result is invalid");
        return result;
      };
      const definition = createProjectGateDefinition(
        defineProjectGateEntries([
          {
            check: createMaterialValidationCheck({
              checkId: "materials-schema-publication-validator",
              displayName: "Fixture schema publication validator",
              focusedCommand: "fixture schema publication",
              validate
            }),
            presets: ["materials"],
            required: true
          }
        ])
      );
      const result = await packageRun(definition, {
        flags: ["project-gate:required"],
        outputs: {
          diagnosticLogging: { enabled: false },
          machinePublication: { enabled: false },
          progressRendering: { enabled: false }
        },
        projectRoot: providerRoot
      });
      assert.equal(result.kind, "completed");
      if (result.kind !== "completed") return;
      assert.equal(result.aggregate, "failed");
      assert.deepEqual(result.snapshot.checks[0]?.outcome.status, "failed");
      assert.equal(result.snapshot.records.length, 1);
    } finally {
      rmSync(providerRoot, { force: true, recursive: true });
    }
  });

  it("keeps the product-runtime change region complete for the lane resolver", () => {
    const lanes = resolveProjectGateTestLanes(process.cwd());
    const allProductRuntimeFiles = Object.values(lanes)
      .flat()
      .filter((file) => file.startsWith("src/") && !file.startsWith("src/package-checks/"));
    assert.deepEqual(lanes.productRuntime, allProductRuntimeFiles);
    assert.equal(
      lanes.productRuntime.every((file) => file.startsWith("src/")),
      true
    );
    assert.equal(
      lanes.productRuntime.some((file) => file.startsWith("src/package-checks/")),
      false
    );
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
            execute: () => {
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
            execute: () => {
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
            execute: () => {
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
            execute: () => {
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
            execute: () => {
              calls.push("fixture-unselected");
              return { status: "passed", data: {} };
            }
          }),
          presets: ["materials"],
          required: false
        }
      ]);

      const result = await packageRun(createProjectGateDefinition(entries), {
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
            () => {
              controller.abort();
            }
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

function matchesFlagEnablement(
  enablement: CheckFlagEnablement | undefined,
  flags: ReadonlySet<string>
): boolean {
  if (enablement === undefined) return true;
  return matchesFlagCondition(enablement.when, flags);
}

function matchesFlagCondition(condition: CheckFlagCondition, flags: ReadonlySet<string>): boolean {
  if (typeof condition === "string") return flags.has(condition);
  switch (condition.kind) {
    case "all":
      return condition.conditions.every((child) => matchesFlagCondition(child, flags));
    case "any":
      return condition.conditions.some((child) => matchesFlagCondition(child, flags));
    case "none":
      return !condition.conditions.some((child) => matchesFlagCondition(child, flags));
    case "not-all":
      return !condition.conditions.every((child) => matchesFlagCondition(child, flags));
    case "exactly-one":
      return (
        condition.conditions.filter((child) => matchesFlagCondition(child, flags)).length === 1
      );
    case "not":
      return !matchesFlagCondition(condition.condition, flags);
  }
}

function gitFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "vibe-check-gate-changes-"));
  git(root, ["init", "--quiet"]);
  git(root, ["config", "user.email", "gate-changes@example.invalid"]);
  git(root, ["config", "user.name", "Gate changes Test"]);
  mkdirSync(join(root, "src"));
  mkdirSync(join(root, "docs"));
  writeFileSync(join(root, "NOTICE"), "Fixture notice\n", "utf8");
  writeFileSync(join(root, "docs", "guide.md"), "[target](../NOTICE)\n", "utf8");
  writeFileSync(join(root, "docs", "material.json"), "{}\n", "utf8");
  writeFileSync(join(root, "src", "runtime.ts"), "export const runtime = 1;\n", "utf8");
  initializeGitFixture(root);
  return root;
}

function initializeGitFixture(root: string): void {
  git(root, ["init", "--quiet"]);
  git(root, ["config", "user.email", "gate-changes@example.invalid"]);
  git(root, ["config", "user.name", "Gate changes Test"]);
  git(root, ["add", "."]);
  git(root, ["commit", "--quiet", "-m", "baseline"]);
  git(root, ["update-ref", "refs/remotes/origin/main", git(root, ["rev-parse", "HEAD"])]);
}

function applyRepositoryMaterialChange(
  root: string,
  change:
    | "commit"
    | "delete"
    | "none"
    | "outside"
    | "overlap"
    | "pnpm-lock"
    | "rename"
    | "staged"
    | "unstaged"
    | "untracked"
): void {
  const materialPath = join(root, "docs", "material.json");
  switch (change) {
    case "none":
      return;
    case "commit":
      writeFileSync(materialPath, '{"changed":true}\n', "utf8");
      git(root, ["add", "docs/material.json"]);
      git(root, ["commit", "--quiet", "-m", "material change"]);
      return;
    case "rename":
      git(root, ["mv", "docs/material.json", "docs/renamed-material.json"]);
      git(root, ["commit", "--quiet", "-m", "material rename"]);
      return;
    case "delete":
      rmSync(materialPath);
      git(root, ["add", "-A"]);
      git(root, ["commit", "--quiet", "-m", "material delete"]);
      return;
    case "staged":
      writeFileSync(materialPath, '{"staged":true}\n', "utf8");
      git(root, ["add", "docs/material.json"]);
      return;
    case "unstaged":
      writeFileSync(materialPath, '{"unstaged":true}\n', "utf8");
      return;
    case "untracked":
      writeFileSync(join(root, "docs", "untracked-material.json"), "{}\n", "utf8");
      return;
    case "pnpm-lock":
      writeFileSync(join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n", "utf8");
      git(root, ["add", "pnpm-lock.yaml"]);
      git(root, ["commit", "--quiet", "-m", "dependency lock change"]);
      return;
    case "outside":
      rmSync(join(root, "NOTICE"));
      git(root, ["add", "-A"]);
      git(root, ["commit", "--quiet", "-m", "linked target deletion"]);
      return;
    case "overlap":
      writeFileSync(join(root, "src", "runtime.ts"), "export const runtime = 2;\n", "utf8");
      git(root, ["add", "src/runtime.ts"]);
      git(root, ["commit", "--quiet", "-m", "runtime material overlap"]);
      return;
  }
}

function commitRuntimeChange(root: string): void {
  writeFileSync(join(root, "src", "runtime.ts"), "export const runtime = 2;\n", "utf8");
  git(root, ["add", "src/runtime.ts"]);
  git(root, ["commit", "--quiet", "-m", "runtime change"]);
}

function git(root: string, args: readonly string[]): string {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, `git ${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout.trim();
}

function isMaterialValidationResult(value: unknown): value is MaterialValidationResult {
  return (
    isNonArrayRecord(value) &&
    (value.status === "passed" || value.status === "failed") &&
    Array.isArray(value.diagnostics) &&
    value.diagnostics.every(
      (diagnostic) =>
        isNonArrayRecord(diagnostic) &&
        isNonArrayRecord(diagnostic.data) &&
        typeof diagnostic.id === "string" &&
        typeof diagnostic.presentation === "string"
    )
  );
}

function isMaterialProvider(value: unknown): value is () => Promise<unknown> {
  return typeof value === "function";
}

function expectedResourceClaimsFor(checkId: string): Readonly<Record<string, number>> | undefined {
  if (bunTestRunnerCheckIds.includes(checkId)) {
    return { "project-gate-bun-test-runners": 1 };
  }
  if (qualityCheckIds.has(checkId)) {
    return { "project-gate-repository-scans": 1 };
  }
  return undefined;
}

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

function oxlintOutput(code: string): string {
  return JSON.stringify({
    diagnostics: [
      {
        code,
        filename: "src/fixture.ts",
        help: "fixture help",
        labels: [{ span: { column: 2, length: 1, line: 3, offset: 0 } }],
        message: "fixture message",
        severity: "error",
        url: "https://example.test/rule"
      }
    ],
    number_of_files: 1,
    number_of_rules: 120,
    start_time: 1,
    threads_count: 1
  });
}

function ruleTestArtifactDirectory(root: string): string {
  return join(root, "checks", "test-evidence-rule-tests");
}
