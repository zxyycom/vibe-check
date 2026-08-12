import { createHash } from "node:crypto";

import type { DuplicationScannerDependency } from "../../../../scanner-dependencies.ts";
import {
  loadScanCacheEntry,
  writeScanCacheEntry,
  type DuplicateCodeCacheIdentity,
  type ScanKind
} from "../../measurement/cache.ts";
import { runBoundedTasks } from "../../measurement/scanners/jscpd/parallel.ts";
import { scanWithJscpdAsync } from "../../measurement/scanners/jscpd/scanner.ts";
import { toScopedJscpdMeasurements } from "../../measurement/scanners/jscpd/scoped-fragments.ts";
import { checkJscpd } from "../../measurement/scanners/tool-availability/jscpd.ts";
import { acceptScopedMeasurements } from "../../measurement/scoped-measurement.ts";
import type {
  CodeAreaDefinition,
  CodeAreaFingerprint,
  DuplicateCodeFragment,
  DuplicateCodeLocation
} from "../../model/schema.ts";
import type { CheckExecutionBinding } from "../catalog.ts";
import { canonicalJsonBytes } from "../identity.ts";
import type {
  CheckDefinition,
  FinalCoreSnapshot,
  QualityRecordCandidate,
  RecordLevel
} from "../model.ts";
import type { ReferenceFacts } from "../policy-model.ts";

const DUPLICATE_DETECTION_WORK_HANDLE = "work-handle/v1:duplicate-detection";

export const DUPLICATE_DETECTION_CHECK_DEFINITION = {
  checkId: "duplicate-detection",
  displayName: "Duplicate detection",
  recordTypes: [{
    recordTypeId: "duplicate-code",
    fields: [
      { fieldId: "codeArea", valueType: "string", required: true },
      { fieldId: "lineCount", valueType: "integer", required: true },
      { fieldId: "locationCount", valueType: "integer", required: true },
      { fieldId: "metric", valueType: "string", required: true },
      { fieldId: "suggestion", valueType: "string", required: true },
      { fieldId: "value", valueType: "integer", required: true }
    ],
    identityFields: ["metric", "lineCount", "locationCount"],
    policy: {
      operands: [{
        operandId: "codeArea",
        valueType: "string",
        source: { kind: "field", fieldId: "codeArea" }
      }, {
        operandId: "message",
        valueType: "string",
        source: { kind: "message" }
      }, {
        operandId: "metric",
        valueType: "string",
        source: { kind: "field", fieldId: "metric" }
      }, {
        operandId: "path",
        valueType: "string",
        source: { kind: "location-path" }
      }, {
        operandId: "suggestion",
        valueType: "string",
        source: { kind: "field", fieldId: "suggestion" }
      }, {
        operandId: "value",
        valueType: "number",
        source: { kind: "field", fieldId: "value" }
      }],
      relations: ["changed", "regression"]
    }
  }]
} as const satisfies CheckDefinition;

export interface DuplicateDetectionSemantics {
  readonly changedDelta: number;
  readonly codeAreas: Readonly<Record<string, CodeAreaDefinition>>;
  readonly configVersion: string;
}

export interface DuplicateDetectionAreaInput {
  readonly approvedExactPaths: readonly string[];
  readonly codeArea: string;
  readonly inputFingerprint: Readonly<{
    readonly fileCount: number;
    readonly fileList: readonly string[];
    readonly fingerprint: string;
  }>;
  readonly minimumTokens: number;
}

export interface DuplicateDetectionExactInputSet {
  readonly areas: readonly DuplicateDetectionAreaInput[];
  readonly cacheRootDir: string;
  readonly commitSha: string;
  readonly rootDir: string;
}

export interface DuplicateDetectionReferenceInput extends DuplicateDetectionExactInputSet {
  readonly referenceName: string;
}

export interface DuplicateDetectionBindingRuntime {
  readonly binding: CheckExecutionBinding;
  readonly referenceFacts: (snapshot: FinalCoreSnapshot) => ReferenceFacts;
}

type MeasurementResult = Readonly<
  | { fragments: readonly DuplicateCodeFragment[]; kind: "complete" }
  | { kind: "execution-failed" }
  | { kind: "invalid-result" }
  | { kind: "unavailable" }
>;

type AreaMeasurementResult = Readonly<
  | { fragments: readonly DuplicateCodeFragment[]; kind: "complete" }
  | { kind: "execution-failed" }
  | { kind: "invalid-result" }
>;

type ReferenceStatus = "complete" | "incomplete" | "unavailable";
type RelationId = "changed" | "regression";

interface DuplicateRecordCandidate {
  readonly isChanged: boolean;
  readonly record: QualityRecordCandidate;
  readonly subject: string;
}

export function resolveDuplicateDetectionApplicability(
  areas: readonly DuplicateDetectionAreaInput[]
): Readonly<
  | { status: "not-applicable" }
  | { status: "applicable"; workHandles: readonly string[] }
> {
  return areas.every((area) => area.approvedExactPaths.length === 0)
    ? Object.freeze({ status: "not-applicable" })
    : Object.freeze({
      status: "applicable",
      workHandles: Object.freeze([DUPLICATE_DETECTION_WORK_HANDLE])
    });
}

export function createDuplicateDetectionBinding(input: Readonly<{
  changedFiles: readonly string[];
  current: DuplicateDetectionExactInputSet;
  dependency: DuplicationScannerDependency;
  reference: DuplicateDetectionReferenceInput | null;
  semantics: DuplicateDetectionSemantics;
}>): DuplicateDetectionBindingRuntime {
  const current = detachedInputSet(input.current);
  const changedFiles = Object.freeze([...input.changedFiles]);
  const reference = input.reference === null
    ? null
    : Object.freeze({
      ...detachedInputSet(input.reference),
      referenceName: input.reference.referenceName
    });
  let referenceStatus: ReferenceStatus | null = reference === null ? null : "incomplete";
  let relationsBySubject = new Map<string, readonly RelationId[]>();

  const binding: CheckExecutionBinding = async (ports) => {
    try {
      const currentMeasurement = await measureExactInputs(
        current,
        input.dependency,
        input.semantics,
        "current",
        changedFiles
      );
      if (currentMeasurement.kind === "unavailable") {
        return { status: "unavailable", dependencyId: "jscpd" };
      }
      if (currentMeasurement.kind === "execution-failed") {
        throw new Error("duplicate-detection scanner execution failed");
      }
      if (currentMeasurement.kind === "invalid-result") {
        return { verdict: "invalid" };
      }

      const candidates = buildRecordCandidates(currentMeasurement.fragments, input.semantics);
      if (candidates === undefined) {
        return { verdict: "invalid" };
      }
      for (const candidate of candidates) {
        ports.submitRecord(candidate.record);
      }

      if (reference !== null) {
        const referenceMeasurement = await measureExactInputs(
          reference,
          input.dependency,
          input.semantics,
          "baseline",
          Object.freeze([])
        );
        if (referenceMeasurement.kind === "unavailable") {
          referenceStatus = "unavailable";
        } else if (referenceMeasurement.kind !== "complete") {
          referenceStatus = "incomplete";
        } else {
          const referenceSubjects = duplicateSubjects(referenceMeasurement.fragments);
          if (referenceSubjects === undefined) {
            referenceStatus = "incomplete";
          } else {
            referenceStatus = "complete";
            relationsBySubject = buildRelations(
              candidates,
              referenceSubjects,
              input.semantics.changedDelta
            );
          }
        }
      }

      return { verdict: candidates.length > 0 ? "failed" : "passed" };
    } finally {
      for (const workHandle of ports.workHandles) {
        ports.acknowledge(workHandle);
      }
    }
  };

  return Object.freeze({
    binding,
    referenceFacts: (snapshot: FinalCoreSnapshot) => buildReferenceFacts(
      snapshot,
      reference?.referenceName ?? null,
      referenceStatus,
      relationsBySubject
    )
  });
}

function detachedInputSet(
  input: DuplicateDetectionExactInputSet
): DuplicateDetectionExactInputSet {
  return Object.freeze({
    rootDir: input.rootDir,
    cacheRootDir: input.cacheRootDir,
    commitSha: input.commitSha,
    areas: Object.freeze(input.areas.map((area) => Object.freeze({
      codeArea: area.codeArea,
      approvedExactPaths: Object.freeze([...area.approvedExactPaths]),
      minimumTokens: area.minimumTokens,
      inputFingerprint: Object.freeze({
        fileCount: area.inputFingerprint.fileCount,
        fileList: Object.freeze([...area.inputFingerprint.fileList]),
        fingerprint: area.inputFingerprint.fingerprint
      })
    })))
  });
}

async function measureExactInputs(
  input: DuplicateDetectionExactInputSet,
  dependency: DuplicationScannerDependency,
  semantics: DuplicateDetectionSemantics,
  scanKind: ScanKind,
  changedFiles: readonly string[]
): Promise<MeasurementResult> {
  if (!validAreaInputs(input.areas)) {
    return Object.freeze({ kind: "invalid-result" });
  }
  const areas = input.areas
    .filter((area) => area.approvedExactPaths.length >= 2)
    .sort((left, right) => compareText(left.codeArea, right.codeArea));
  if (areas.length === 0) {
    return Object.freeze({ kind: "complete", fragments: Object.freeze([]) });
  }

  const availability = await checkJscpd(input.rootDir, dependency);
  if (!availability.available) {
    return Object.freeze({ kind: "unavailable" });
  }
  const toolVersion = availability.version ?? "unknown";

  let areaResults: AreaMeasurementResult[];
  try {
    areaResults = await runBoundedTasks(
      [...areas],
      dependency.maxConcurrency,
      (area) => measureArea({
        area,
        cacheRootDir: input.cacheRootDir,
        commitSha: input.commitSha,
        configVersion: semantics.configVersion,
        changedFiles,
        dependency,
        rootDir: input.rootDir,
        scanKind,
        toolVersion
      })
    );
  } catch {
    return Object.freeze({ kind: "execution-failed" });
  }
  if (areaResults.some((result) => result.kind === "execution-failed")) {
    return Object.freeze({ kind: "execution-failed" });
  }
  if (areaResults.some((result) => result.kind === "invalid-result")) {
    return Object.freeze({ kind: "invalid-result" });
  }
  const fragments = areaResults.flatMap((result) => (
    result.kind === "complete" ? result.fragments : []
  ));
  return Object.freeze({ kind: "complete", fragments: Object.freeze(fragments) });
}

function validAreaInputs(areas: readonly DuplicateDetectionAreaInput[]): boolean {
  const codeAreas = new Set<string>();
  for (const area of areas) {
    if (typeof area.codeArea !== "string" || area.codeArea.length === 0
      || codeAreas.has(area.codeArea)
      || !Number.isSafeInteger(area.minimumTokens) || area.minimumTokens < 0
      || !validFingerprint(area.inputFingerprint)
      || area.approvedExactPaths.some((path) => typeof path !== "string" || path.length === 0)) {
      return false;
    }
    codeAreas.add(area.codeArea);
  }
  return true;
}

function validFingerprint(fingerprint: DuplicateDetectionAreaInput["inputFingerprint"]): boolean {
  return Number.isSafeInteger(fingerprint.fileCount) && fingerprint.fileCount >= 0
    && Array.isArray(fingerprint.fileList)
    && fingerprint.fileList.every((path) => typeof path === "string")
    && typeof fingerprint.fingerprint === "string"
    && fingerprint.fingerprint.length > 0;
}

async function measureArea(input: Readonly<{
  area: DuplicateDetectionAreaInput;
  cacheRootDir: string;
  changedFiles: readonly string[];
  commitSha: string;
  configVersion: string;
  dependency: DuplicationScannerDependency;
  rootDir: string;
  scanKind: ScanKind;
  toolVersion: string;
}>): Promise<AreaMeasurementResult> {
  const files = uniqueSorted(input.area.approvedExactPaths);
  const identity = createCacheIdentity(input);
  const cached = loadScanCacheEntry({ rootDir: input.cacheRootDir, identity });
  if (cached.hit) {
    const accepted = acceptScopedMeasurements(
      toScopedJscpdMeasurements(cached.metrics),
      files
    );
    if (accepted.ok && accepted.payloads.every(isValidFragment)) {
      return Object.freeze({
        kind: "complete",
        fragments: Object.freeze(annotateFragments(
          accepted.payloads,
          input.area.codeArea,
          input.changedFiles
        ))
      });
    }
  }

  const result = await scanWithJscpdAsync({
    cwd: input.rootDir,
    dependency: input.dependency,
    files,
    minimumTokens: input.area.minimumTokens
  });
  if (!result.ok) {
    return Object.freeze({
      kind: result.reason === "jscpd-execution-error"
        ? "execution-failed"
        : "invalid-result"
    });
  }
  const accepted = acceptScopedMeasurements(result.measurements, files);
  if (!accepted.ok || !accepted.payloads.every(isValidFragment)) {
    return Object.freeze({ kind: "invalid-result" });
  }
  const fragments = annotateFragments(
    accepted.payloads,
    input.area.codeArea,
    input.changedFiles
  );
  writeScanCacheEntry({
    rootDir: input.cacheRootDir,
    identity,
    metrics: fragments
  });
  return Object.freeze({ kind: "complete", fragments: Object.freeze(fragments) });
}

function createCacheIdentity(input: Readonly<{
  area: DuplicateDetectionAreaInput;
  commitSha: string;
  configVersion: string;
  dependency: DuplicationScannerDependency;
  scanKind: ScanKind;
  toolVersion: string;
}>): DuplicateCodeCacheIdentity {
  return Object.freeze({
    scanKind: input.scanKind,
    toolName: "jscpd",
    toolVersion: input.toolVersion,
    normalizedToolArgs: Object.freeze(jscpdCacheArgs(
      input.dependency,
      input.area.minimumTokens
    )),
    configVersion: input.configVersion,
    codeArea: input.area.codeArea,
    commitSha: input.commitSha,
    inputFingerprint: {
      fileCount: input.area.inputFingerprint.fileCount,
      fileList: [...input.area.inputFingerprint.fileList],
      fingerprint: input.area.inputFingerprint.fingerprint
    } satisfies CodeAreaFingerprint
  });
}

function jscpdCacheArgs(
  dependency: DuplicationScannerDependency,
  minimumTokens: number
): string[] {
  return [
    normalizedJscpdCommandForCache(dependency.executable),
    ...dependency.args,
    "--config",
    "<jscpd-config-with-input-fingerprint>",
    "--min-tokens",
    String(minimumTokens),
    "--reporters",
    "json",
    "--absolute"
  ];
}

function normalizedJscpdCommandForCache(command: string): string {
  const normalized = command.split("\\").join("/");
  return normalized.endsWith("/node_modules/.bin/jscpd")
    || normalized.endsWith("/node_modules/.bin/jscpd.cmd")
    ? "<repo-local-jscpd-bin>"
    : command;
}

function annotateFragments(
  fragments: readonly DuplicateCodeFragment[],
  codeArea: string,
  changedFiles: readonly string[]
): DuplicateCodeFragment[] {
  return fragments.map((fragment) => ({
    ...fragment,
    codeAreas: [codeArea],
    hitsChangedScope: fragment.locations.some((location) => (
      isInChangedScope(location.path, changedFiles)
    )),
    locations: fragment.locations.map((location) => ({
      ...location,
      codeArea
    }))
  }));
}

function buildRecordCandidates(
  fragments: readonly DuplicateCodeFragment[],
  semantics: DuplicateDetectionSemantics
): readonly DuplicateRecordCandidate[] | undefined {
  const candidates: DuplicateRecordCandidate[] = [];
  const subjects = duplicateSubjectsInOrder(fragments);
  if (subjects === undefined) {
    return undefined;
  }
  for (const [index, fragment] of fragments.entries()) {
    if (!isValidFragment(fragment)) {
      return undefined;
    }
    const subject = subjects[index];
    if (subject === undefined) {
      return undefined;
    }

    const locations = sortedLocations(fragment.locations);
    const codeAreas = uniqueSorted(locations.map((location) => location.codeArea));
    const level = duplicateRecordLevel(codeAreas, semantics.codeAreas);
    if (level === null) {
      continue;
    }
    const primaryLocation = locations[0];
    if (primaryLocation === undefined) {
      return undefined;
    }
    const suggestion = `Consider extracting shared code into a common function or module. Locations: ${locations.map(formatLocation).join(", ")}`;
    candidates.push(Object.freeze({
      isChanged: fragment.hitsChangedScope,
      subject,
      record: Object.freeze({
        recordTypeId: "duplicate-code",
        level,
        semanticSubject: subject,
        message: `Duplicate code fragment (${fragment.tokenCount} tokens) across ${locations.length} locations in areas [${codeAreas.join(", ")}]`,
        fields: Object.freeze({
          codeArea: codeAreas.join(","),
          lineCount: fragment.lineCount,
          locationCount: locations.length,
          metric: "duplicate-tokens",
          suggestion,
          value: fragment.tokenCount
        }),
        location: Object.freeze({
          path: primaryLocation.path,
          line: primaryLocation.startLine,
          column: 1
        })
      })
    }));
  }
  candidates.sort((left, right) => compareText(left.subject, right.subject));
  return Object.freeze(candidates);
}

function duplicateSubjects(
  fragments: readonly DuplicateCodeFragment[]
): ReadonlySet<string> | undefined {
  const subjects = new Set<string>();
  const orderedSubjects = duplicateSubjectsInOrder(fragments);
  if (orderedSubjects === undefined) {
    return undefined;
  }
  for (const subject of orderedSubjects) {
    subjects.add(subject);
  }
  return subjects;
}

function isValidFragment(fragment: DuplicateCodeFragment): boolean {
  return Number.isSafeInteger(fragment.id) && fragment.id >= 0
    && Number.isSafeInteger(fragment.lineCount) && fragment.lineCount >= 0
    && Number.isSafeInteger(fragment.tokenCount) && fragment.tokenCount >= 0
    && Array.isArray(fragment.locations) && fragment.locations.length >= 2
    && fragment.locations.every(isValidLocation);
}

function isValidLocation(location: DuplicateCodeLocation): boolean {
  return typeof location.path === "string" && location.path.length > 0
    && typeof location.codeArea === "string" && location.codeArea.length > 0
    && Number.isSafeInteger(location.startLine) && location.startLine >= 1
    && Number.isSafeInteger(location.endLine) && location.endLine >= location.startLine;
}

function duplicateSubjectsInOrder(
  fragments: readonly DuplicateCodeFragment[]
): readonly string[] | undefined {
  const occurrences = new Map<string, number>();
  const subjects: string[] = [];
  for (const fragment of fragments) {
    if (!isValidFragment(fragment)) {
      return undefined;
    }
    const fingerprint = duplicateFingerprint(fragment);
    const occurrence = (occurrences.get(fingerprint) ?? 0) + 1;
    occurrences.set(fingerprint, occurrence);
    subjects.push(`duplicate-fragment/v1/sha256:${fingerprint}/occurrence:${occurrence}`);
  }
  return Object.freeze(subjects);
}

function duplicateFingerprint(fragment: DuplicateCodeFragment): string {
  return createHash("sha256").update(canonicalJsonBytes({
    lineCount: fragment.lineCount,
    paths: uniqueSorted(fragment.locations.map((location) => location.path)),
    tokenCount: fragment.tokenCount
  })).digest("hex");
}

function sortedLocations(
  locations: readonly DuplicateCodeLocation[]
): DuplicateCodeLocation[] {
  return [...locations].sort((left, right) => compareText(
    `${left.path}\u0000${String(left.startLine).padStart(12, "0")}\u0000${String(left.endLine).padStart(12, "0")}`,
    `${right.path}\u0000${String(right.startLine).padStart(12, "0")}\u0000${String(right.endLine).padStart(12, "0")}`
  ));
}

function duplicateRecordLevel(
  codeAreas: readonly string[],
  definitions: Readonly<Record<string, CodeAreaDefinition>>
): RecordLevel | null {
  if (codeAreas.length > 0 && codeAreas.every((codeArea) => (
    definitions[codeArea]?.warningPolicy === "exclude-warnings"
  ))) {
    return null;
  }
  return codeAreas.length > 0 && codeAreas.every((codeArea) => (
    definitions[codeArea]?.warningPolicy === "watchlist-only"
  ))
    ? "info"
    : "warning";
}

function formatLocation(location: DuplicateCodeLocation): string {
  return `${location.path}:${location.startLine}`;
}

function buildRelations(
  candidates: readonly DuplicateRecordCandidate[],
  referenceSubjects: ReadonlySet<string>,
  changedDelta: number
): Map<string, readonly RelationId[]> {
  const relations = new Map<string, readonly RelationId[]>();
  for (const candidate of candidates) {
    if (!candidate.isChanged) {
      relations.set(candidate.subject, Object.freeze([]));
      continue;
    }
    const delta = referenceSubjects.has(candidate.subject) ? 0 : 1;
    const variants: RelationId[] = [];
    if (delta > changedDelta) {
      variants.push("regression");
    } else {
      variants.push("changed");
    }
    relations.set(candidate.subject, Object.freeze(variants));
  }
  return relations;
}

function isInChangedScope(filePath: string, changedFiles: readonly string[]): boolean {
  return changedFiles.some((changedFile) => (
    filePath.includes(changedFile) || changedFile.includes(filePath)
  ));
}

function buildReferenceFacts(
  snapshot: FinalCoreSnapshot,
  referenceName: string | null,
  referenceStatus: ReferenceStatus | null,
  relationsBySubject: ReadonlyMap<string, readonly RelationId[]>
): ReferenceFacts {
  if (referenceName === null || referenceStatus === null) {
    return Object.freeze({ evidence: Object.freeze([]), relations: Object.freeze([]) });
  }
  const relations = snapshot.records
    .filter((record) => (
      record.checkId === "duplicate-detection" && record.recordTypeId === "duplicate-code"
    ))
    .flatMap((record) => (
      (relationsBySubject.get(record.semanticSubject) ?? []).map((relationId) => Object.freeze({
        recordId: record.recordId,
        referenceName,
        relationId
      }))
    ))
    .sort((left, right) => compareText(
      `${left.recordId}\u0000${left.relationId}`,
      `${right.recordId}\u0000${right.relationId}`
    ));
  return Object.freeze({
    evidence: Object.freeze([Object.freeze({
      checkId: "duplicate-detection",
      referenceName,
      status: referenceStatus
    })]),
    relations: Object.freeze(relations)
  });
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort(compareText);
}

function compareText(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}
