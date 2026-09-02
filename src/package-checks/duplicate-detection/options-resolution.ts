import {
  snapshotClosedPolicyRecord,
  snapshotClosedRecord
} from "../../data-boundary/closed-values.ts";
import { isNonEmptyString, isPositiveSafeInteger } from "../../data-boundary/value-shapes.ts";
import {
  resolveProjectFileSelection,
  snapshotDefaultProjectFileSelection
} from "../project-files/configuration.ts";
import {
  DEFAULT_FINDING_POLICY,
  resolveCodeAreaPolicyMap,
  resolveFindingPolicy,
  type FindingPolicy
} from "../code-quality-findings/policy.ts";
import { resolveFindingWaiverAuthoring } from "../code-quality-findings/finding-waiver-authoring.ts";
import { DEFAULT_JSCPD_COMMAND } from "./jscpd/command-resolution.ts";
import { resolveDuplicateDetectionFindingIdentity } from "./finding-waiver-identity.ts";
import type {
  DuplicateDetectionScannerCommand,
  ResolvedDuplicateDetectionCodeAreaOptions,
  ResolvedDuplicateDetectionOptions,
  ResolvedDuplicateDetectionScannerOptions
} from "./options.ts";
import { validResolvedDuplicateDetectionOptions } from "./options-validation.ts";

const DEFAULT_CACHE_DIRECTORY = ".cache/vibe-check";
const DEFAULT_MINIMUM_LINES = 4;
const DEFAULT_MINIMUM_TOKENS = 100;

/** 校验 constructor input，并将所有可省略 policy 物化为完整、冻结的 Check options。 */
export function resolveDuplicateDetectionOptions(
  value: unknown
): ResolvedDuplicateDetectionOptions | undefined {
  const input = snapshotClosedPolicyRecord(value, {
    optional: ["cache", "codeAreas", "findingPolicy", "findingWaivers", "scanner"]
  });
  if (input === undefined) return undefined;

  const cache = resolveCache(input.cache);
  const findingPolicy = resolveFindingPolicy(input.findingPolicy, DEFAULT_FINDING_POLICY);
  if (findingPolicy === undefined) return undefined;
  const codeAreas = resolveCodeAreas(input.codeAreas, findingPolicy);
  const findingWaivers = resolveFindingWaiverAuthoring(
    input.findingWaivers,
    resolveDuplicateDetectionFindingIdentity
  );
  const scanner = resolveScanner(input.scanner);
  if (
    cache === undefined ||
    codeAreas === undefined ||
    findingWaivers === undefined ||
    scanner === undefined
  )
    return undefined;

  const options = Object.freeze({ cache, codeAreas, findingWaivers, scanner });
  return validResolvedDuplicateDetectionOptions(options) ? options : undefined;
}

function resolveCache(value: unknown): ResolvedDuplicateDetectionOptions["cache"] | undefined {
  if (value === undefined) {
    return Object.freeze({ directory: DEFAULT_CACHE_DIRECTORY, enabled: true });
  }
  const cache = snapshotClosedPolicyRecord(value, { optional: ["directory", "enabled"] });
  if (cache === undefined) return undefined;
  const directory = cache.directory ?? DEFAULT_CACHE_DIRECTORY;
  const enabled = cache.enabled ?? true;
  if (!isNonEmptyString(directory) || typeof enabled !== "boolean") return undefined;
  return Object.freeze({ directory, enabled });
}

function resolveCodeAreas(
  value: unknown,
  defaultFindingPolicy: FindingPolicy
): ResolvedDuplicateDetectionOptions["codeAreas"] | undefined {
  return resolveCodeAreaPolicyMap(
    value,
    () => defaultCodeArea(defaultFindingPolicy),
    (candidate) => resolveCodeArea(candidate, defaultFindingPolicy)
  );
}

function defaultCodeArea(findingPolicy: FindingPolicy): ResolvedDuplicateDetectionCodeAreaOptions {
  return Object.freeze({
    files: snapshotDefaultProjectFileSelection(),
    findingPolicy,
    minimumLines: DEFAULT_MINIMUM_LINES,
    minimumTokens: DEFAULT_MINIMUM_TOKENS
  });
}

function resolveCodeArea(
  value: unknown,
  defaultFindingPolicy: FindingPolicy
): ResolvedDuplicateDetectionCodeAreaOptions | undefined {
  const area = snapshotClosedPolicyRecord(value, {
    optional: ["findingPolicy", "minimumLines", "minimumTokens"],
    required: ["files"]
  });
  if (area === undefined) return undefined;
  const files = resolveProjectFileSelection(area.files);
  const findingPolicy = resolveFindingPolicy(area.findingPolicy, defaultFindingPolicy);
  const minimumLines = area.minimumLines ?? DEFAULT_MINIMUM_LINES;
  const minimumTokens = area.minimumTokens ?? DEFAULT_MINIMUM_TOKENS;
  if (
    files === undefined ||
    findingPolicy === undefined ||
    !isPositiveSafeInteger(minimumLines) ||
    !isPositiveSafeInteger(minimumTokens)
  ) {
    return undefined;
  }
  return Object.freeze({ files, findingPolicy, minimumLines, minimumTokens });
}

function resolveScanner(value: unknown): ResolvedDuplicateDetectionScannerOptions | undefined {
  if (value === undefined) return Object.freeze({ command: DEFAULT_JSCPD_COMMAND });
  const scanner = snapshotClosedPolicyRecord(value, { optional: ["command"] });
  if (scanner === undefined) return undefined;
  const command = resolveScannerCommand(scanner.command);
  return command === undefined ? undefined : Object.freeze({ command });
}

function resolveScannerCommand(value: unknown): DuplicateDetectionScannerCommand | undefined {
  if (value === undefined) return DEFAULT_JSCPD_COMMAND;
  const command = snapshotClosedRecord(value);
  if (command?.kind === "package") {
    return Object.keys(command).length === 1 ? DEFAULT_JSCPD_COMMAND : undefined;
  }
  if (command?.kind !== "custom") return undefined;
  const custom = snapshotClosedPolicyRecord(command, { required: ["executable", "kind"] });
  if (custom === undefined || custom.kind !== "custom" || !isNonEmptyString(custom.executable)) {
    return undefined;
  }
  return Object.freeze({ executable: custom.executable, kind: "custom" });
}
