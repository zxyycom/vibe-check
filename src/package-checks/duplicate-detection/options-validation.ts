import { snapshotClosedRecord } from "../../data-boundary/closed-values.ts";
import { validProjectFileSelection } from "../project-files/configuration.ts";

function exactRecord(
  value: unknown,
  keys: readonly string[]
): Readonly<Record<string, unknown>> | undefined {
  const record = snapshotClosedRecord(value);
  return record !== undefined &&
    Object.keys(record).length === keys.length &&
    keys.every((key) => Object.hasOwn(record, key))
    ? record
    : undefined;
}

function positiveSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

export function validResolvedDuplicateDetectionOptions(value: object): boolean {
  const options = exactRecord(value, ["cache", "codeAreas", "scanner"]);
  return (
    options !== undefined &&
    validDuplicateCache(options.cache) &&
    validDuplicateCodeAreas(options.codeAreas) &&
    validDuplicateDetectionScanner(options.scanner)
  );
}

function validDuplicateCodeAreas(value: unknown): boolean {
  const areas = snapshotClosedRecord(value);
  if (areas === undefined || Object.keys(areas).length === 0) return false;
  return Object.entries(areas).every(([areaId, candidate]) => {
    const area = exactRecord(candidate, ["files", "minimumLines", "minimumTokens"]);
    return (
      nonEmptyString(areaId) &&
      area !== undefined &&
      validProjectFileSelection(area.files) &&
      positiveSafeInteger(area.minimumLines) &&
      positiveSafeInteger(area.minimumTokens)
    );
  });
}

function validDuplicateDetectionScanner(value: unknown): boolean {
  const scanner = exactRecord(value, ["command"]);
  return scanner !== undefined && validJscpdCommand(scanner.command);
}

function validJscpdCommand(value: unknown): boolean {
  const record = snapshotClosedRecord(value);
  if (record?.kind === "package") {
    return Object.keys(record).length === 1;
  }
  const command = exactRecord(value, ["executable", "kind"]);
  return command?.kind === "custom" && nonEmptyString(command.executable);
}

function validDuplicateCache(value: unknown): boolean {
  const cache = exactRecord(value, ["directory", "enabled"]);
  return (
    cache !== undefined && nonEmptyString(cache.directory) && typeof cache.enabled === "boolean"
  );
}
