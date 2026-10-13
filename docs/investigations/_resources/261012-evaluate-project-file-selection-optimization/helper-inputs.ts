/** Reviewed input boundaries shared by this investigation's replay scripts, not Product API. */

import { readFileSync } from "node:fs";
import { isAbsolute } from "node:path";

export interface FrozenManifestEntry {
  readonly path: string;
  readonly bytes: number;
  readonly sha256: string;
}

export interface FrozenManifest {
  readonly frozenAt: string;
  readonly native: readonly string[];
  readonly manifest: readonly FrozenManifestEntry[];
}

interface BeforeSourceEntry extends FrozenManifestEntry {
  readonly resource: string;
  readonly runnableSnapshot: string;
}

export interface BeforeSourceProvenance {
  readonly capturedAt: string;
  readonly head: string;
  readonly kind: string;
  readonly entries: readonly BeforeSourceEntry[];
}

type JsonRecord = Readonly<Record<string, unknown>>;

export function readFrozenManifest(filePath: string): FrozenManifest {
  return decodeFrozenManifest(readJson(filePath), filePath);
}

export function decodeFrozenManifest(value: unknown, source: string): FrozenManifest {
  const record = requireRecord(value, source);
  const frozenAt = requireText(record.frozenAt, `${source}.frozenAt`);
  const native = requireArray(record.native, `${source}.native`).map((pattern, index) =>
    requireText(pattern, `${source}.native[${index}]`)
  );
  const manifest = requireArray(record.manifest, `${source}.manifest`).map((entry, index) =>
    decodeManifestEntry(entry, `${source}.manifest[${index}]`)
  );
  requireDistinctPaths(manifest, `${source}.manifest`);
  return { frozenAt, native, manifest };
}

export function readBeforeSourceProvenance(filePath: string): BeforeSourceProvenance {
  return decodeBeforeSourceProvenance(readJson(filePath), filePath);
}

export function decodeBeforeSourceProvenance(
  value: unknown,
  source: string
): BeforeSourceProvenance {
  const record = requireRecord(value, source);
  const capturedAt = requireText(record.capturedAt, `${source}.capturedAt`);
  const head = requireText(record.head, `${source}.head`);
  if (!/^[0-9a-f]{40}$/u.test(head)) throw new Error(`${source}.head: expected a Git object ID`);
  const kind = requireText(record.kind, `${source}.kind`);
  const entries = requireArray(record.entries, `${source}.entries`).map((entry, index) => {
    const field = `${source}.entries[${index}]`;
    const fields = requireRecord(entry, field);
    const metadata = decodeManifestEntry(fields, field);
    const resource = requireRelativePath(fields.resource, `${field}.resource`);
    const runnableSnapshot = requireText(fields.runnableSnapshot, `${field}.runnableSnapshot`);
    if (!isAbsolute(runnableSnapshot))
      throw new Error(`${field}.runnableSnapshot: expected an absolute path`);
    return { ...metadata, resource, runnableSnapshot };
  });
  requireDistinctPaths(entries, `${source}.entries`);
  return { capturedAt, head, kind, entries };
}

export function assertNoArguments(argv: readonly string[], script: string): void {
  if (argv.length !== 0) throw new Error(`usage: ${script}`);
}

export function parsePublicMeasurementArguments(argv: readonly string[]): Readonly<{
  profile: boolean;
  freeze: boolean;
}> {
  const allowed = new Set(["--profile", "--freeze"]);
  if (argv.some((argument) => !allowed.has(argument)) || new Set(argv).size !== argv.length)
    throw new Error("usage: measure-public-api.ts [--profile] [--freeze]");
  return { profile: argv.includes("--profile"), freeze: argv.includes("--freeze") };
}

export function parseExperimentArguments(argv: readonly string[]): "profile" | "literal" {
  const kind = argv[0];
  if (argv.length !== 1 || (kind !== "profile" && kind !== "literal"))
    throw new Error("usage: measure-experiment-copy.ts <profile|literal>");
  return kind;
}

export function parseLongLiteralArguments(argv: readonly string[]): string {
  const label = argv[0] ?? "current";
  if (argv.length > 1 || !/^[A-Za-z0-9_-]+$/u.test(label))
    throw new Error("usage: long-literal-differential.ts [output-label: A-Za-z0-9_-]");
  return label;
}

export function describeComparisonFailure(
  error: unknown
): Readonly<{ error: string; type: string }> {
  if (error instanceof Error) return { error: error.message, type: error.constructor.name };
  return { error: String(error), type: typeof error };
}

function readJson(filePath: string): unknown {
  try {
    const text = readFileSync(filePath, "utf8");
    return JSON.parse(text) as unknown;
  } catch (cause: unknown) {
    throw new Error(`could not read JSON input ${filePath}`, { cause });
  }
}

function decodeManifestEntry(value: unknown, source: string): FrozenManifestEntry {
  const fields = requireRecord(value, source);
  const path = requireRelativePath(fields.path, `${source}.path`);
  const bytes = fields.bytes;
  if (typeof bytes !== "number" || !Number.isSafeInteger(bytes) || bytes < 0)
    throw new Error(`${source}.bytes: expected a nonnegative safe integer`);
  const sha256 = requireText(fields.sha256, `${source}.sha256`);
  if (!/^[0-9a-f]{64}$/u.test(sha256)) throw new Error(`${source}.sha256: expected SHA-256 hex`);
  return { path, bytes, sha256 };
}

function requireRecord(value: unknown, source: string): JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error(`${source}: expected an object`);
  return value as JsonRecord;
}

function requireArray(value: unknown, source: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error(`${source}: expected an array`);
  for (let index = 0; index < value.length; index++) {
    if (!Object.hasOwn(value, index)) throw new Error(`${source}[${index}]: missing array entry`);
  }
  return value;
}

function requireText(value: unknown, source: string): string {
  if (typeof value !== "string" || value === "" || value.includes("\0"))
    throw new Error(`${source}: expected a nonempty string without NUL`);
  return value;
}

function requireRelativePath(value: unknown, source: string): string {
  const path = requireText(value, source);
  if (
    isAbsolute(path) ||
    path.includes("\\") ||
    /^[A-Za-z]:/u.test(path) ||
    path.split("/").some((part) => part === "" || part === "." || part === "..")
  )
    throw new Error(`${source}: expected a normalized project-relative slash path`);
  return path;
}

function requireDistinctPaths(entries: readonly FrozenManifestEntry[], source: string): void {
  if (new Set(entries.map((entry) => entry.path)).size !== entries.length)
    throw new Error(`${source}: duplicate paths`);
}
