import { canonicalJsonText } from "../../data-boundary/canonical-data.ts";
import {
  snapshotClosedArray,
  snapshotClosedPolicyRecord
} from "../../data-boundary/closed-values.ts";
import { isNonEmptyString } from "../../data-boundary/value-shapes.ts";
import type { FindingWaiver } from "../../finding-waivers/reconciliation.ts";

/**
 * Snapshots the shared closed waiver envelope while leaving identity grammar to the producing Check.
 */
export function resolveFindingWaiverAuthoring<Identity>(
  value: unknown,
  resolveIdentity: (value: unknown) => Identity | undefined
): readonly FindingWaiver<Identity>[] | undefined {
  if (value === undefined) return Object.freeze([]);
  const candidates = snapshotClosedArray(value);
  if (candidates === undefined) return undefined;

  const waivers: FindingWaiver<Identity>[] = [];
  const seenIdentities = new Set<string>();
  for (const candidate of candidates) {
    const authored = snapshotClosedPolicyRecord(candidate, { required: ["identity", "reason"] });
    if (authored === undefined || !isNonEmptyString(authored.reason)) return undefined;
    const identity = resolveIdentity(authored.identity);
    if (identity === undefined) return undefined;
    let identityKey: string;
    try {
      identityKey = canonicalJsonText(identity);
    } catch {
      return undefined;
    }
    if (seenIdentities.has(identityKey)) return undefined;
    seenIdentities.add(identityKey);
    waivers.push(Object.freeze({ identity, reason: authored.reason }));
  }
  return Object.freeze(waivers);
}

/** Validates the complete resolved waiver list through the same authoring boundary. */
export function validResolvedFindingWaivers<Identity>(
  value: unknown,
  resolveIdentity: (value: unknown) => Identity | undefined
): value is readonly FindingWaiver<Identity>[] {
  return value !== undefined && resolveFindingWaiverAuthoring(value, resolveIdentity) !== undefined;
}
