/** Separate instrumented process: actual public paths, never timing evidence.
 * Before/after detectors retain historical scan counts and observe new lookup
 * paths. Zero alone is not proof: correlate with invocation-bound source hashes.
 * Review revision; historical counts remain bound to their original probe hash.
 */
import { createHash, randomUUID } from "node:crypto";
import { readFileSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ProjectDefinition } from "../../../../src/index.ts";
import {
  argument,
  ownedFixtureRoot,
  loadBenchmarkApi,
  readFixtureManifest,
  fixtureFor,
  parseJson,
  isRecord,
  type BenchmarkFixture,
  type Workload
} from "./benchmark-boundaries.ts";

const repositoryRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const sourceRoot = resolve(argument({ name: "--source-root", fallback: repositoryRoot }));
const fixtureRoot = ownedFixtureRoot(argument({ name: "--fixture-root", fallback: "" }));
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
const fixtures = readFixtureManifest(resolve(fixtureRoot, "manifest.json"));
const originalFilter = Array.prototype.filter;
const originalSome = Array.prototype.some;
// oxlint-disable-next-line typescript/unbound-method -- Capture the native method for restoration; observedMapGet always supplies its original Map receiver via Reflect.apply.
const originalMapGet = Map.prototype.get;
// oxlint-disable-next-line typescript/unbound-method -- Capture the native method for restoration; observedSetHas always supplies its original Set receiver via call.
const originalSetHas = Set.prototype.has;
const OriginalSet = globalThis.Set;

interface ProbeCounters {
  directoryNameComparisons: number;
  directoryMapGetsInTargetEntry: number;
  headingSlugComparisons: number;
  anchorSetHasCalls: number;
  headingSetConstructions: number;
  headingSetInputEntries: number;
}
interface GitProcessObservation {
  readonly totalProcesses: number;
  readonly commandCounts: Readonly<Record<string, number>>;
  readonly uniqueArgumentCounts: readonly { readonly argv: readonly string[]; count: number }[];
  readonly method: string;
}
interface OperationObservation extends ProbeCounters {
  readonly workload: Workload;
  readonly size: number;
  readonly semanticDigest: string;
  readonly counterSamples: { readonly targetEntry: string; readonly anchorResolution: string };
  readonly git: GitProcessObservation | undefined;
}

function prepareWorkload(fixture: BenchmarkFixture) {
  const projectRoot = resolve(fixtureRoot, fixture.directory);
  switch (fixture.workload) {
    case "directory": {
      const paths = Array.from(
        { length: fixture.size },
        (_, index) => `f-${String(index).padStart(6, "0")}.ts`
      );
      return {
        kind: "directory" as const,
        paths,
        options: {
          projectRoot,
          selection: { patterns: paths, useDefaultExcludes: false }
        }
      };
    }
    case "anchors": {
      const check = api.markdownLinkValidation({
        files: { patterns: ["a.md"] },
        cache: { enabled: false }
      });
      return { kind: "anchors" as const, projectRoot, definition: definitionFor(check) };
    }
    case "reminders": {
      const check = api.maintenanceReminders(
        Array.from({ length: fixture.reminderCount }, (_, index) => ({
          id: `review-${index}`,
          baseCommit: fixture.baseCommit,
          limits: { commits: fixture.size + 1, changedLines: fixture.size + 1 },
          message: "Fixture maintenance review",
          mode: "enforcing"
        }))
      );
      return { kind: "reminders" as const, projectRoot, definition: definitionFor(check) };
    }
  }
}

/** Counts and timed workloads share the same disabled outputs/root budget. */
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

function gitProcessObservation(tracePath: string): GitProcessObservation {
  const text = readFileSync(tracePath, "utf8").trim();
  if (text === "") throw new Error(`${tracePath}: expected Git Trace2 events, found empty trace`);
  const invocations: string[][] = [];
  for (const [index, line] of text.split("\n").entries()) {
    const location = `${tracePath}: line ${index + 1}`;
    const entry = parseJson({ text: line, location });
    if (!isRecord(entry) || typeof entry.event !== "string") {
      throw new Error(`${location}: expected a Trace2 event object`);
    }
    if (entry.event !== "start") continue;
    if (!isStringArray(entry.argv) || entry.argv.length < 2) {
      throw new Error(
        `${location}.argv: expected string arguments including executable and command`
      );
    }
    invocations.push(entry.argv);
  }
  if (invocations.length === 0) {
    throw new Error(
      `${tracePath}: reminders workload requires at least one Git Trace2 start event`
    );
  }
  const commandCounts = new Map<string, number>();
  const argumentCounts = new Map<string, { readonly argv: readonly string[]; count: number }>();
  for (const argv of invocations) {
    const command = argv[1];
    if (command === undefined) throw new Error(`${tracePath}: validated Git command disappeared`);
    commandCounts.set(command, (commandCounts.get(command) ?? 0) + 1);
    const serialized = JSON.stringify(argv);
    const previous = argumentCounts.get(serialized);
    if (previous === undefined) argumentCounts.set(serialized, { argv, count: 1 });
    else previous.count += 1;
  }
  return {
    totalProcesses: invocations.length,
    commandCounts: Object.fromEntries(commandCounts),
    uniqueArgumentCounts: [...argumentCounts.values()],
    method:
      "Real Git native Trace2 start events; trace only this separate count process; raw trace removed"
  };
}

function isStringArray(value: unknown): value is string[] {
  if (!Array.isArray(value)) return false;
  const entries: readonly unknown[] = value;
  return entries.every((entry) => typeof entry === "string");
}

const observations: OperationObservation[] = [];
for (const [workload, sizes] of [
  ["directory", [32, 1024]],
  ["anchors", [16, 4096]],
  ["reminders", [4, 32]]
] as const) {
  for (const size of sizes) {
    const fixture = fixtureFor({ fixtures, workload, size });
    const prepared = prepareWorkload(fixture);
    const counters: ProbeCounters = {
      directoryNameComparisons: 0,
      directoryMapGetsInTargetEntry: 0,
      headingSlugComparisons: 0,
      anchorSetHasCalls: 0,
      headingSetConstructions: 0,
      headingSetInputEntries: 0
    };
    const counterSamples = { targetEntry: "", anchorResolution: "" };
    const tracePath = resolve(fixtureRoot, `git-trace-counts-${randomUUID()}.jsonl`);

    // Each wrapper delegates to the captured native method. The return assertions
    // preserve native generic contracts; no external data is trusted through them.
    function observedFilter<T, S extends T>(
      this: T[],
      callback: (value: T, index: number, array: T[]) => value is S,
      thisArg?: unknown
    ): S[];
    function observedFilter<T>(
      this: T[],
      callback: (value: T, index: number, array: T[]) => unknown,
      thisArg?: unknown
    ): T[];
    function observedFilter<T>(
      this: T[],
      callback: (value: T, index: number, array: T[]) => unknown,
      thisArg?: unknown
    ): T[] {
      if (!callback.toString().includes("candidate.name === part")) {
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Native filter on this T[] returns only original T elements; Reflect.apply erases this receiver-dependent signature.
        return Reflect.apply(originalFilter, this, [callback, thisArg]) as T[];
      }
      const counted = (value: T, index: number, array: T[]): unknown => {
        counters.directoryNameComparisons += 1;
        return callback.call(thisArg, value, index, array);
      };
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Counting changes only the predicate observation; native filter still returns original elements from this T[].
      return Reflect.apply(originalFilter, this, [counted, thisArg]) as T[];
    }
    function observedSome<T>(
      this: T[],
      callback: (value: T, index: number, array: T[]) => unknown,
      thisArg?: unknown
    ): boolean {
      if (!callback.toString().includes("heading.slug === fragment")) {
        return originalSome.call(this, callback, thisArg);
      }
      return originalSome.call(
        this,
        (value: T, index: number, array: T[]) => {
          counters.headingSlugComparisons += 1;
          return callback.call(thisArg, value, index, array);
        },
        thisArg
      );
    }
    function observedMapGet<K, V>(this: Map<K, V>, key: K): V | undefined {
      if (workload === "directory") {
        const stack = new Error().stack ?? "";
        if (stack.includes("targetEntry")) {
          counters.directoryMapGetsInTargetEntry += 1;
          counterSamples.targetEntry ||= stack;
        }
      }
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Captured native get receives this Map<K, V> and K; its result contract is V | undefined despite Reflect.apply type erasure.
      return Reflect.apply(originalMapGet, this, [key]) as V | undefined;
    }
    function observedSetHas<T>(this: Set<T>, value: T): boolean {
      if (workload === "anchors") {
        const stack = new Error().stack ?? "";
        if (stack.includes("anchorResolution")) {
          counters.anchorSetHasCalls += 1;
          counterSamples.anchorResolution ||= stack;
        }
      }
      return originalSetHas.call(this, value);
    }
    class ObservedSet<T> extends OriginalSet<T> {
      constructor(values?: Iterable<T> | null) {
        if (
          workload === "anchors" &&
          Array.isArray(values) &&
          values.length === size &&
          values.every(
            (value: unknown) => typeof value === "string" && value.startsWith("heading-")
          )
        ) {
          counters.headingSetConstructions += 1;
          counters.headingSetInputEntries += values.length;
        }
        super(values);
      }
    }

    let semantic: unknown;
    const previousTrace = process.env.GIT_TRACE2_EVENT;
    try {
      Array.prototype.filter = observedFilter;
      Array.prototype.some = observedSome;
      Map.prototype.get = observedMapGet;
      Set.prototype.has = observedSetHas;
      globalThis.Set = ObservedSet;
      if (workload === "reminders") process.env.GIT_TRACE2_EVENT = tracePath;
      if (prepared.kind === "directory") {
        const result = api.collectProjectFiles(prepared.options);
        if (JSON.stringify(result) !== JSON.stringify(prepared.paths))
          throw new Error("Collection drift");
        semantic = result;
      } else {
        const result = await api.run(prepared.definition, { projectRoot: prepared.projectRoot });
        if (result.kind !== "completed" || result.aggregate !== "passed") {
          throw new Error(`Check result drift: ${result.kind}`);
        }
        const firstCheck = result.snapshot.checks[0];
        if (firstCheck?.outcome.status !== "passed" || result.snapshot.records.length !== 0) {
          throw new Error("Check result drift: expected passed Check and no Records");
        }
        semantic = result.snapshot;
      }
    } finally {
      Array.prototype.filter = originalFilter;
      Array.prototype.some = originalSome;
      Map.prototype.get = originalMapGet;
      Set.prototype.has = originalSetHas;
      globalThis.Set = OriginalSet;
      if (previousTrace === undefined) delete process.env.GIT_TRACE2_EVENT;
      else process.env.GIT_TRACE2_EVENT = previousTrace;
    }
    let git: GitProcessObservation | undefined;
    if (workload === "reminders") {
      git = gitProcessObservation(tracePath);
      unlinkSync(tracePath);
    }
    observations.push({
      workload,
      size,
      semanticDigest: createHash("sha256").update(JSON.stringify(semantic)).digest("hex"),
      ...counters,
      counterSamples,
      git
    });
  }
}
console.log(
  JSON.stringify(
    {
      protocol: "check-priority-operation-counts-v1",
      timing: false,
      observedAt: new Date().toISOString(),
      runtime: process.versions,
      sourceRoot,
      fixtureRoot,
      probeSha256: createHash("sha256")
        .update(readFileSync(fileURLToPath(import.meta.url)))
        .digest("hex"),
      note: "Predicate spelling/stack detectors need current source correlation; new-path counts are not time or total algorithmic work",
      observations
    },
    null,
    2
  )
);
