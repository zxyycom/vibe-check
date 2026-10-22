// Change-local experiment, not a Project Gate entry. Retain with this Change's evidence until closeout.
// Raw artifacts live under .log/gate-test-work/; rerunning a stage replaces its measurement JSON.
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { cpus, loadavg } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import micromatch from "micromatch";

const changeDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(changeDirectory, "../..");
const [stage, scope = "both"] = process.argv.slice(2);
assert.ok(["before", "after"].includes(stage), "Expected stage: before | after");
assert.ok(
  ["both", "package", "selection"].includes(scope),
  "Expected scope: both | package | selection"
);
const { preparePackageCandidate } = await import("../../scripts/package/candidate/prepare.ts");
const candidate = await preparePackageCandidate();
const candidateEntryPath = candidate.resolvedEntryPath;
const productApi = await import(candidateEntryPath);
const projectGate = await import("../../scripts/project/gate/definition.ts");
const boundRun = await import("../../scripts/project/gate/runtime/bound-run.ts");
assert.equal(boundRun.resolvedEntryPath, candidateEntryPath);
const eligibility = await import("../../scripts/project/gate/runtime/eligibility.ts");
const { createExternalConsumerMaterialLease } =
  await import("../../scripts/project/gate/checks/external-consumer-material.ts");
const baselinePolicyPath = join(changeDirectory, "before-policy.json");
if (stage === "before" && scope !== "package") {
  writeFileSync(
    baselinePolicyPath,
    JSON.stringify(eligibility.PROJECT_GATE_INCREMENTAL_CHANGE_REGIONS, null, 2) + "\n"
  );
}
const reportPath = join(changeDirectory, `${stage}-measurements.json`);
const measurementReport = {
  stage,
  formedAt: new Date().toISOString(),
  environment: {
    bun: Bun.version,
    platform: process.platform,
    arch: process.arch,
    cpus: cpus().length
  },
  candidate: candidate.candidateVersion,
  note: "Selection samples execute existing Gate Checks through the exact candidate public API. Fixed changed paths, default static admission, maxParallel=3 and unchanged named budgets; no Git acquisition, preparation, adapter or contributor timing.",
  package: [],
  selection: []
};
function saveReport() {
  writeFileSync(reportPath, JSON.stringify(measurementReport, null, 2) + "\n");
}

function conditionMatches(condition, flags) {
  if (typeof condition === "string") return flags.has(condition);
  if (condition.kind === "any") {
    return condition.conditions.some((childCondition) => conditionMatches(childCondition, flags));
  }
  if (condition.kind === "all")
    return condition.conditions.every((childCondition) => conditionMatches(childCondition, flags));
  throw new Error(`Unexpected Gate condition: ${condition.kind}`);
}

function selectedCheckIds({ entries, regions, changedPaths }) {
  const flags = new Set(["project-gate:required"]);
  for (const [regionId, region] of Object.entries(regions)) {
    const matchingPaths = micromatch(changedPaths, region.patterns, {
      dot: true,
      posix: true,
      strictSlashes: false
    });
    if (matchingPaths.length > 0) {
      flags.add(productApi.changeFlag(regionId));
    }
  }
  return entries
    .filter((entry) =>
      conditionMatches(eligibility.projectGateFlagControlledCheck(entry).enabledByFlags.when, flags)
    )
    .map((entry) => entry.check.checkId);
}

if (scope !== "selection") {
  for (let round = 0; round < 6; round++) {
    const startedAtMs = performance.now();
    const child = Bun.spawn(
      [
        process.execPath,
        "test",
        "scripts/package/artifact/manifest.test.ts",
        "scripts/package/compiler-toolchain.test.ts"
      ],
      { cwd: repositoryRoot, stdout: "pipe", stderr: "pipe" }
    );
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited
    ]);
    assert.equal(exitCode, 0, stdout + stderr);
    const sample = {
      round,
      warmup: round === 0,
      wallMs: performance.now() - startedAtMs,
      tests: stderr.split("\n").filter((line) => line.startsWith("(pass)"))
    };
    measurementReport.package.push(sample);
    saveReport();
    console.log(JSON.stringify({ stage, scope: "package", ...sample }));
  }
}
if (scope !== "package") {
  const regions = eligibility.PROJECT_GATE_INCREMENTAL_CHANGE_REGIONS;
  const baselineRegions = JSON.parse(readFileSync(baselinePolicyPath, "utf8"));
  const changedPaths = ["src/package-checks/host-environment/process/runner.test.ts"];
  const artifactRoot = join(repositoryRoot, ".log/gate-test-work", randomUUID());
  mkdirSync(artifactRoot, { recursive: true });
  const sourceIdentityPaths = [
    "scripts/package/artifact/manifest.test.ts",
    "scripts/package/compiler-toolchain.test.ts",
    "scripts/project/gate/runtime/product-test-regions.ts",
    "scripts/project/gate/runtime/eligibility.ts"
  ];
  measurementReport.sourceDigests = Object.fromEntries(
    sourceIdentityPaths.map((path) => [
      path,
      createHash("sha256")
        .update(readFileSync(join(repositoryRoot, path)))
        .digest("hex")
    ])
  );
  for (let round = 0; round < 4; round++) {
    const lease = createExternalConsumerMaterialLease();
    try {
      const entries = projectGate.createProjectGateEntries({
        externalConsumerLease: lease,
        preparedCandidate: candidate
      });
      const selected = selectedCheckIds({ entries, regions, changedPaths });
      const selectedIds = new Set(selected);
      const directory = join(artifactRoot, String(round));
      mkdirSync(directory);
      // Preserve each Check, dependency, mutex and resource claim; only freeze its selected presence.
      const checks = entries.map((entry) => ({
        ...entry.check,
        enabledByFlags: {
          when: selectedIds.has(entry.check.checkId)
            ? "benchmark:selected"
            : "benchmark:not-selected",
          propagateDependsOn: true
        }
      }));
      const { admissionPolicy: ignoredAdmissionPolicy, ...scheduler } =
        projectGate.PROJECT_GATE_RUN_CONFIG.scheduler;
      const definition = productApi.defineConfig({
        checks,
        scheduler,
        outputs: {
          ...projectGate.PROJECT_GATE_RUN_CONFIG.definitionOutputs,
          progressRendering: { enabled: false }
        }
      });
      const loadBefore = loadavg();
      const startedAtMs = performance.now();
      const runResult = await productApi.run(definition, {
        ...projectGate.projectGateInvocationOutputControls(directory),
        projectRoot: repositoryRoot,
        flags: ["project-gate:required", "benchmark:selected"]
      });
      assert.equal(runResult.kind, "completed");
      const unexpectedChecks = runResult.snapshot.checks.filter((check) => {
        const isPassed = check.outcome.status === "passed";
        const isUnselected =
          check.outcome.status === "not-applicable" &&
          check.outcome.reason.code === "flag-condition-not-matched";
        return !isPassed && !isUnselected;
      });
      assert.deepEqual(unexpectedChecks, []);
      const sample = {
        round,
        warmup: round === 0,
        paths: changedPaths,
        selected,
        baselineSelected: selectedCheckIds({ entries, regions: baselineRegions, changedPaths }),
        wallMs: performance.now() - startedAtMs,
        loadBefore,
        loadAfter: loadavg(),
        directory,
        checkDurations: runResult.checkDurations
      };
      measurementReport.selection.push(sample);
      saveReport();
      console.log(
        JSON.stringify({
          stage,
          scope: "selection",
          round,
          selected: selected.length,
          wallMs: sample.wallMs,
          directory
        })
      );
    } finally {
      lease.cleanup();
    }
  }
}
saveReport();
