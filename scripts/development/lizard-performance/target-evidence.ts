import { runProcessSync } from "../../process-execution/execution.ts";
import { benchmarkRoot, supervisorPath } from "./benchmark-context.ts";
import type { CanonicalMetric, RawSample, ResourceMeasurement } from "./contract.ts";
import { parseJson, record } from "./evidence-shapes.ts";

export interface ChildResult {
  readonly metrics: readonly CanonicalMetric[];
  readonly operationWallMs?: number;
  readonly productDigest?: string;
  readonly scannerExecutable?: string;
  readonly stageScopes?: Record<string, string>;
  readonly stages?: Record<string, number | null>;
}

export interface SupervisorResult {
  readonly exitCode: number;
  readonly resource: ResourceMeasurement;
  readonly stderr: string;
  readonly stdout: string;
  readonly wallMs: number;
}

export interface SampleFromObservationInput {
  readonly block: number;
  readonly child: ChildResult;
  readonly condition: RawSample["condition"];
  readonly observed: SupervisorResult;
  readonly ordinal: number;
  readonly outputDigest: string;
}

export function runTarget(command: readonly string[]): SupervisorResult {
  const result = runProcessSync({
    args: [supervisorPath, JSON.stringify(command)],
    command: "python3",
    cwd: benchmarkRoot,
    maxBuffer: 16 * 1024 * 1024
  });
  if (result.status !== 0) {
    throw new Error(`resource supervisor failed: ${result.stderr || result.stdout}`);
  }
  return parseSupervisorResult(parseJson(result.stdout, "resource supervisor"));
}

export function childValue(observed: SupervisorResult, description: string): ChildResult {
  if (observed.exitCode !== 0) throw new Error(`${description} failed: ${observed.stderr}`);
  return parseChildResult(parseJson(observed.stdout, description));
}

export function sampleFromObservation(input: SampleFromObservationInput): RawSample {
  if (input.child.operationWallMs === undefined) {
    throw new Error(`${input.condition} emitted no counted-operation duration`);
  }
  return Object.freeze({
    block: input.block,
    condition: input.condition,
    observedWallMs: input.observed.wallMs,
    operationWallMs: input.child.operationWallMs,
    ordinal: input.ordinal,
    outputDigest: input.outputDigest,
    ...(input.child.scannerExecutable === undefined
      ? {}
      : { scannerExecutable: input.child.scannerExecutable }),
    sessionDiagnostics: Object.freeze({ resource: input.observed.resource }),
    status: "complete",
    stderr: input.observed.stderr
  });
}

export function isSupportedSupervisorPlatform(platform: string): boolean {
  return platform === "linux";
}

export function parseChildResult(value: unknown): ChildResult {
  const input = record(value);
  if (input === undefined || !Array.isArray(input.metrics)) {
    throw new Error("benchmark target emitted no metrics array");
  }
  const metrics = Object.freeze(Array.from(input.metrics, parseCanonicalMetric));
  const operationWallMs = optionalOperationWallMs(input.operationWallMs);
  const productDigest = optionalString(input.productDigest);
  const scannerExecutable = optionalString(input.scannerExecutable);
  const stages = optionalDurationMap(input.stages, "stages");
  const stageScopes = optionalStringMap(input.stageScopes, "stageScopes");
  return Object.freeze({
    metrics,
    ...(operationWallMs === undefined ? {} : { operationWallMs }),
    ...(productDigest === undefined ? {} : { productDigest }),
    ...(scannerExecutable === undefined ? {} : { scannerExecutable }),
    ...(stageScopes === undefined ? {} : { stageScopes }),
    ...(stages === undefined ? {} : { stages })
  });
}

function parseSupervisorResult(value: unknown): SupervisorResult {
  const input = record(value);
  const resource = input === undefined ? undefined : record(input.resource);
  if (input === undefined || resource === undefined || resource.unit !== "bytes") {
    throw invalidSupervisorEvidence();
  }
  return Object.freeze({
    exitCode: supervisorNumber(input, "exitCode"),
    resource: parseResourceMeasurement(resource),
    stderr: supervisorString(input, "stderr"),
    stdout: supervisorString(input, "stdout"),
    wallMs: supervisorNumber(input, "wallMs")
  });
}

function parseResourceMeasurement(
  resource: Readonly<Record<string, unknown>>
): ResourceMeasurement {
  return Object.freeze({
    cpuScope: supervisorString(resource, "cpuScope"),
    peakRssBytes: supervisorNumber(resource, "peakRssBytes"),
    peakRssScope: supervisorString(resource, "peakRssScope"),
    systemCpuMs: supervisorNumber(resource, "systemCpuMs"),
    unit: "bytes",
    userCpuMs: supervisorNumber(resource, "userCpuMs")
  });
}

function supervisorString(input: Readonly<Record<string, unknown>>, field: string): string {
  const value = input[field];
  if (typeof value !== "string") throw invalidSupervisorEvidence();
  return value;
}

function supervisorNumber(input: Readonly<Record<string, unknown>>, field: string): number {
  const value = input[field];
  if (typeof value !== "number") throw invalidSupervisorEvidence();
  return value;
}

function invalidSupervisorEvidence(): Error {
  return new Error("resource supervisor emitted an invalid evidence shape");
}

function parseCanonicalMetric(value: unknown, index: number): CanonicalMetric {
  const metric = record(value);
  if (metric === undefined) throw invalidMetric(index, "value", "an object");
  const ccn = metric.ccn;
  if (typeof ccn !== "number" && ccn !== null) {
    throw invalidMetric(index, "ccn", "a number or null");
  }
  return Object.freeze({
    ccn,
    endLine: metricNumber(metric, "endLine", index),
    file: metricString(metric, "file", index),
    name: metricString(metric, "name", index),
    nloc: metricNumber(metric, "nloc", index),
    parameterCount: metricNumber(metric, "parameterCount", index),
    startLine: metricNumber(metric, "startLine", index)
  });
}

function optionalOperationWallMs(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function optionalStringMap(
  value: unknown,
  field: "stageScopes"
): Record<string, string> | undefined {
  const source = value === undefined ? undefined : record(value);
  if (source === undefined) return undefined;
  return Object.fromEntries(
    Object.entries(source).map(([key, scope]) => {
      if (typeof scope !== "string") {
        throw new Error(`benchmark target emitted an invalid ${field}.${key} value`);
      }
      return [key, scope];
    })
  );
}

function optionalDurationMap(
  value: unknown,
  field: "stages"
): Record<string, number | null> | undefined {
  const source = value === undefined ? undefined : record(value);
  if (source === undefined) return undefined;
  return Object.fromEntries(
    Object.entries(source).map(([key, duration]) => {
      if (typeof duration !== "number" && duration !== null) {
        throw new Error(`benchmark target emitted an invalid ${field}.${key} duration`);
      }
      return [key, duration];
    })
  );
}

function metricString(
  metric: Readonly<Record<string, unknown>>,
  field: "file" | "name",
  index: number
): string {
  const value = metric[field];
  if (typeof value !== "string") throw invalidMetric(index, field, "a string");
  return value;
}

function metricNumber(
  metric: Readonly<Record<string, unknown>>,
  field: "endLine" | "nloc" | "parameterCount" | "startLine",
  index: number
): number {
  const value = metric[field];
  if (typeof value !== "number") throw invalidMetric(index, field, "a number");
  return value;
}

function invalidMetric(index: number, field: string, requirement: string): Error {
  return new Error(`benchmark target metrics[${index}].${field} must be ${requirement}`);
}
