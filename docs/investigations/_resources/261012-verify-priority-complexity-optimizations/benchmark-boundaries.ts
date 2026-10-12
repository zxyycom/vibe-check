/** Review-version boundaries shared only by this Investigation's one-off scripts.
 * Historical samples remain bound to their original script hashes, not this revision.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export type BenchmarkApi = Pick<
  typeof import("../../../../src/index.ts"),
  "collectProjectFiles" | "markdownLinkValidation" | "maintenanceReminders" | "defineConfig" | "run"
>;

export type Workload = "directory" | "anchors" | "reminders";
interface FixtureIdentity extends Readonly<Record<string, unknown>> {
  readonly directory: string;
  readonly size: number;
}
export type BenchmarkFixture =
  | (FixtureIdentity & { readonly workload: "directory" })
  | (FixtureIdentity & { readonly workload: "anchors" })
  | (FixtureIdentity & {
      readonly workload: "reminders";
      readonly reminderCount: number;
      readonly baseCommit: string;
      readonly headCommit: string;
    });

export function argument(options: { readonly name: string; readonly fallback: string }): string {
  const index = process.argv.indexOf(options.name);
  if (index < 0) return options.fallback;
  const text = process.argv[index + 1];
  if (text === undefined || text === "" || text.startsWith("--")) {
    throw new Error(`${options.name} requires a value`);
  }
  return text;
}

export function positiveIntegerArgument(options: {
  readonly name: string;
  readonly fallback: number;
}): number {
  const value = Number(argument({ name: options.name, fallback: String(options.fallback) }));
  if (!isPositiveInteger(value))
    throw new Error(`${options.name} requires a positive safe integer`);
  return value;
}

export function parseWorkload(text: string): Workload {
  switch (text) {
    case "directory":
    case "anchors":
    case "reminders":
      return text;
    default:
      throw new Error(`--workload requires directory, anchors or reminders; received ${text}`);
  }
}

export function ownedFixtureRoot(text: string): string {
  const absolute = resolve(text);
  if (!absolute.startsWith("/tmp/vibe-check-k-fixtures-")) {
    throw new Error("--fixture-root must name an owned /tmp/vibe-check-k-fixtures- directory");
  }
  return absolute;
}

/** The source-root is trusted repository code with this public API contract.
 * Check callable exports before applying local public signatures; this is not a sandbox.
 */
export async function loadBenchmarkApi(sourceRoot: string): Promise<BenchmarkApi> {
  const entry = resolve(sourceRoot, "src/index.ts");
  const loaded: unknown = await import(pathToFileURL(entry).href);
  assertBenchmarkApi(loaded, entry);
  return loaded;
}

/** Function signatures come from this repository's public entry declaration.
 * The trusted source-root supplies that same API; runtime checks establish its
 * required callable exports, not arbitrary function behavior or version compatibility.
 */
function assertBenchmarkApi(value: unknown, entry: string): asserts value is BenchmarkApi {
  if (!isRecord(value)) throw new Error(`Public module is not an export object: ${entry}`);
  for (const name of [
    "collectProjectFiles",
    "markdownLinkValidation",
    "maintenanceReminders",
    "defineConfig",
    "run"
  ] as const) {
    if (typeof value[name] !== "function") {
      throw new Error(`Public module is missing callable export ${name}: ${entry}`);
    }
  }
}

/** Validate fields consumed by the scripts; retain all original scenario metadata. */
export function readFixtureManifest(path: string): readonly BenchmarkFixture[] {
  const parsed = parseJson({ text: readFileSync(path, "utf8"), location: path });
  if (
    !isRecord(parsed) ||
    parsed.protocol !== "check-priority-fixtures-v1" ||
    !Array.isArray(parsed.fixtures)
  ) {
    throw new Error(`${path}: expected check-priority-fixtures-v1 with a fixtures array`);
  }
  const fixtures: BenchmarkFixture[] = [];
  const entries: readonly unknown[] = parsed.fixtures;
  for (const [index, entry] of entries.entries()) {
    assertFixture(entry, `${path}: fixtures[${index}]`);
    fixtures.push(entry);
  }
  return fixtures;
}

export function fixtureFor(options: {
  readonly fixtures: readonly BenchmarkFixture[];
  readonly workload: Workload;
  readonly size: number;
}): BenchmarkFixture {
  const matches = options.fixtures.filter(
    (entry) => entry.workload === options.workload && entry.size === options.size
  );
  const fixture = matches[0];
  if (fixture === undefined || matches.length !== 1) {
    throw new Error(
      `Expected one ${options.workload} fixture of size ${options.size}; found ${matches.length}`
    );
  }
  return fixture;
}

export function parseJson(options: { readonly text: string; readonly location: string }): unknown {
  try {
    return JSON.parse(options.text) as unknown;
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : "unknown JSON parse error";
    throw new Error(`${options.location}: invalid JSON: ${reason}`, { cause: error });
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function assertFixture(value: unknown, location: string): asserts value is BenchmarkFixture {
  if (!isRecord(value) || !isPositiveInteger(value.size)) {
    throw new Error(`${location}: expected a fixture object with a positive safe integer size`);
  }
  if (
    value.workload !== "directory" &&
    value.workload !== "anchors" &&
    value.workload !== "reminders"
  ) {
    throw new Error(`${location}.workload: expected directory, anchors or reminders`);
  }
  if (value.directory !== `${value.workload}-${value.size}`) {
    throw new Error(`${location}.directory: expected the workload-size fixture child directory`);
  }
  if (value.workload === "reminders") {
    if (!isPositiveInteger(value.reminderCount)) {
      throw new Error(`${location}.reminderCount: expected a positive safe integer`);
    }
    for (const field of ["baseCommit", "headCommit"] as const) {
      if (
        typeof value[field] !== "string" ||
        !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(value[field])
      ) {
        throw new Error(`${location}.${field}: expected a full Git commit ID`);
      }
    }
  }
}
