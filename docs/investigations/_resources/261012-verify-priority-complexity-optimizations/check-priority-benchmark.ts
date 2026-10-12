/** Investigation-only public workload wall observations for K01/K05/K06.
 * Fixture creation, root import, Check/Definition construction, assertions and
 * digest are outside timers. No intrinsic instrumentation or Git tracing here.
 * This review revision does not replace the script identity of historical samples.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ProjectDefinition, RunResult } from "../../../../src/index.ts";
import {
  argument,
  positiveIntegerArgument,
  parseWorkload,
  ownedFixtureRoot,
  loadBenchmarkApi,
  readFixtureManifest,
  fixtureFor,
  type BenchmarkFixture
} from "./benchmark-boundaries.ts";

const workload = parseWorkload(argument({ name: "--workload", fallback: "" }));
const size = positiveIntegerArgument({ name: "--size", fallback: 1 });
const warmups = positiveIntegerArgument({ name: "--warmups", fallback: 3 });
const sampleCount = positiveIntegerArgument({ name: "--samples", fallback: 9 });
const iterations = positiveIntegerArgument({ name: "--iterations", fallback: 1 });
const repositoryRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const sourceRoot = resolve(argument({ name: "--source-root", fallback: repositoryRoot }));
const fixtureRoot = ownedFixtureRoot(argument({ name: "--fixture-root", fallback: "" }));

// Isolate real Git from caller config, tracing, identity and interaction before import/work.
for (const key of Object.keys(process.env)) {
  if (key.startsWith("GIT_")) delete process.env[key];
}
Object.assign(process.env, {
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_CONFIG_SYSTEM: "/dev/null",
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_TERMINAL_PROMPT: "0",
  LC_ALL: "C"
});
const api = await loadBenchmarkApi(sourceRoot);
const fixtureManifestPath = resolve(fixtureRoot, "manifest.json");
const fixture = fixtureFor({ fixtures: readFixtureManifest(fixtureManifestPath), workload, size });
const projectRoot = resolve(fixtureRoot, fixture.directory);
const ids = Array.from({ length: size }, (_, index) => `f-${String(index).padStart(6, "0")}.ts`);
const collectionOptions = { projectRoot, selection: { patterns: ids, useDefaultExcludes: false } };
const prepared = prepareWorkload(fixture);
let semanticDigest: string | undefined;

function prepareWorkload(selectedFixture: BenchmarkFixture) {
  switch (selectedFixture.workload) {
    case "directory":
      return { kind: "directory" as const };
    case "anchors": {
      const check = api.markdownLinkValidation({
        files: { patterns: ["a.md"] },
        cache: { enabled: false }
      });
      return { kind: "anchors" as const, check, definition: definitionFor(check) };
    }
    case "reminders": {
      const check = api.maintenanceReminders(
        Array.from({ length: selectedFixture.reminderCount }, (_, index) => ({
          id: `review-${index}`,
          baseCommit: selectedFixture.baseCommit,
          limits: { commits: size + 1, changedLines: size + 1 },
          message: "Fixture maintenance review",
          mode: "enforcing"
        }))
      );
      return {
        kind: "reminders" as const,
        check,
        fixture: selectedFixture,
        definition: definitionFor(check)
      };
    }
  }
}

/** Every Check workload uses one root slot and disables all output participants. */
function definitionFor(check: ProjectDefinition["checks"][number]): ProjectDefinition {
  return api.defineConfig({
    checks: [check],
    scheduler: { maxParallel: 1 },
    outputs: {
      machinePublication: { enabled: false },
      progressRendering: { enabled: false },
      diagnosticLogging: { enabled: false }
    }
  });
}

function successfulCheckFacts(result: RunResult) {
  if (result.kind !== "completed" || result.aggregate !== "passed") {
    throw new Error(`Unexpected Check result: ${result.kind}`);
  }
  const check = result.snapshot.checks[0];
  if (
    result.snapshot.checks.length !== 1 ||
    check?.outcome.status !== "passed" ||
    result.snapshot.records.length !== 0 ||
    result.checkMessages.length !== 0 ||
    result.definitionWarnings.length !== 0
  ) {
    throw new Error("Unexpected Check facts/messages/warnings");
  }
  const outputs = [
    result.outputs.machinePublication,
    result.outputs.progressRendering,
    result.outputs.diagnosticLogging,
    result.outputs.terminalEffects
  ];
  if (outputs.some((output) => output.enabled || output.status !== "disabled")) {
    throw new Error("Run output participant enabled");
  }
  return { data: check.outcome.data, snapshot: result.snapshot };
}

function retainSemanticDigest(semantic: unknown): void {
  const digest = createHash("sha256").update(JSON.stringify(semantic)).digest("hex");
  if (semanticDigest !== undefined && digest !== semanticDigest) throw new Error("Facts drift");
  semanticDigest = digest;
}

async function measuredOperation(): Promise<number> {
  let wallMs: number;
  if (prepared.kind === "directory") {
    const started = performance.now();
    const result = api.collectProjectFiles(collectionOptions);
    wallMs = performance.now() - started;
    if (!Object.isFrozen(result) || JSON.stringify(result) !== JSON.stringify(ids)) {
      throw new Error("Collection not exact frozen canonical file set");
    }
    retainSemanticDigest(result);
  } else {
    const started = performance.now();
    const result = await api.run(prepared.definition, { projectRoot });
    wallMs = performance.now() - started;
    const facts = successfulCheckFacts(result);
    if (prepared.kind === "anchors") {
      const data = prepared.check.parseData(facts.data);
      if (
        data.sourceFileCount !== 1 ||
        data.occurrenceCount !== size ||
        data.targetReadCount !== 0 ||
        data.findingCount !== 0 ||
        data.rejectedInputCount !== 0
      ) {
        throw new Error("Unexpected anchor counters");
      }
    } else {
      const data = prepared.check.parseData(facts.data);
      if (data.entries.length !== prepared.fixture.reminderCount) {
        throw new Error("Missing reminder assessment");
      }
      for (const [index, entry] of data.entries.entries()) {
        if (
          entry.id !== `review-${index}` ||
          entry.assessment !== "clear" ||
          entry.commitCount !== size ||
          entry.changedLines !== size ||
          entry.baseCommit !== prepared.fixture.baseCommit ||
          entry.headCommit !== prepared.fixture.headCommit ||
          entry.exceeded.length !== 0
        ) {
          throw new Error("Unexpected real Git assessment");
        }
      }
    }
    retainSemanticDigest(facts.snapshot);
  }
  if (!Number.isFinite(wallMs) || wallMs < 0 || wallMs > 10_000) {
    throw new Error("Bounded sample exceeded");
  }
  return wallMs;
}

const warmupWallMs: number[] = [];
for (let index = 0; index < warmups; index += 1) warmupWallMs.push(await measuredOperation());
const samples: {
  readonly index: number;
  readonly operationWallMs: readonly number[];
  readonly meanOperationWallMs: number;
}[] = [];
for (let index = 0; index < sampleCount; index += 1) {
  const operationWallMs: number[] = [];
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    operationWallMs.push(await measuredOperation());
  }
  samples.push({
    index,
    operationWallMs,
    meanOperationWallMs: operationWallMs.reduce((sum, value) => sum + value, 0) / iterations
  });
}
console.log(
  JSON.stringify(
    {
      protocol: "check-priority-v1",
      workload,
      size,
      warmups,
      sampleCount,
      iterations,
      observedAt: new Date().toISOString(),
      timingScope:
        prepared.kind === "directory"
          ? "complete public collectProjectFiles synchronous call"
          : "await public run(definition, { projectRoot }); Check/Definition creation excluded",
      scenario: fixture,
      semanticDigest,
      warmupWallMs,
      samples,
      runtime: {
        executable: process.execPath,
        versions: process.versions,
        platform: process.platform,
        arch: process.arch
      },
      invocation: { cwd: process.cwd(), argv: process.argv, sourceRoot, fixtureRoot },
      harnessSha256: createHash("sha256")
        .update(readFileSync(fileURLToPath(import.meta.url)))
        .digest("hex"),
      fixtureManifestSha256: createHash("sha256")
        .update(readFileSync(fixtureManifestPath))
        .digest("hex"),
      gitIsolation:
        "all inherited GIT_* cleared; system/global configs /dev/null; terminal prompt off; LC_ALL=C; trace off",
      memoryAfter: process.memoryUsage(),
      resourceUsageAfter: process.resourceUsage()
    },
    null,
    2
  )
);
