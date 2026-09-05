const LIZARD_REVISION = "308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec";
const PYGMENTS_ERLANG_PATH = "pygments/lexers/erlang.py";
const PYGMENTS_ERLANG_RANGE = "lines 22-146";
const PROVENANCE_STATUSES = Object.freeze([
  "translated",
  "deferred-extension-body",
  "excluded-entry-surface"
] as const);
const SPDX_LICENSES = Object.freeze(["Apache-2.0", "BSD-2-Clause", "MIT"] as const);
const SPDX_LICENSE_SET: ReadonlySet<string> = new Set(SPDX_LICENSES);
const SOURCE_RANGE_PATTERN = /^lines ([1-9][0-9]*)-([1-9][0-9]*)$/u;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const DEFERRED_EXTENSION_BODY_COUNT = 20;
const DEFERRED_EXTENSION_SUPPORT_COUNT = 2;

export const TRANSLATED_ANALYZER_LIZARD_REVISION = LIZARD_REVISION;

export interface ProvenanceEntry {
  readonly additionalTargetPaths: readonly string[];
  readonly range: string;
  readonly sourcePath: string;
  readonly spdx: string;
  readonly status: (typeof PROVENANCE_STATUSES)[number];
  readonly targetPath: string | undefined;
}

export interface ProvenanceInventory {
  readonly files: readonly ProvenanceEntry[];
  readonly supplementalSources: readonly ProvenanceEntry[];
}

export function parseTranslatedAnalyzerProvenanceInventory(source: Buffer): ProvenanceInventory {
  const value = parseJsonRecord(source, "translated-analyzer provenance inventory");
  assertFixedInventoryIdentity(value);
  const files = parseInventoryEntries(value.files, "files", parseProvenanceEntry);
  const supplementalSources = parseInventoryEntries(
    value.supplementalSources,
    "supplementalSources",
    parseSupplementalSource
  );
  assertProvenanceStatusCounts(files);
  return Object.freeze({
    files: Object.freeze(files),
    supplementalSources: Object.freeze(supplementalSources)
  });
}

export function collectTranslatedTargets(
  inventory: ProvenanceInventory
): ReadonlyMap<string, readonly ProvenanceEntry[]> {
  const sourcesByTarget = collectTargetSources(inventory.files, inventory.supplementalSources);
  return new Map(
    [...sourcesByTarget].map(([targetPath, entries]) => [targetPath, Object.freeze(entries)])
  );
}

function collectTargetSources(
  files: readonly ProvenanceEntry[],
  supplementalSources: readonly ProvenanceEntry[]
): Map<string, ProvenanceEntry[]> {
  const sourcesByTarget = new Map<string, ProvenanceEntry[]>();
  for (const entry of [...files, ...supplementalSources]) {
    if (entry.status !== "translated" || entry.targetPath === undefined) continue;
    for (const targetPath of [entry.targetPath, ...entry.additionalTargetPaths]) {
      const sources = sourcesByTarget.get(targetPath) ?? [];
      sources.push(entry);
      sourcesByTarget.set(targetPath, sources);
    }
  }
  return sourcesByTarget;
}

function assertFixedInventoryIdentity(value: Readonly<Record<string, unknown>>): void {
  assertSchemaVersion(value.schemaVersion);
  assertLizardUpstreamIdentity(value.upstream);
  assertStatusVocabulary(value.statusVocabulary);
  assertInventoryArray(value.files, 84);
  assertInventoryArray(value.supplementalSources, 1);
}

function assertSchemaVersion(value: unknown): void {
  if (value !== 2) throwUnexpectedFixedSourceIdentity();
}

function assertLizardUpstreamIdentity(value: unknown): void {
  if (!isRecord(value)) throwUnexpectedFixedSourceIdentity();
  if (value.project !== "terryyin/lizard") throwUnexpectedFixedSourceIdentity();
  if (value.tag !== "1.24.0") throwUnexpectedFixedSourceIdentity();
  if (value.revision !== LIZARD_REVISION) throwUnexpectedFixedSourceIdentity();
}

function assertStatusVocabulary(value: unknown): void {
  if (!sameStrings(value, PROVENANCE_STATUSES)) throwUnexpectedFixedSourceIdentity();
}

function assertInventoryArray(value: unknown, expectedLength: number): void {
  if (!Array.isArray(value) || value.length !== expectedLength)
    throwUnexpectedFixedSourceIdentity();
}

function throwUnexpectedFixedSourceIdentity(): never {
  throw new Error(
    "translated-analyzer provenance inventory has an unexpected fixed-source identity"
  );
}

function parseInventoryEntries(
  value: unknown,
  description: "files" | "supplementalSources",
  parse: (entry: unknown, description: string) => ProvenanceEntry
): readonly ProvenanceEntry[] {
  if (!Array.isArray(value)) throwUnexpectedFixedSourceIdentity();
  return value.map((entry, index) => parse(entry, `${description}[${index}]`));
}

function parseProvenanceEntry(value: unknown, description: string): ProvenanceEntry {
  if (!isRecord(value))
    throw new Error(`translated-analyzer provenance ${description} must be an object`);
  const sourcePath = requiredString(
    value.sourcePath,
    `translated-analyzer provenance ${description}.sourcePath`
  );
  const range = requiredString(value.range, `translated-analyzer provenance ${description}.range`);
  const spdx = requiredString(value.spdx, `translated-analyzer provenance ${description}.spdx`);
  const status = requiredString(
    value.status,
    `translated-analyzer provenance ${description}.status`
  );
  const sourceMetadata = { description, range, sourcePath, spdx, status, value };
  assertValidSourceMetadata(sourceMetadata);
  const targetPath = optionalTargetPath(value.targetPath, `${description}.targetPath`);
  const additionalTargetPaths = optionalTargetPaths(value.additionalTargetPaths, description);
  assertStatusTargetRule(sourceMetadata.status, targetPath, additionalTargetPaths, description);
  return Object.freeze({
    additionalTargetPaths,
    range,
    sourcePath,
    spdx,
    status: sourceMetadata.status,
    targetPath
  });
}

function assertValidSourceMetadata(
  input: Readonly<{
    readonly description: string;
    readonly range: string;
    readonly sourcePath: string;
    readonly spdx: string;
    readonly status: string;
    readonly value: Readonly<Record<string, unknown>>;
  }>
): asserts input is Readonly<{
  readonly description: string;
  readonly range: string;
  readonly sourcePath: string;
  readonly spdx: string;
  readonly status: ProvenanceEntry["status"];
  readonly value: Readonly<Record<string, unknown>>;
}> {
  if (!isSafeSourcePath(input.sourcePath)) throwInvalidSourceMetadata(input.description);
  if (!validSourceRange(input.range)) throwInvalidSourceMetadata(input.description);
  if (!SPDX_LICENSE_SET.has(input.spdx)) throwInvalidSourceMetadata(input.description);
  if (!isProvenanceStatus(input.status)) throwInvalidSourceMetadata(input.description);
  if (!isSha256(input.value.sha256)) throwInvalidSourceMetadata(input.description);
}

function throwInvalidSourceMetadata(description: string): never {
  throw new Error(`translated-analyzer provenance ${description} has invalid source metadata`);
}

function assertStatusTargetRule(
  status: ProvenanceEntry["status"],
  targetPath: string | undefined,
  additionalTargetPaths: readonly string[],
  description: string
): void {
  if (status === "excluded-entry-surface") {
    if (targetPath !== undefined || additionalTargetPaths.length !== 0) {
      throw new Error(
        `excluded translated-analyzer provenance ${description} must not name a target`
      );
    }
    return;
  }
  if (targetPath === undefined) {
    throw new Error(`translated-analyzer provenance ${description} must name a target`);
  }
}

function parseSupplementalSource(value: unknown, description: string): ProvenanceEntry {
  const source = parseProvenanceEntry(value, description);
  if (!isRecord(value))
    throw new Error(`translated-analyzer provenance ${description} must be an object`);
  assertFixedPygmentsSupplementalSource(value, source);
  return source;
}

function assertFixedPygmentsSupplementalSource(
  value: Readonly<Record<string, unknown>>,
  source: ProvenanceEntry
): void {
  if (value.project !== "Pygments") throwPygmentsProvenanceDrift();
  if (value.version !== "2.18.0") throwPygmentsProvenanceDrift();
  assertPygmentsSourceIdentity(source);
  assertPygmentsDistribution(value.distribution);
  if (!isSha256(value.licenseSha256)) throwPygmentsProvenanceDrift();
  if (value.licensePath !== "pygments-2.18.0.dist-info/licenses/LICENSE") {
    throwPygmentsProvenanceDrift();
  }
}

function assertPygmentsSourceIdentity(source: ProvenanceEntry): void {
  if (source.sourcePath !== PYGMENTS_ERLANG_PATH) throwPygmentsProvenanceDrift();
  if (source.range !== PYGMENTS_ERLANG_RANGE) throwPygmentsProvenanceDrift();
  if (source.spdx !== "BSD-2-Clause") throwPygmentsProvenanceDrift();
  if (source.status !== "translated") throwPygmentsProvenanceDrift();
  if (source.additionalTargetPaths.length !== 0) throwPygmentsProvenanceDrift();
}

function assertPygmentsDistribution(value: unknown): void {
  if (!isRecord(value) || !isSha256(value.sha256)) throwPygmentsProvenanceDrift();
}

function throwPygmentsProvenanceDrift(): never {
  throw new Error("translated-analyzer Pygments supplemental provenance drifted");
}

function assertProvenanceStatusCounts(entries: readonly ProvenanceEntry[]): void {
  const counts = new Map<string, number>();
  for (const entry of entries) counts.set(entry.status, (counts.get(entry.status) ?? 0) + 1);
  if (counts.get("translated") !== 46) throwProvenanceStatusClosureDrift();
  if (
    counts.get("deferred-extension-body") !==
    DEFERRED_EXTENSION_BODY_COUNT + DEFERRED_EXTENSION_SUPPORT_COUNT
  ) {
    throwProvenanceStatusClosureDrift();
  }
  if (counts.get("excluded-entry-surface") !== 16) throwProvenanceStatusClosureDrift();
}

function throwProvenanceStatusClosureDrift(): never {
  throw new Error("translated-analyzer provenance status closure drifted");
}

function optionalTargetPath(value: unknown, description: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !isSafeTargetPath(value)) {
    throw new Error(
      `translated-analyzer provenance ${description} must be a package TypeScript target`
    );
  }
  return value;
}

function optionalTargetPaths(value: unknown, description: string): readonly string[] {
  if (value === undefined) return Object.freeze([]);
  if (!Array.isArray(value)) {
    throw new Error(
      `translated-analyzer provenance ${description}.additionalTargetPaths is invalid`
    );
  }
  const paths: string[] = [];
  for (const path of value) {
    if (typeof path !== "string" || !isSafeTargetPath(path)) {
      throw new Error(
        `translated-analyzer provenance ${description}.additionalTargetPaths is invalid`
      );
    }
    paths.push(path);
  }
  return Object.freeze(paths);
}

function isSafeSourcePath(value: string): boolean {
  return value.length > 0 && !value.startsWith("/") && value.split("/").every(isSafePathSegment);
}

function isSafeTargetPath(value: string): boolean {
  return value.startsWith("src/") && value.endsWith(".ts") && isSafeSourcePath(value);
}

function isSafePathSegment(value: string): boolean {
  return value.length > 0 && value !== "." && value !== "..";
}

function validSourceRange(value: string): boolean {
  const match = SOURCE_RANGE_PATTERN.exec(value);
  return match !== null && Number(match[1]) <= Number(match[2]);
}

function isProvenanceStatus(value: string): value is ProvenanceEntry["status"] {
  return PROVENANCE_STATUSES.some((status) => status === value);
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && SHA256_PATTERN.test(value);
}

function parseJsonRecord(source: Buffer, description: string): Readonly<Record<string, unknown>> {
  let value: unknown;
  try {
    value = JSON.parse(source.toString("utf8"));
  } catch (error: unknown) {
    throw new Error(`${description} is invalid JSON`, { cause: error });
  }
  if (!isRecord(value)) throw new Error(`${description} must be an object`);
  return value;
}

function requiredString(value: unknown, description: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${description} must be a non-empty string`);
  }
  return value;
}

function sameStrings(value: unknown, expected: readonly string[]): boolean {
  return (
    Array.isArray(value) &&
    value.length === expected.length &&
    value.every((item, index) => item === expected[index])
  );
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
