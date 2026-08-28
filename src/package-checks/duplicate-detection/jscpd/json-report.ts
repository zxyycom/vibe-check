import { isNonArrayRecord } from "../../../data-boundary/value-shapes.ts";
import { errorMessage } from "../../host-environment/error-message.ts";
import type { ExactInputMeasurement } from "../../project-files/exact-input-measurement.ts";
import { normalizeScannerReportedPath } from "../../project-files/reported-path.ts";
import type { DuplicateCodeFragment, DuplicateCodeLocation } from "../measurement-model.ts";
import { toScopedJscpdMeasurement } from "./scoped-fragments.ts";
import type { JscpdScanResult } from "./scanner-contract.ts";

type JscpdFileLocation = Readonly<{
  readonly end?: unknown;
  readonly endLoc?: unknown;
  readonly name?: unknown;
  readonly start?: unknown;
  readonly startLoc?: unknown;
}>;

export function parseJscpdJsonReport(json: string, cwd: string): JscpdScanResult {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!isNonArrayRecord(parsed)) {
      throw new Error("jscpd JSON report must be an object");
    }

    const duplicates = parsed.duplicates;
    if (!Array.isArray(duplicates)) {
      throw new Error("jscpd JSON report must include duplicates array");
    }

    return { ok: true, measurements: parseJscpdMeasurements(duplicates, cwd) };
  } catch (error: unknown) {
    return {
      ok: false,
      error: `Failed to parse jscpd JSON: ${errorMessage(error)}`,
      reason: "jscpd-parse-failure"
    };
  }
}

function parseJscpdMeasurements(
  duplicates: readonly unknown[],
  cwd: string
): ExactInputMeasurement<DuplicateCodeFragment>[] {
  const measurements: ExactInputMeasurement<DuplicateCodeFragment>[] = [];

  for (const [index, duplication] of duplicates.entries()) {
    if (!isNonArrayRecord(duplication)) {
      throw new Error(`jscpd duplicate #${index + 1} must be an object`);
    }
    const fragment = parseJscpdFragment(duplication, cwd, index + 1);
    measurements.push(toScopedJscpdMeasurement(fragment));
  }

  return measurements.sort((a, b) => b.payload.tokenCount - a.payload.tokenCount);
}

function parseJscpdFragment(
  duplication: Record<string, unknown>,
  cwd: string,
  id: number
): DuplicateCodeFragment {
  const lineCount = integerField(duplication, "lines");
  const tokenCount = integerField(duplication, "tokens");
  const locations = parseJscpdLocations(duplication, cwd, lineCount);

  return {
    id,
    tokenCount,
    lineCount,
    locations,
    codeAreas: []
  };
}

function parseJscpdLocations(
  duplication: Record<string, unknown>,
  cwd: string,
  lineCount: number
): DuplicateCodeLocation[] {
  return [
    parseJscpdLocationObject(duplication.firstFile, "firstFile"),
    parseJscpdLocationObject(duplication.secondFile, "secondFile")
  ].map((location) => parseJscpdLocation(location, cwd, lineCount));
}

function parseJscpdLocationObject(value: unknown, name: string): JscpdFileLocation {
  if (!isNonArrayRecord(value)) {
    throw new Error(`jscpd duplicate must include ${name} location object`);
  }
  return value;
}

function parseJscpdLocation(
  location: JscpdFileLocation,
  cwd: string,
  lineCount: number
): DuplicateCodeLocation {
  const filePath = stringField(location, "name");
  const startLine =
    nestedIntegerField(location, "startLoc", "line") ?? integerField(location, "start");
  const endLine = nestedIntegerField(location, "endLoc", "line") ?? integerField(location, "end");

  return {
    path: normalizeScannerReportedPath(filePath, cwd),
    startLine,
    endLine: endLine || startLine + Math.max(0, lineCount - 1)
  };
}

function integerField(record: Record<string, unknown>, name: string): number {
  const value = record[name];
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new Error(`jscpd field "${name}" must be a safe integer`);
  }
  return value;
}

function nestedIntegerField(
  record: Record<string, unknown>,
  parent: string,
  child: string
): number | null {
  const parentValue = record[parent];
  if (!isNonArrayRecord(parentValue)) return null;
  const value = parentValue[child];
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new Error(`jscpd field "${parent}.${child}" must be a safe integer`);
  }
  return value;
}

function stringField(record: Record<string, unknown>, name: string): string {
  const value = record[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`jscpd field "${name}" must be a non-empty string`);
  }
  return value;
}
