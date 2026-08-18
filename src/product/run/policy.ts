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
import type { CheckReferenceSubmission } from "./check-reference-submissions.ts";

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
  const references =
    controls.comparison === undefined ? [] : [referenceIdentity(controls.comparison)];
  const resolution = validatePolicyResolution({ policy, references }, catalog);
  return resolution.ok ? resolution.value : undefined;
}

export function resolveReferenceFacts(
  policy: PolicyResolution,
  snapshot: CoreSnapshot,
  submissions: readonly CheckReferenceSubmission[]
): ReferenceFacts | undefined {
  const required =
    policy.policy?.references.flatMap((requirement) =>
      requirement.checkIds.map((checkId) => ({
        checkId,
        referenceName: requirement.referenceName
      }))
    ) ?? [];
  const evidence = required.map(({ checkId, referenceName }) => {
    const submission = submissions.find(
      (candidate) => candidate.checkId === checkId && candidate.referenceName === referenceName
    );
    return submission === undefined
      ? { checkId, referenceName, status: "unavailable" as const }
      : { checkId, referenceName, status: submission.status };
  });
  const requiredPairs = new Set(
    required.map(({ checkId, referenceName }) => `${checkId}\u0000${referenceName}`)
  );
  const relations = submissions
    .filter((submission) =>
      requiredPairs.has(`${submission.checkId}\u0000${submission.referenceName}`)
    )
    .flatMap((submission) => submission.relations);
  const result = validateReferenceFacts({ evidence, relations }, policy, snapshot);
  return result.ok ? result.value : undefined;
}

export function referenceIdentity(
  comparison: NonNullable<RunControls["comparison"]>
): NamedReferenceIdentity {
  return Object.freeze({
    referenceId: `reference/v1/sha256:${createHash("sha256")
      .update(comparison.revision)
      .digest("hex")}`,
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
  const referenceNames = new Set(policy.references.map((reference) => reference.referenceName));
  if (referenceNames.size > 1) return false;
  if (referenceNames.size === 0) return comparison === undefined;
  return comparison?.referenceName === [...referenceNames][0];
}
