import type { Check } from "@zxyycom/vibe-check";

import { isStringArray } from "../../../value-guards.ts";
import { PROJECT_GATE_PRESETS, type ProjectGatePreset } from "./catalog.ts";
import { isProjectGateScope, type ProjectGateScope } from "./change-regions.ts";

const CHECK_ID_PATTERN = /^[a-z][a-z0-9-]*$/u;
const PROJECT_GATE_RELATIONS = ["dependsOn", "observes"] as const;

type ProjectGateRelation = (typeof PROJECT_GATE_RELATIONS)[number];
export type ProjectGateSelectionPolicy = "routine" | "release-only" | "explicit-only";

// Automatic selections of an observer must also select the observed entry.
// Explicit-only observers have no automatic selection obligation; presets below
// independently check every focused path.
const OBSERVED_POLICIES_BY_OBSERVER_POLICY: Readonly<
  Record<ProjectGateSelectionPolicy, readonly ProjectGateSelectionPolicy[]>
> = {
  routine: ["routine"],
  "release-only": ["routine", "release-only"],
  "explicit-only": ["routine", "release-only", "explicit-only"]
};

/** Project-local selection metadata for one ordinary Check value. */
export interface ProjectGateEntry {
  readonly check: Check;
  readonly presets: readonly ProjectGatePreset[];
  readonly fast: boolean | "always";
  /** Explicit domain selections in addition to the affected-input region. */
  readonly scopes?: readonly ProjectGateScope[];
  /** Defaults to routine; non-routine work never joins changed/all fallback. */
  readonly selectionPolicy?: ProjectGateSelectionPolicy;
  /** Routine entries without a region always participate in incremental selections. */
  readonly changeRegion?: string;
}

/** Gate-owned scheduling metadata supplied before manifest normalization. */
export interface ProjectGateEntryDeclaration extends ProjectGateEntry {
  readonly mutex?: readonly string[];
  readonly resourceClaims?: Readonly<Record<string, number>>;
}

/** Validates the manifest, then projects Gate-owned scheduling fields onto ordinary Checks. */
export function defineProjectGateEntries(
  entries: readonly ProjectGateEntryDeclaration[]
): readonly ProjectGateEntry[] {
  const entriesByCheckId = new Map<string, ProjectGateEntry>();
  for (const entry of entries) validateProjectGateEntryMetadata(entry, entriesByCheckId);
  for (const entry of entries) validateProjectGateEntryRelations(entry, entriesByCheckId);
  return Object.freeze(
    entries.map(
      ({ check, changeRegion, fast, mutex, presets, resourceClaims, selectionPolicy, scopes }) =>
        Object.freeze({
          check:
            mutex === undefined && resourceClaims === undefined
              ? check
              : Object.freeze({
                  ...check,
                  ...(mutex === undefined ? {} : { mutex: Object.freeze([...mutex]) }),
                  ...(resourceClaims === undefined
                    ? {}
                    : { resourceClaims: Object.freeze({ ...resourceClaims }) })
                }),
          presets: Object.freeze([...presets]),
          fast,
          ...(scopes === undefined ? {} : { scopes: Object.freeze([...scopes]) }),
          ...(selectionPolicy === undefined ? {} : { selectionPolicy }),
          ...(changeRegion === undefined ? {} : { changeRegion })
        })
    )
  );
}

function validateProjectGateEntryRelations(
  entry: ProjectGateEntry,
  entriesByCheckId: ReadonlyMap<string, ProjectGateEntry>
): void {
  for (const relation of PROJECT_GATE_RELATIONS) {
    const checkIds = entry.check[relation] ?? [];
    if (!isStringArray(checkIds)) {
      throw new TypeError(
        `Project Gate ${relation} relation is not an exact collection: ${entry.check.checkId}`
      );
    }
    for (const checkId of checkIds) {
      validateProjectGateRelation(entry, relation, checkId, entriesByCheckId);
    }
  }
}

function validateProjectGateRelation(
  entry: ProjectGateEntry,
  relation: ProjectGateRelation,
  checkId: string,
  entriesByCheckId: ReadonlyMap<string, ProjectGateEntry>
): void {
  if (checkId === entry.check.checkId) {
    const action = relation === "dependsOn" ? "depend on" : "observe";
    throw new TypeError(`Project Gate Check cannot ${action} itself: ${entry.check.checkId}`);
  }
  const relatedEntry = entriesByCheckId.get(checkId);
  if (relatedEntry === undefined) {
    throw new TypeError(
      `Project Gate ${relation} relation is missing: ${entry.check.checkId} -> ${checkId}`
    );
  }
  if (relation === "observes") validateProjectGateObservationSelection(entry, relatedEntry);
}

/** Keeps Gate observers readable; Product flag propagation intentionally excludes observes. */
function validateProjectGateObservationSelection(
  entry: ProjectGateEntry,
  observedEntry: ProjectGateEntry
): void {
  const policy = entry.selectionPolicy ?? "routine";
  const observedPolicy = observedEntry.selectionPolicy ?? "routine";
  if (!OBSERVED_POLICIES_BY_OBSERVER_POLICY[policy].includes(observedPolicy)) {
    throw new TypeError(
      `Project Gate observes relation is not selection-policy closed: ${entry.check.checkId} -> ${observedEntry.check.checkId}`
    );
  }
  if (policy === "routine") validateRoutineObservationSelection(entry, observedEntry);
  if (entry.presets.some((preset) => !observedEntry.presets.includes(preset))) {
    throw new TypeError(
      `Project Gate observes relation is not preset-selection closed: ${entry.check.checkId} -> ${observedEntry.check.checkId}`
    );
  }
}

/** Routine observers must be closed under both incremental input and explicit scope selection. */
function validateRoutineObservationSelection(
  entry: ProjectGateEntry,
  observedEntry: ProjectGateEntry
): void {
  validateFastObservationSelection(entry, observedEntry);
  validateDomainObservationSelection(entry, observedEntry);
  if (
    observedEntry.changeRegion !== undefined &&
    entry.changeRegion !== observedEntry.changeRegion
  ) {
    throw new TypeError(
      `Project Gate observes relation is not changed-selection closed: ${entry.check.checkId} -> ${observedEntry.check.checkId}`
    );
  }
  if (
    entry.changeRegion !== undefined &&
    observedEntry.changeRegion === undefined &&
    observedEntry.fast === false
  ) {
    throw new TypeError(
      `Project Gate observes relation is not scope-selection closed: ${entry.check.checkId} -> ${observedEntry.check.checkId}`
    );
  }
}

function isFixedFastEntry(entry: ProjectGateEntry): boolean {
  return entry.fast === "always" || (entry.fast === true && entry.changeRegion === undefined);
}

function validateFastObservationSelection(
  entry: ProjectGateEntry,
  observedEntry: ProjectGateEntry
): void {
  if (entry.fast !== false && observedEntry.fast === false) {
    throw new TypeError(
      `Project Gate observes relation is not fast-selection closed: ${entry.check.checkId} -> ${observedEntry.check.checkId}`
    );
  }
  if (isFixedFastEntry(entry) && !isFixedFastEntry(observedEntry)) {
    throw new TypeError(
      `Project Gate observes relation is not baseline-selection closed: ${entry.check.checkId}`
    );
  }
}

function validateDomainObservationSelection(
  entry: ProjectGateEntry,
  observedEntry: ProjectGateEntry
): void {
  if (entry.scopes === undefined || isFixedFastEntry(observedEntry)) return;
  const observedScopes = new Set([
    ...(observedEntry.scopes ?? []),
    ...(observedEntry.changeRegion === undefined ? [] : [observedEntry.changeRegion])
  ]);
  if (entry.scopes.some((scope) => !observedScopes.has(scope))) {
    throw new TypeError(
      `Project Gate observes relation is not domain-selection closed: ${entry.check.checkId}`
    );
  }
}

function validateProjectGateEntryMetadata(
  entry: ProjectGateEntry,
  entriesByCheckId: Map<string, ProjectGateEntry>
): void {
  validateProjectGateEntryIdentity(entry.check, entriesByCheckId);
  validateProjectGateEntrySelection(entry);
  entriesByCheckId.set(entry.check.checkId, entry);
}

function validateProjectGateEntryIdentity(
  check: Check,
  entriesByCheckId: ReadonlyMap<string, ProjectGateEntry>
): void {
  if (!CHECK_ID_PATTERN.test(check.checkId))
    throw new TypeError(`Project Gate Check ID is invalid: ${check.checkId}`);
  if (entriesByCheckId.has(check.checkId))
    throw new TypeError(`Project Gate Check ID is duplicated: ${check.checkId}`);
  if (check.enabledByFlags !== undefined)
    throw new TypeError(`Project Gate Check already owns enabledByFlags: ${check.checkId}`);
}

function validateProjectGateEntrySelection(entry: ProjectGateEntry): void {
  const { check, changeRegion, fast, presets } = entry;
  if (typeof fast !== "boolean" && fast !== "always")
    throw new TypeError(`Project Gate entry fast marker is invalid: ${check.checkId}`);
  validateProjectGateEntryScopes(entry);
  if (
    changeRegion !== undefined &&
    (typeof changeRegion !== "string" || !CHECK_ID_PATTERN.test(changeRegion))
  )
    throw new TypeError(`Project Gate entry change region is invalid: ${check.checkId}`);
  if (!isStringArray(presets))
    throw new TypeError(`Project Gate entry presets are not an exact collection: ${check.checkId}`);
  if (presets.some((preset) => !PROJECT_GATE_PRESETS.includes(preset)))
    throw new TypeError(`Project Gate entry has an unknown preset: ${check.checkId}`);
  if (new Set(presets).size !== presets.length)
    throw new TypeError(`Project Gate entry has duplicated presets: ${check.checkId}`);
  validateProjectGateEntryPolicy(entry);
}

function validateProjectGateEntryScopes(entry: ProjectGateEntry): void {
  if (
    entry.scopes !== undefined &&
    (!isStringArray(entry.scopes) ||
      !entry.scopes.every(isProjectGateScope) ||
      new Set(entry.scopes).size !== entry.scopes.length)
  ) {
    throw new TypeError(`Project Gate entry scopes are invalid: ${entry.check.checkId}`);
  }
}

/** Non-routine policies cannot also declare incremental obligations. */
function validateProjectGateEntryPolicy(entry: ProjectGateEntry): void {
  const { check, selectionPolicy, fast, changeRegion, presets } = entry;
  if (selectionPolicy === undefined || selectionPolicy === "routine") return;
  if (selectionPolicy !== "release-only" && selectionPolicy !== "explicit-only")
    throw new TypeError(`Project Gate entry selection policy is invalid: ${check.checkId}`);
  if (fast !== false || changeRegion !== undefined || entry.scopes !== undefined)
    throw new TypeError(
      `Project Gate non-routine entry has routine selection metadata: ${check.checkId}`
    );
  if (selectionPolicy === "explicit-only" && presets.length === 0)
    throw new TypeError(`Project Gate explicit entry has no preset: ${check.checkId}`);
}
