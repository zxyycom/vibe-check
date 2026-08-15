import { createHash } from "node:crypto";

import { resolveCheckTree, validateBuiltInOptionCodeAreas } from "./check-tree/index.ts";
import { parseEffects } from "./effect-validation.ts";
import {
  type CheckNode,
  type ProjectDefinition,
  type ProjectDefinitionDiagnostic,
  type SchedulerPolicy,
  type ValidationResult
} from "./project.ts";
import { parseQualityConfiguration } from "./quality.ts";
import { createCatalogFingerprint } from "../quality-core/check-record/identity.ts";
import type { CheckDefinition } from "./check-definition.ts";
import type { DecisionPolicy } from "../quality-core/check-record/policy-model.ts";
import { validatePolicyResolution } from "../quality-core/check-record/policy-validation.ts";
import {
  snapshotClosedArray,
  snapshotClosedRecord
} from "../quality-core/check-record/plain-record-values.ts";
import { parseOperationalDependencies } from "../scanner-dependencies/index.ts";

const PROJECT_DEFINITION_KEYS = [
  "apiVersion",
  "checks",
  "effects",
  "operationalDependencies",
  "policies",
  "quality",
  "scheduler",
  "selectedPolicy"
] as const;

type PolicyReferenceIdentity = Readonly<{
  readonly referenceId: string;
  readonly referenceName: string;
}>;

export function validateProjectDefinition(value: unknown): ValidationResult<ProjectDefinition> {
  try {
    return validateProjectDefinitionValue(value);
  } catch {
    return invalidDefinition("definition");
  }
}

function validateProjectDefinitionValue(value: unknown): ValidationResult<ProjectDefinition> {
  const data = exactProjectDefinition(value);
  if (!data.ok) return data;
  return parseProjectDefinitionFields(data.value);
}

function parseProjectDefinitionFields(
  data: Readonly<Record<string, unknown>>
): ValidationResult<ProjectDefinition> {
  const quality = parseQualityConfiguration(data.quality);
  if (quality === undefined) return invalidDefinition("definition.quality");
  const scheduler = parseScheduler(data.scheduler);
  if (scheduler === undefined) return invalidDefinition("definition.scheduler");
  const checks = snapshotClosedArray(data.checks);
  if (checks === undefined) return invalidDefinition("definition.checks");
  const tree = resolveCheckTree(checks, scheduler.maxParallel);
  if (tree === undefined || !validateBuiltInOptionCodeAreas(tree, quality.codeAreas)) {
    return invalidDefinition("definition.checks");
  }
  const effects = parseEffects(data.effects);
  if (effects === undefined) return invalidDefinition("definition.effects");
  const dependencies = parseOperationalDependencies(data.operationalDependencies);
  if (dependencies === undefined) return invalidDefinition("definition.operationalDependencies");
  const definitions = tree.leaves.map((leaf) => leaf.definition);
  const policies = parsePolicies(data.policies, definitions);
  if (policies === undefined) return invalidDefinition("definition.policies");
  const selectedPolicy = data.selectedPolicy;
  if (!isSelectedPolicy(selectedPolicy, policies)) return invalidDefinition("definition.selectedPolicy");
  return Object.freeze({
    ok: true,
    value: {
      apiVersion: "1" as const,
      checks: checks as readonly CheckNode[],
      effects,
      operationalDependencies: dependencies,
      policies,
      quality,
      scheduler,
      selectedPolicy
    }
  });
}

function exactProjectDefinition(value: unknown): ValidationResult<Readonly<Record<string, unknown>>> {
  const data = exactRecord(value, PROJECT_DEFINITION_KEYS, "invalid-project-definition", "definition");
  if (!data.ok) return data;
  return data.value.apiVersion === "1"
    ? data
    : invalidDefinition("definition.apiVersion");
}

function exactRecord(
  value: unknown,
  allowedKeys: readonly string[],
  kind: ProjectDefinitionDiagnostic["kind"],
  path: string
): ValidationResult<Readonly<Record<string, unknown>>> {
  const data = snapshotClosedRecord(value);
  if (data === undefined) return invalid(kind, path, "invalid-value");
  const unknownKey = Object.keys(data).find((key) => !allowedKeys.includes(key));
  if (unknownKey !== undefined) return invalid(kind, `${path}.${unknownKey}`, "unknown-key");
  return Object.freeze({ ok: true, value: data });
}

function parsePolicies(
  value: unknown,
  definitions: readonly CheckDefinition[]
): Readonly<Record<string, DecisionPolicy>> | undefined {
  const data = snapshotClosedRecord(value);
  if (data === undefined) return undefined;
  const catalog = Object.freeze({
    catalogFingerprint: createCatalogFingerprint(definitions).catalogFingerprint,
    definitions
  });
  const policies: Record<string, DecisionPolicy> = {};
  for (const [name, policy] of Object.entries(data)) {
    const references = policyReferences(policy);
    if (references === undefined) return undefined;
    const validated = validatePolicyResolution({ policy, references }, catalog);
    if (!validated.ok || validated.value.policy === null) return undefined;
    policies[name] = validated.value.policy;
  }
  return Object.freeze(policies);
}

function policyReferences(
  policy: unknown
): readonly PolicyReferenceIdentity[] | undefined {
  const data = snapshotClosedRecord(policy);
  const references = data === undefined ? undefined : snapshotClosedArray(data.references);
  if (data === undefined || typeof data.policyId !== "string" || references === undefined) {
    return undefined;
  }
  const policyId = data.policyId;
  const referenceNames: string[] = [];
  for (const reference of references) {
    const referenceData = snapshotClosedRecord(reference);
    if (referenceData === undefined || typeof referenceData.referenceName !== "string") return undefined;
    referenceNames.push(referenceData.referenceName);
  }
  return hasSingleReferenceName(referenceNames)
    ? Object.freeze(referenceNames.map((referenceName) => policyReference(policyId, referenceName)))
    : undefined;
}

function hasSingleReferenceName(referenceNames: readonly string[]): boolean {
  return new Set(referenceNames).size <= 1;
}

function policyReference(policyId: string, referenceName: string): PolicyReferenceIdentity {
  return Object.freeze({
    referenceId: `reference/v1/sha256:${createHash("sha256")
      .update(`${policyId}\u0000${referenceName}`).digest("hex")}`,
    referenceName
  });
}

function parseScheduler(value: unknown): SchedulerPolicy | undefined {
  const data = exactKeys(value, ["maxParallel"]);
  return typeof data?.maxParallel === "number" && Number.isSafeInteger(data.maxParallel)
    && data.maxParallel > 0
    ? Object.freeze({ maxParallel: data.maxParallel })
    : undefined;
}

function isSelectedPolicy(
  selectedPolicy: unknown,
  policies: Readonly<Record<string, DecisionPolicy>>
): selectedPolicy is string | null {
  return selectedPolicy === null || (typeof selectedPolicy === "string" && Object.hasOwn(policies, selectedPolicy));
}

function exactKeys(value: unknown, keys: readonly string[]): Readonly<Record<string, unknown>> | undefined {
  const data = snapshotClosedRecord(value);
  if (data === undefined) return undefined;
  return Object.keys(data).length === keys.length && keys.every((key) => Object.hasOwn(data, key))
    ? data
    : undefined;
}

function invalidDefinition(path: string): ValidationResult<never> {
  return invalid("invalid-project-definition", path, "invalid-value");
}

function invalid(
  kind: ProjectDefinitionDiagnostic["kind"],
  path: string,
  reason: ProjectDefinitionDiagnostic["reason"]
): ValidationResult<never> {
  return Object.freeze({ ok: false, error: Object.freeze({ kind, path, reason }) });
}
