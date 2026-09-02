import {
  snapshotClosedRecord,
  snapshotExactClosedRecord
} from "../../data-boundary/closed-values.ts";
import { isNonEmptyString, isPositiveSafeInteger } from "../../data-boundary/value-shapes.ts";
import { validProjectFileSelection } from "../project-files/configuration.ts";
import { validFindingPolicy } from "../code-quality-findings/policy.ts";
import { validResolvedFindingWaivers } from "../code-quality-findings/finding-waiver-authoring.ts";
import { resolveDuplicateDetectionFindingIdentity } from "./finding-waiver-identity.ts";

export function validResolvedDuplicateDetectionOptions(value: object): boolean {
  const options = snapshotExactClosedRecord(value, [
    "cache",
    "codeAreas",
    "findingWaivers",
    "scanner"
  ]);
  return (
    options !== undefined &&
    validDuplicateCache(options.cache) &&
    validDuplicateCodeAreas(options.codeAreas) &&
    validResolvedFindingWaivers(options.findingWaivers, resolveDuplicateDetectionFindingIdentity) &&
    validDuplicateDetectionScanner(options.scanner)
  );
}

function validDuplicateCodeAreas(value: unknown): boolean {
  const areas = snapshotClosedRecord(value);
  if (areas === undefined || Object.keys(areas).length === 0) return false;
  return Object.entries(areas).every(([areaId, candidate]) => {
    const area = snapshotExactClosedRecord(candidate, [
      "files",
      "findingPolicy",
      "minimumLines",
      "minimumTokens"
    ]);
    return (
      isNonEmptyString(areaId) &&
      area !== undefined &&
      validProjectFileSelection(area.files) &&
      validFindingPolicy(area.findingPolicy) &&
      isPositiveSafeInteger(area.minimumLines) &&
      isPositiveSafeInteger(area.minimumTokens)
    );
  });
}

function validDuplicateDetectionScanner(value: unknown): boolean {
  const scanner = snapshotExactClosedRecord(value, ["command"]);
  return scanner !== undefined && validJscpdCommand(scanner.command);
}

function validJscpdCommand(value: unknown): boolean {
  const record = snapshotClosedRecord(value);
  if (record?.kind === "package") {
    return Object.keys(record).length === 1;
  }
  const command = snapshotExactClosedRecord(value, ["executable", "kind"]);
  return command?.kind === "custom" && isNonEmptyString(command.executable);
}

function validDuplicateCache(value: unknown): boolean {
  const cache = snapshotExactClosedRecord(value, ["directory", "enabled"]);
  return (
    cache !== undefined && isNonEmptyString(cache.directory) && typeof cache.enabled === "boolean"
  );
}
