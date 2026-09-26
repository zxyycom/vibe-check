import {
  hasRequiredAndOptionalRecordKeys,
  snapshotClosedArray,
  snapshotClosedRecord
} from "../../data-boundary/closed-values.ts";
import {
  defaultProjectFileSelection,
  resolveProjectFileSelection,
  snapshotProjectFileSelection
} from "../project-files/configuration.ts";
import { DEFAULT_FINDING_POLICY, resolveFindingPolicy } from "../code-quality-findings/policy.ts";
import { resolveFindingWaiverAuthoring } from "../code-quality-findings/finding-waiver-authoring.ts";
import { resolveOptionalLocalCacheOptions } from "../local-cache-options.ts";
import { resolveMarkdownLintFindingIdentity } from "./finding-waiver-identity.ts";
import {
  MARKDOWN_LINT_RULE_NAMES,
  type MarkdownLintRuleName,
  type ResolvedMarkdownLintOptions
} from "./options.ts";
import { validMarkdownLintOptions } from "./options-validation.ts";

const DEFAULT_FILES = Object.freeze({
  exclude: defaultProjectFileSelection.exclude,
  include: Object.freeze(["**/*.[mM][dD]", "**/*.[mM][aA][rR][kK][dD][oO][wW][nN]"]),
  source: defaultProjectFileSelection.source
});
const DEFAULT_LIMITS = Object.freeze({ maxMarkdownBytes: 1_048_576, maxFindings: 10_000 });
const DEFAULT_RULES = Object.freeze(
  MARKDOWN_LINT_RULE_NAMES.filter((rule) => rule !== "link-fragments")
);
const KNOWN_RULES = new Set<string>(MARKDOWN_LINT_RULE_NAMES);

/** Resolves closed partial authoring options into an immutable complete policy. */
export function resolveMarkdownLintOptions(
  value: unknown
): ResolvedMarkdownLintOptions | undefined {
  const input = snapshotClosedRecord(value);
  if (
    input === undefined ||
    !hasRequiredAndOptionalRecordKeys(input, {
      optional: ["files", "findingPolicy", "findingWaivers", "rules", "limits", "cache"],
      required: []
    })
  ) {
    return undefined;
  }
  const files =
    input.files === undefined
      ? snapshotProjectFileSelection(DEFAULT_FILES)
      : resolveProjectFileSelection(input.files, DEFAULT_FILES);
  const findingPolicy = resolveFindingPolicy(input.findingPolicy, DEFAULT_FINDING_POLICY);
  const findingWaivers = resolveFindingWaiverAuthoring(
    input.findingWaivers,
    resolveMarkdownLintFindingIdentity
  );
  const rules = resolveRules(input.rules);
  const limits = resolveLimits(input.limits);
  const cache = resolveOptionalLocalCacheOptions(input.cache);
  const candidate = Object.freeze({
    files,
    findingPolicy,
    findingWaivers,
    rules,
    limits,
    cache
  });
  return validMarkdownLintOptions(candidate) ? candidate : undefined;
}

function resolveRules(value: unknown): readonly MarkdownLintRuleName[] | undefined {
  if (value === undefined) return DEFAULT_RULES;
  const rules = snapshotClosedArray(value);
  if (
    rules === undefined ||
    rules.length === 0 ||
    !rules.every((rule) => typeof rule === "string" && KNOWN_RULES.has(rule)) ||
    new Set(rules).size !== rules.length
  ) {
    return undefined;
  }
  return Object.freeze(
    MARKDOWN_LINT_RULE_NAMES.filter((catalogRule) => rules.includes(catalogRule))
  );
}

function resolveLimits(value: unknown): ResolvedMarkdownLintOptions["limits"] | undefined {
  if (value === undefined) return DEFAULT_LIMITS;
  const limits = snapshotClosedRecord(value);
  if (
    limits === undefined ||
    !hasRequiredAndOptionalRecordKeys(limits, {
      optional: ["maxMarkdownBytes", "maxFindings"],
      required: []
    })
  ) {
    return undefined;
  }
  const maxMarkdownBytes = limits.maxMarkdownBytes ?? DEFAULT_LIMITS.maxMarkdownBytes;
  const maxFindings = limits.maxFindings ?? DEFAULT_LIMITS.maxFindings;
  if (typeof maxMarkdownBytes !== "number" || typeof maxFindings !== "number") return undefined;
  return Object.freeze({ maxMarkdownBytes, maxFindings });
}
