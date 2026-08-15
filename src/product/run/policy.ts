import { createHash } from "node:crypto";

import type { CheckDefinition } from "../definition/check-definition.ts";
import type { ProjectDefinition, RunControls } from "../definition/project.ts";
import { createCatalogFingerprint } from "../quality-core/check-record/identity.ts";
import type { CoreSnapshot } from "../quality-core/check-record/model.ts";
import type {
  NamedReferenceIdentity,
  PolicyResolution,
  ReferenceFacts
} from "../quality-core/check-record/policy-model.ts";
import {
  validatePolicyResolution,
  validateReferenceFacts
} from "../quality-core/check-record/policy-validation.ts";
import type { ResolvedCheck } from "./resolved-check.ts";

type PublicCatalog = Readonly<{
  readonly catalogFingerprint: string;
  readonly definitions: readonly CheckDefinition[];
}>;

export function resolveSelectedPolicy(
  definition: ProjectDefinition,
  controls: RunControls,
  definitions: readonly CheckDefinition[]
): PolicyResolution | undefined {
  const catalog = Object.freeze({
    catalogFingerprint: createCatalogFingerprint(definitions).catalogFingerprint,
    definitions
  });
  if (definition.selectedPolicy === null) {
    return controls.comparison === undefined ? neutralPolicy(catalog) : undefined;
  }
  const policy = definition.policies[definition.selectedPolicy];
  if (policy === undefined || !comparisonMatchesPolicy(policy, controls.comparison)) {
    return undefined;
  }
  const references = controls.comparison === undefined
    ? []
    : [referenceIdentity(controls.comparison)];
  const resolution = validatePolicyResolution({ policy, references }, catalog);
  return resolution.ok ? resolution.value : undefined;
}

/**
 * Reference callbacks live on the canonical Resolved Check that created them;
 * no post-join built-in lookup collection is retained.
 */
export function resolveReferenceFacts(
  policy: PolicyResolution,
  snapshot: CoreSnapshot,
  checks: readonly ResolvedCheck[]
): ReferenceFacts | undefined {
  const required = policy.policy?.references.flatMap((requirement) => (
    requirement.checkIds.map((checkId) => ({
      checkId,
      referenceName: requirement.referenceName
    }))
  )) ?? [];
  const requiredPairs = new Set(required.map(({ checkId, referenceName }) => (
    `${checkId}\u0000${referenceName}`
  )));
  const runtimeFacts = checks.flatMap((check) => {
    const resolver = check.binding.kind === "direct" ? check.binding.referenceFacts : undefined;
    return resolver === undefined ? [] : [Object.freeze({
      checkId: check.definition.checkId,
      facts: resolver(snapshot)
    })];
  });
  const evidence = required.map(({ checkId, referenceName }) => {
    const facts = runtimeFacts.find((candidate) => candidate.checkId === checkId)?.facts;
    return facts?.evidence.find((candidate) => (
      candidate.checkId === checkId && candidate.referenceName === referenceName
    )) ?? { checkId, referenceName, status: "unavailable" as const };
  });
  const relations = runtimeFacts.flatMap(({ facts }) => (
    facts.relations.filter((relation) => {
      const record = snapshot.records.find((candidate) => candidate.recordId === relation.recordId);
      return record !== undefined
        && requiredPairs.has(`${record.checkId}\u0000${relation.referenceName}`);
    })
  ));
  const result = validateReferenceFacts({ evidence, relations }, policy, snapshot);
  return result.ok ? result.value : undefined;
}

export function referenceIdentity(
  comparison: NonNullable<RunControls["comparison"]>
): NamedReferenceIdentity {
  return Object.freeze({
    referenceId: `reference/v1/sha256:${createHash("sha256")
      .update(comparison.revision).digest("hex")}`,
    referenceName: comparison.referenceName
  });
}

function neutralPolicy(catalog: PublicCatalog): PolicyResolution | undefined {
  const resolution = validatePolicyResolution({ policy: null, references: [] }, catalog);
  return resolution.ok ? resolution.value : undefined;
}

function comparisonMatchesPolicy(
  policy: ProjectDefinition["policies"][string],
  comparison: RunControls["comparison"]
): boolean {
  const referenceNames = new Set(
    policy.references.map((reference) => reference.referenceName)
  );
  if (referenceNames.size > 1) return false;
  if (referenceNames.size === 0) return comparison === undefined;
  return comparison?.referenceName === [...referenceNames][0];
}
