import { snapshotExactClosedRecord } from "../../data-boundary/closed-values.ts";
import { isPositiveSafeInteger } from "../../data-boundary/value-shapes.ts";
import { validResolvedFindingWaivers } from "../code-quality-findings/finding-waiver-authoring.ts";
import { validProjectFileSelection } from "../project-files/configuration.ts";
import { resolveSecretDetectionFindingIdentity } from "./finding-waiver-identity.ts";
import type { ResolvedSecretDetectionOptions } from "./options.ts";

/** Guards prepared options before a Run invokes a detector. */
export function validSecretDetectionOptions(
  value: unknown
): value is ResolvedSecretDetectionOptions {
  const options = snapshotExactClosedRecord(value, [
    "files",
    "findingWaivers",
    "maximumFileBytes",
    "maximumFileCount",
    "maximumTotalBytes"
  ]);
  return (
    options !== undefined &&
    validProjectFileSelection(options.files) &&
    validResolvedFindingWaivers(options.findingWaivers, resolveSecretDetectionFindingIdentity) &&
    isPositiveSafeInteger(options.maximumFileBytes) &&
    isPositiveSafeInteger(options.maximumFileCount) &&
    isPositiveSafeInteger(options.maximumTotalBytes)
  );
}
