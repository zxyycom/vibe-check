import {
  hasRequiredAndOptionalRecordKeys,
  snapshotClosedRecord
} from "../../data-boundary/closed-values.ts";
import {
  resolveProjectFileSelection,
  snapshotDefaultProjectFileSelection
} from "../project-files/configuration.ts";
import {
  DEFAULT_FINDING_POLICY,
  resolveFindingPolicy,
  type FindingPolicy
} from "../code-quality-findings/policy.ts";
import { DEFAULT_JSCPD_COMMAND } from "./jscpd/command-resolution.ts";
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

interface PolicyRecordKeys {
  readonly optional?: readonly string[];
  readonly required?: readonly string[];
}

/** 校验 constructor input，并将所有可省略 policy 物化为完整、冻结的 Check options。 */
export function resolveDuplicateDetectionOptions(
  value: unknown
): ResolvedDuplicateDetectionOptions | undefined {
  const input = snapshotPolicyRecord(value, {
    optional: ["cache", "codeAreas", "findingPolicy", "scanner"]
  });
  if (input === undefined) return undefined;

  const cache = resolveCache(input.cache);
  const findingPolicy = resolveFindingPolicy(input.findingPolicy, DEFAULT_FINDING_POLICY);
  if (findingPolicy === undefined) return undefined;
  const codeAreas = resolveCodeAreas(input.codeAreas, findingPolicy);
  const scanner = resolveScanner(input.scanner);
  if (cache === undefined || codeAreas === undefined || scanner === undefined) return undefined;

  const options = Object.freeze({ cache, codeAreas, scanner });
  return validResolvedDuplicateDetectionOptions(options) ? options : undefined;
}

function resolveCache(value: unknown): ResolvedDuplicateDetectionOptions["cache"] | undefined {
  if (value === undefined) {
    return Object.freeze({ directory: DEFAULT_CACHE_DIRECTORY, enabled: true });
  }
  const cache = snapshotPolicyRecord(value, { optional: ["directory", "enabled"] });
  if (cache === undefined) return undefined;
  const directory = cache.directory ?? DEFAULT_CACHE_DIRECTORY;
  const enabled = cache.enabled ?? true;
  if (!nonEmptyString(directory) || typeof enabled !== "boolean") return undefined;
  return Object.freeze({ directory, enabled });
}

function resolveCodeAreas(
  value: unknown,
  defaultFindingPolicy: FindingPolicy
): ResolvedDuplicateDetectionOptions["codeAreas"] | undefined {
  if (value === undefined) {
    return Object.freeze({ project: defaultCodeArea(defaultFindingPolicy) });
  }
  const areas = snapshotClosedRecord(value);
  if (areas === undefined || Object.keys(areas).length === 0) return undefined;

  const resolvedEntries: Array<readonly [string, ResolvedDuplicateDetectionCodeAreaOptions]> = [];
  for (const [areaId, candidate] of Object.entries(areas)) {
    if (!nonEmptyString(areaId)) return undefined;
    const area = resolveCodeArea(candidate, defaultFindingPolicy);
    if (area === undefined) return undefined;
    resolvedEntries.push([areaId, area]);
  }
  return Object.freeze(Object.fromEntries(resolvedEntries));
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
  const area = snapshotPolicyRecord(value, {
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
    !positiveSafeInteger(minimumLines) ||
    !positiveSafeInteger(minimumTokens)
  ) {
    return undefined;
  }
  return Object.freeze({ files, findingPolicy, minimumLines, minimumTokens });
}

function resolveScanner(value: unknown): ResolvedDuplicateDetectionScannerOptions | undefined {
  if (value === undefined) return Object.freeze({ command: DEFAULT_JSCPD_COMMAND });
  const scanner = snapshotPolicyRecord(value, { optional: ["command"] });
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
  const custom = snapshotPolicyRecord(command, { required: ["executable", "kind"] });
  if (custom === undefined || custom.kind !== "custom" || !nonEmptyString(custom.executable)) {
    return undefined;
  }
  return Object.freeze({ executable: custom.executable, kind: "custom" });
}

function snapshotPolicyRecord(
  value: unknown,
  keys: PolicyRecordKeys
): Readonly<Record<string, unknown>> | undefined {
  const record = snapshotClosedRecord(value);
  if (
    record === undefined ||
    !hasRequiredAndOptionalRecordKeys(record, {
      optional: keys.optional ?? [],
      required: keys.required ?? []
    })
  ) {
    return undefined;
  }
  return record;
}

function positiveSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}
