import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { defineCheck, run as packageRun } from "@zxyycom/vibe-check";
import type { CheckFlagCondition, CheckFlagEnablement } from "@zxyycom/vibe-check";
import { isNonArrayRecord } from "../../value-guards.ts";
import type { TestEvidenceRuleTestInvocations } from "../../test-evidence/ast-grep/rule-tests.ts";
import { defineProjectGateEntries, type ProjectGateEntry } from "./runtime/entries.ts";
import { projectGateFlagControlledCheck } from "./runtime/eligibility.ts";
import {
  PROJECT_GATE_INCREMENTAL_CHANGE_REGIONS,
  PROJECT_GATE_SCOPES
} from "./runtime/change-regions.ts";
import {
  createScopedProjectGateSelection,
  selectionFlags,
  type ProjectGateSelection
} from "./runtime/controls.ts";
import {
  createLintProductCheck,
  createProjectGateDefinition,
  createProjectGateEntries,
  PROJECT_GATE_RUN_CONFIG
} from "./definition.ts";
import { createExternalConsumerMaterialLease } from "./checks/external-consumer-material.ts";
import { invokeCheck, invokeCheckWithRecords } from "./checks/check-execution.test-support.ts";
import { createOxlintFailureProjection } from "./checks/oxlint-failure-records.ts";
import { writeProcessTranscript } from "./checks/process/transcript.ts";
import {
  createTestEvidenceRuleTestsCheck,
  type TestEvidenceRuleTestsCheckDependencies
} from "./checks/test-evidence/ast-grep-rule-tests-check.ts";
import { resolveProjectGateTestLanes } from "./checks/test-execution/lanes.ts";

const preparedCandidate = Object.freeze({
  documentation: {
    documents: [],
    machineMaterials: [],
    expectedJSDocExamplePayloads: [],
    readme: ""
  },
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
  "tests-package-tooling",
  "acceptance-package-artifact",
  "acceptance-installed-package-types",
  "acceptance-installed-package-docs",
  "acceptance-installed-package-runtime",
  "tests-product-duplicate-detection",
  "tests-product-file-metrics",
  "tests-product-function-metrics",
  "tests-product-json",
  "tests-product-markdown",
  "tests-product-secret-detection",
  "tests-product-supporting-checks",
  "tests-product-core-and-tools",
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

const expectedRoutineCheckIds = expectedCheckIds.filter(
  (checkId) =>
    checkId !== "acceptance-installed-package-types" &&
    checkId !== "tests-scripts-admission-workbench"
);
const expectedReleaseCheckIds = expectedCheckIds.filter(
  (checkId) => checkId !== "tests-scripts-admission-workbench"
);

const qualityCheckIds: ReadonlySet<string> = new Set([
  "duplicate-detection",
  "file-metrics",
  "function-metrics",
  "markdown-lint",
  "markdown-link-validation"
]);
const bunTestRunnerCheckIds: readonly string[] = expectedCheckIds.filter(
  (checkId) => checkId.startsWith("tests-") || checkId.startsWith("acceptance-")
);

const packageAcceptanceCheckIds: ReadonlySet<string> = new Set([
  "prepared-external-package-consumer",
  "acceptance-package-artifact",
  "acceptance-installed-package-types",
  "acceptance-installed-package-docs",
  "acceptance-installed-package-runtime"
]);
const expectedFastCheckIds = [
  "typecheck-product",
  "lint-product",
  "typecheck-scripts",
  "lint-scripts",
  "format-check",
  "prepared-package-candidate",
  "tests-scripts-project-selection",
  "tests-scripts-package-tools-boundary",
  "markdown-lint",
  "markdown-link-validation",
  "materials-links-validator",
  "git-diff-whitespace"
];

const expectedCheckIdsBySelection: readonly Readonly<{
  readonly checkIds: readonly string[];
  readonly selection: ProjectGateSelection;
}>[] = [
  {
    checkIds: expectedFastCheckIds,
    selection: { kind: "fast" }
  },
  { checkIds: expectedRoutineCheckIds, selection: { kind: "changed" } },
  { checkIds: expectedRoutineCheckIds, selection: { kind: "all" } },
  {
    checkIds: [
      "typecheck-product",
      "lint-product",
      "typecheck-scripts",
      "lint-scripts",
      "format-check",
      "prepared-package-candidate",
      "tests-product-markdown",
      "tests-scripts-project-selection",
      "tests-scripts-package-tools-boundary",
      "duplicate-detection",
      "file-metrics",
      "function-metrics",
      "markdown-lint",
      "markdown-link-validation",
      "materials-json-validator",
      "materials-links-validator",
      "git-diff-whitespace"
    ],
    selection: createScopedProjectGateSelection(["material-json-input", "product-markdown-tests"])
  },
  { checkIds: expectedReleaseCheckIds, selection: { kind: "all", release: true } },
  {
    checkIds: ["acceptance-installed-package-types"],
    selection: { kind: "focused", presets: ["consumer-types"] }
  },
  {
    checkIds: ["tests-scripts-admission-workbench"],
    selection: { kind: "focused", presets: ["admission-workbench"] }
  },
  {
    checkIds: ["typecheck-product", "typecheck-scripts"],
    selection: { kind: "focused", presets: ["typecheck"] }
  },
  {
    checkIds: [
      "duplicate-detection",
      "file-metrics",
      "function-metrics",
      "markdown-lint",
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
      "tests-package-tooling",
      "tests-product-duplicate-detection",
      "tests-product-file-metrics",
      "tests-product-function-metrics",
      "tests-product-json",
      "tests-product-markdown",
      "tests-product-secret-detection",
      "tests-product-supporting-checks",
      "tests-product-core-and-tools",
      "tests-scripts-project",
      "tests-scripts-project-selection",
      "tests-scripts-test-evidence",
      "tests-scripts-layout",
      "tests-scripts-machine-artifacts",
      "tests-scripts-package-tools-boundary",
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
      documentationInput: {
        path: "/tmp/docs.json",
        sha256: "c".repeat(64),
        inputFingerprint: preparedCandidate.inputFingerprint
      },
      externalConsumerLease: createExternalConsumerMaterialLease(),
      preparedCandidate
    });
    const definition = createProjectGateDefinition(entries);

    for (const scope of PROJECT_GATE_SCOPES) {
      assert.ok(
        entries.some(
          ({ changeRegion, scopes }) => changeRegion === scope || scopes?.includes(scope) === true
        ),
        `Scope has no member: ${scope}`
      );
    }
    const scopedEntries = createProjectGateEntries(
      {
        documentationInput: {
          path: "/tmp/docs.json",
          sha256: "c".repeat(64),
          inputFingerprint: preparedCandidate.inputFingerprint
        },
        externalConsumerLease: createExternalConsumerMaterialLease(),
        preparedCandidate
      },
      createScopedProjectGateSelection(["product-markdown-tests"])
    );
    const metric = scopedEntries.find(({ check }) => check.checkId === "file-metrics")?.check;
    assert.ok(metric !== undefined && "options" in metric);
    assert.ok(isNonArrayRecord(metric.options));
    const areas = metric.options.codeAreas;
    assert.ok(isNonArrayRecord(areas) && isNonArrayRecord(areas["product-source"]));
    const scopedFiles = areas["product-source"].files;
    assert.ok(isNonArrayRecord(scopedFiles) && Array.isArray(scopedFiles.patterns));
    assert.ok(scopedFiles.patterns.length > 0);
    assert.equal(
      scopedFiles.patterns.every(
        (path: unknown) =>
          typeof path === "string" &&
          (path.startsWith("src/package-checks/markdown-lint/") ||
            path.startsWith("src/package-checks/markdown-link-validation/"))
      ),
      true
    );

    assert.deepEqual(
      new Set(entries.filter(({ fast }) => fast !== false).map(({ check }) => check.checkId)),
      new Set(expectedFastCheckIds)
    );
    for (const entry of entries) {
      assert.deepEqual(
        Object.keys(entry).sort(),
        [
          "check",
          ...(entry.changeRegion === undefined ? [] : ["changeRegion"]),
          ...(entry.scopes === undefined ? [] : ["scopes"]),
          "fast",
          "presets",
          ...(entry.selectionPolicy === undefined ? [] : ["selectionPolicy"])
        ].sort()
      );
    }
    assert.deepEqual(
      definition.checks.map(({ checkId }) => checkId),
      expectedCheckIds
    );
    assert.deepEqual(definition.outputs, {
      diagnosticLogging: { directory: ".log/vibe-check", enabled: false },
      machinePublication: { directory: "artifacts/vibe-check", enabled: false },
      progressRendering: {
        enabled: true,
        flagMismatchPreviewLimit: 0,
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
    assert.deepEqual(
      definition.checks
        .filter(
          ({ mutex }) => Array.isArray(mutex) && mutex.includes("project-gate-type-aware-lint")
        )
        .map(({ checkId }) => checkId),
      ["lint-product", "lint-scripts"]
    );
    for (const checkId of ["lint-product", "lint-scripts"]) {
      const check = definition.checks.find(({ checkId: candidateId }) => candidateId === checkId);
      assert.deepEqual(check?.mutex, ["project-gate-type-aware-lint"]);
      assert.deepEqual(check?.dependsOn ?? [], []);
    }
    assert.deepEqual(PROJECT_GATE_RUN_CONFIG.selection, {
      complete: "all",
      changed: "changed",
      default: "fast",
      presets: [
        "admission-workbench",
        "consumer-types",
        "materials",
        "lint",
        "quality",
        "test",
        "typecheck"
      ]
    });
    assert.equal(Object.hasOwn(definition, "policies"), false);
    assert.equal(Object.hasOwn(definition, "selectedPolicy"), false);
    assert.deepEqual(definition.changes, {
      source: { compareWith: "HEAD~1" },
      flags: PROJECT_GATE_INCREMENTAL_CHANGE_REGIONS
    });

    const nativeMaterialCheck = definition.checks.find(
      ({ checkId }) => checkId === "materials-json-validator"
    );
    assert.deepEqual(nativeMaterialCheck?.options, {
      files: { patterns: ["docs/**/*.json"], useDefaultExcludes: true },
      maximumBytes: 2097152
    });
    assert.equal(
      definition.checks.find(({ checkId }) => checkId === "markdown-link-validation")?.displayName,
      "Repository scan: Markdown links"
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
      "tests-scripts-machine-artifacts",
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
      assert.equal(entry?.fast, checkId.startsWith("markdown-") ? "always" : false);
      assert.equal(entry?.presets.includes("quality"), true);
    }
    const qualityEntry = entries.find(({ check }) => check.checkId === "duplicate-detection");
    assert.ok(qualityEntry);
    assert.equal(qualityEntry.changeRegion, "duplicate-input");
    assert.equal(
      matchesFlagEnablement(
        projectGateFlagControlledCheck(qualityEntry).enabledByFlags,
        new Set(["project-gate:changed", "vibe-check:change:duplicate-input"])
      ),
      true
    );
    assert.equal(
      matchesFlagEnablement(
        projectGateFlagControlledCheck(qualityEntry).enabledByFlags,
        new Set(["project-gate:fast", "vibe-check:change:duplicate-input"])
      ),
      false
    );

    const expectedTestLanes = resolveProjectGateTestLanes(process.cwd());
    for (const [checkId, files] of [
      ["tests-product-duplicate-detection", expectedTestLanes.productDuplicateDetection],
      ["tests-product-file-metrics", expectedTestLanes.productFileMetrics],
      ["tests-product-function-metrics", expectedTestLanes.productFunctionMetrics],
      ["tests-product-json", expectedTestLanes.productJsonChecks],
      ["tests-product-markdown", expectedTestLanes.productMarkdown],
      ["tests-product-secret-detection", expectedTestLanes.productSecretDetection],
      ["tests-product-supporting-checks", expectedTestLanes.productSupportingChecks],
      ["tests-product-core-and-tools", expectedTestLanes.productCoreAndTools],
      ["tests-scripts-admission-workbench", expectedTestLanes.scriptsAdmissionWorkbench],
      ["tests-scripts-project", expectedTestLanes.scriptsProject],
      ["tests-scripts-project-selection", expectedTestLanes.scriptsProjectSelection],
      ["tests-scripts-test-evidence", expectedTestLanes.scriptsTestEvidence],
      ["tests-scripts-layout", expectedTestLanes.scriptsLayout],
      ["tests-scripts-machine-artifacts", expectedTestLanes.scriptsMachineArtifacts],
      ["tests-scripts-package-tools-boundary", expectedTestLanes.scriptsPackageToolsBoundary],
      ["tests-scripts-validation", expectedTestLanes.scriptsValidation],
      ["tests-scripts-tooling", expectedTestLanes.scriptsTooling],
      ["tests-package-tooling", expectedTestLanes.packageTooling],
      ["acceptance-package-artifact", expectedTestLanes.packageArtifact],
      ["acceptance-installed-package-types", expectedTestLanes.packageConsumerTypes],
      ["acceptance-installed-package-docs", expectedTestLanes.packageConsumerDocs],
      ["acceptance-installed-package-runtime", expectedTestLanes.packageConsumerRuntime]
    ] as const) {
      const entry = entries.find(({ check }) => check.checkId === checkId);
      assert.ok(entry, `${checkId} must exist`);
      assert.ok(isNonArrayRecord(entry.check.options));
      assert.equal(entry.check.options.executable, process.execPath);
      assert.deepEqual(entry.check.options.arguments, [
        "test",
        ...files,
        "--reporter=dots",
        ...(["tests-scripts-project", "tests-scripts-project-selection"].includes(checkId)
          ? ["--timeout=15000"]
          : [])
      ]);
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
      entries.find(({ check }) => check.checkId === "acceptance-package-artifact")?.check.mutex,
      undefined
    );
    const preparedCandidateEntry = entries.find(
      ({ check }) => check.checkId === "prepared-package-candidate"
    );
    const externalConsumerProviderEntry = entries.find(
      ({ check }) => check.checkId === "prepared-external-package-consumer"
    );
    const packageArtifactEntry = entries.find(
      ({ check }) => check.checkId === "acceptance-package-artifact"
    );
    assert.deepEqual(packageArtifactEntry?.check.dependsOn, ["prepared-package-candidate"]);
    assert.deepEqual(externalConsumerProviderEntry?.check.dependsOn, [
      "prepared-package-candidate"
    ]);
    for (const checkId of [
      "acceptance-installed-package-types",
      "acceptance-installed-package-docs",
      "acceptance-installed-package-runtime"
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
        { check: prerequisite, presets: [], fast: false },
        { check: dependent, presets: [], fast: true }
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
          { check: prerequisite, presets: [], fast: true },
          { check: observer, presets: ["materials"], fast: true }
        ]),
      /observes relation is not preset-selection closed: fixture-observer -> fixture-prerequisite/
    );
    assert.doesNotThrow(() =>
      defineProjectGateEntries([
        { check: prerequisite, presets: [], fast: true },
        { check: dependent, presets: ["test"], fast: true }
      ])
    );
    for (const [observerPolicy, observedPolicy, allowed] of [
      ["routine", "routine", true],
      ["routine", "release-only", false],
      ["routine", "explicit-only", false],
      ["release-only", "routine", true],
      ["release-only", "release-only", true],
      ["release-only", "explicit-only", false],
      ["explicit-only", "routine", true],
      ["explicit-only", "release-only", true],
      ["explicit-only", "explicit-only", true]
    ] as const) {
      const validateRelation = () =>
        defineProjectGateEntries([
          {
            check: prerequisite,
            presets: ["consumer-types"],
            fast: false,
            selectionPolicy: observedPolicy
          },
          {
            check: observer,
            presets: ["consumer-types"],
            fast: false,
            selectionPolicy: observerPolicy
          }
        ]);
      if (allowed) assert.doesNotThrow(validateRelation);
      else assert.throws(validateRelation, /not selection-policy closed/);
    }
    for (const selectionPolicy of ["release-only", "explicit-only"] as const) {
      assert.throws(
        () =>
          defineProjectGateEntries([
            { check: prerequisite, presets: ["consumer-types"], fast: true, selectionPolicy }
          ]),
        /non-routine entry has routine selection metadata/
      );
    }
    assert.throws(
      () =>
        defineProjectGateEntries([
          { check: prerequisite, presets: [], fast: false, selectionPolicy: "explicit-only" }
        ]),
      /explicit entry has no preset/
    );
    const invalidPolicy: ProjectGateEntry = { check: prerequisite, presets: [], fast: false };
    Object.defineProperty(invalidPolicy, "selectionPolicy", { value: "unknown" });
    assert.throws(() => defineProjectGateEntries([invalidPolicy]), /selection policy is invalid/);
    const selfDependent = defineCheck({
      checkId: "fixture-self-dependent",
      dependsOn: ["fixture-self-dependent"],
      displayName: "Fixture self-dependent"
    });
    assert.throws(
      () => defineProjectGateEntries([{ check: selfDependent, presets: [], fast: true }]),
      /cannot depend on itself: fixture-self-dependent/
    );
    const selfObserver = defineCheck({
      checkId: "fixture-self-observer",
      displayName: "Fixture self observer",
      observes: ["fixture-self-observer"]
    });
    assert.throws(
      () => defineProjectGateEntries([{ check: selfObserver, presets: [], fast: true }]),
      /cannot observe itself: fixture-self-observer/
    );
    const existingFlagControl = defineCheck({
      checkId: "fixture-existing-flag-control",
      displayName: "Fixture existing flag control",
      enabledByFlags: { when: "fixture" }
    });
    assert.throws(
      () => defineProjectGateEntries([{ check: existingFlagControl, presets: [], fast: true }]),
      /already owns enabledByFlags: fixture-existing-flag-control/
    );
    const invalidFast: ProjectGateEntry = {
      check: prerequisite,
      presets: [],
      fast: true
    };
    Object.defineProperty(invalidFast, "fast", { value: "true" });
    assert.throws(
      () => defineProjectGateEntries([invalidFast]),
      /fast marker is invalid: fixture-prerequisite/
    );
    const invalidPresets: ProjectGateEntry = {
      check: prerequisite,
      presets: [],
      fast: true
    };
    Object.defineProperty(invalidPresets, "presets", { value: "test" });
    assert.throws(
      () => defineProjectGateEntries([invalidPresets]),
      /presets are not an exact collection: fixture-prerequisite/
    );
    for (const changeRegion of [123, null, "", { toString: () => "product-source" }]) {
      const invalidRegion: ProjectGateEntry = { check: prerequisite, presets: [], fast: true };
      Object.defineProperty(invalidRegion, "changeRegion", { value: changeRegion });
      assert.throws(() => defineProjectGateEntries([invalidRegion]), /change region is invalid/);
    }
    for (const scopes of [
      ["missing-scope"],
      ["product-source", "product-source"],
      "product-source"
    ]) {
      const invalidScope: ProjectGateEntry = { check: prerequisite, presets: [], fast: false };
      Object.defineProperty(invalidScope, "scopes", { value: scopes });
      assert.throws(() => defineProjectGateEntries([invalidScope]), /scopes are invalid/);
    }
    assert.throws(
      () =>
        defineProjectGateEntries([
          { check: prerequisite, presets: [], fast: true, changeRegion: "product-source" },
          { check: observer, presets: [], fast: "always" }
        ]),
      /not baseline-selection closed/
    );
    assert.throws(
      () =>
        defineProjectGateEntries([
          { check: prerequisite, presets: [], fast: false },
          { check: observer, presets: [], fast: false, scopes: ["product-source"] }
        ]),
      /not domain-selection closed/
    );
    assert.doesNotThrow(() =>
      defineProjectGateEntries([
        { check: prerequisite, presets: [], fast: true },
        { check: observer, presets: [], fast: "always", scopes: ["documentation"] }
      ])
    );
    assert.throws(
      () =>
        defineProjectGateEntries([
          { check: prerequisite, presets: [], fast: false },
          { check: observer, presets: [], fast: true }
        ]),
      /observes relation is not fast-selection closed/
    );
    assert.throws(
      () =>
        defineProjectGateEntries([
          { check: prerequisite, presets: [], fast: true, changeRegion: "product-source" },
          { check: observer, presets: [], fast: true, changeRegion: "script-source" }
        ]),
      /observes relation is not changed-selection closed/
    );
    assert.throws(
      () =>
        defineProjectGateEntries([
          { check: prerequisite, presets: [], fast: false },
          { check: observer, presets: [], fast: false, changeRegion: "product-source" }
        ]),
      /observes relation is not scope-selection closed/
    );
    assert.doesNotThrow(() =>
      defineProjectGateEntries([
        { check: prerequisite, presets: [], fast: true },
        { check: observer, presets: [], fast: false, changeRegion: "product-source" }
      ])
    );
    assert.throws(
      () =>
        createProjectGateDefinition([
          { check: prerequisite, presets: [], fast: true, changeRegion: "missing-region" }
        ]),
      /unknown change region/
    );
    const missingDependency = defineCheck({
      checkId: "fixture-missing-dependency",
      dependsOn: ["fixture-absent"],
      displayName: "Fixture missing dependency"
    });
    assert.throws(
      () => defineProjectGateEntries([{ check: missingDependency, presets: [], fast: true }]),
      /dependsOn relation is missing: fixture-missing-dependency -> fixture-absent/
    );
    const missingObservation = defineCheck({
      checkId: "fixture-missing-observation",
      displayName: "Fixture missing observation",
      observes: ["fixture-absent"]
    });
    assert.throws(
      () => defineProjectGateEntries([{ check: missingObservation, presets: [], fast: true }]),
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

  it("keeps fast, changed, all, and focused membership golden while aggregation uses Product selection", async () => {
    const entries = createProjectGateEntries({
      documentationInput: {
        path: "/tmp/docs.json",
        sha256: "c".repeat(64),
        inputFingerprint: preparedCandidate.inputFingerprint
      },
      externalConsumerLease: createExternalConsumerMaterialLease(),
      preparedCandidate
    });
    const definition = createProjectGateDefinition(entries);
    assert.equal("aggregation" in PROJECT_GATE_RUN_CONFIG, false);
    const allChangeFlags = Object.keys(PROJECT_GATE_INCREMENTAL_CHANGE_REGIONS).map(
      (flag) => `vibe-check:change:${flag}`
    );
    for (const expectation of expectedCheckIdsBySelection) {
      const flags = new Set([
        ...selectionFlags(expectation.selection),
        ...(["fast", "changed", "scoped"].includes(expectation.selection.kind)
          ? allChangeFlags
          : [])
      ]);
      assert.deepEqual(
        definition.checks
          .filter((check) => matchesFlagEnablement(check.enabledByFlags, flags))
          .map(({ checkId }) => checkId),
        expectation.checkIds,
        expectation.selection.kind
      );
    }
    for (const [scope, added] of [
      ["documentation", ["file-metrics"]],
      [
        "material-schema-input",
        ["duplicate-detection", "file-metrics", "materials-schema-validator"]
      ],
      ["material-examples-input", ["materials-examples-validator"]],
      ["any-change", []]
    ] as const) {
      const flags = new Set([
        ...allChangeFlags,
        ...selectionFlags(createScopedProjectGateSelection([scope]))
      ]);
      const expected = new Set<string>([...expectedFastCheckIds, ...added]);
      assert.deepEqual(
        definition.checks
          .filter((check) => matchesFlagEnablement(check.enabledByFlags, flags))
          .map(({ checkId }) => checkId),
        expectedCheckIds.filter((checkId) => expected.has(checkId)),
        scope
      );
    }
    for (const kind of ["fast", "changed"] as const) {
      const flags = new Set(selectionFlags({ kind }));
      assert.deepEqual(
        definition.checks
          .filter((check) => matchesFlagEnablement(check.enabledByFlags, flags))
          .map(({ checkId }) => checkId),
        [
          "prepared-package-candidate",
          ...(kind === "fast"
            ? ["markdown-lint", "markdown-link-validation", "materials-links-validator"]
            : []),
          "git-diff-whitespace"
        ]
      );
    }
    // Unclassified roots cannot silently skip slow behavior or package acceptance.
    assert.deepEqual(
      definition.checks
        .filter((check) =>
          matchesFlagEnablement(
            check.enabledByFlags,
            new Set(["project-gate:changed", "vibe-check:change:unclassified-input"])
          )
        )
        .map(({ checkId }) => checkId),
      expectedRoutineCheckIds
    );
    for (const check of definition.checks)
      assert.equal(check.enabledByFlags?.propagateDependsOn, true);
    for (const checkId of packageAcceptanceCheckIds) {
      const entry = entries.find(({ check }) => check.checkId === checkId);
      assert.ok(entry);
      assert.equal(entry.fast, false);
      const releaseOnly = checkId === "acceptance-installed-package-types";
      assert.equal(entry.changeRegion, releaseOnly ? undefined : "package-tests");
      assert.deepEqual(entry.presets, releaseOnly ? ["consumer-types"] : []);
      assert.equal(
        matchesFlagEnablement(
          projectGateFlagControlledCheck(entry).enabledByFlags,
          new Set(["project-gate:changed", "vibe-check:change:package-tests"])
        ),
        !releaseOnly
      );
    }
    // Real Product fallback injects every declared region when Git evidence is unavailable.
    // Keep the exact manifest identities/selection metadata, replacing only execution work.
    const projectRoot = mkdtempSync(join(tmpdir(), "vibe-check-gate-no-git-"));
    try {
      const calls: string[] = [];
      const fixtureEntries = entries.map((entry) => ({
        ...entry,
        check: defineCheck({
          checkId: entry.check.checkId,
          displayName: entry.check.displayName,
          execute: () => {
            calls.push(entry.check.checkId);
            return { status: "passed", data: {} };
          }
        })
      }));
      const result = await packageRun(createProjectGateDefinition(fixtureEntries), {
        flags: selectionFlags({ kind: "changed" }),
        projectRoot,
        outputs: {
          diagnosticLogging: { enabled: false },
          machinePublication: { enabled: false },
          progressRendering: { enabled: false }
        }
      });
      assert.equal(result.kind, "completed");
      if (result.kind !== "completed") return;
      assert.equal(result.aggregate, "passed");
      assert.deepEqual([...calls].sort(), [...expectedRoutineCheckIds].sort());
      const dependencyEntries = fixtureEntries.map((entry, index) => ({
        ...entry,
        check: defineCheck({
          checkId: entry.check.checkId,
          displayName: entry.check.displayName,
          dependsOn: entries[index]?.check.dependsOn ?? [],
          execute: () => {
            calls.push(entry.check.checkId);
            return { status: "passed", data: {} };
          }
        })
      }));
      for (const [preset, expected] of [
        [
          "consumer-types",
          [
            "prepared-package-candidate",
            "prepared-external-package-consumer",
            "acceptance-installed-package-types"
          ]
        ],
        ["admission-workbench", ["tests-scripts-admission-workbench"]]
      ] as const) {
        calls.length = 0;
        const focusedResult = await packageRun(createProjectGateDefinition(dependencyEntries), {
          flags: selectionFlags({ kind: "focused", presets: [preset] }),
          projectRoot,
          outputs: {
            diagnosticLogging: { enabled: false },
            machinePublication: { enabled: false },
            progressRendering: { enabled: false }
          }
        });
        assert.equal(focusedResult.kind, "completed");
        if (focusedResult.kind === "completed") assert.equal(focusedResult.aggregate, "passed");
        assert.deepEqual([...calls].sort(), [...expected].sort(), preset);
      }
    } finally {
      rmSync(projectRoot, { force: true, recursive: true });
    }
  });

  it("adds routine scopes to fast without selecting unrelated slow work", () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), "vibe-check-gate-scopes-"));
    try {
      const projectRoot = join(fixtureRoot, "project");
      mkdirSync(projectRoot);
      const configPath = join(fixtureRoot, "gitconfig");
      writeFileSync(configPath, "");
      const fixtureEnvironment = Object.fromEntries(
        Object.entries(process.env).filter(([name]) => !name.startsWith("GIT_"))
      );
      // Isolate setup writes and Product Git reads without mutating the test process environment.
      const result = spawnSync(
        process.execPath,
        [
          fileURLToPath(new URL("./runtime/scoped-selection.test-support.ts", import.meta.url)),
          projectRoot
        ],
        {
          cwd: projectRoot,
          encoding: "utf8",
          env: {
            ...fixtureEnvironment,
            GIT_CONFIG_GLOBAL: configPath,
            GIT_CONFIG_NOSYSTEM: "1",
            GIT_CEILING_DIRECTORIES: fixtureRoot
          },
          timeout: 10000
        }
      );
      assert.equal(
        result.status,
        0,
        JSON.stringify({
          status: result.status,
          signal: result.signal,
          error: result.error?.message ?? null,
          stderr: result.stderr
        })
      );
      assert.equal(result.stdout.trim(), "scoped-selection-fixture-passed");
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
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
            execute: () => {
              calls.push("fixture-required");
              return { status: "passed", data: {} };
            }
          }),
          presets: [],
          fast: true
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
          fast: false
        }
      ]);

      for (const scenario of [
        {
          disabledCheckId: "fixture-quality",
          selectedCheckId: "fixture-required",
          selection: { kind: "fast" as const }
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
          fast: false
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
          fast: false
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
          fast: false
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
