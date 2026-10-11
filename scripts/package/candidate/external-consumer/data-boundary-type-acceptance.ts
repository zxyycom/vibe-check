/** Public consumer source that proves canonical and closed data contracts from the package root. */
export const DATA_BOUNDARY_TYPE_ACCEPTANCE_SOURCE = String.raw`const closedHeader: Readonly<Record<string, unknown>> | undefined = snapshotExactClosedRecord(
  { kind: "type-acceptance", version: 1 },
  ["kind", "version"] as const
);
const closedFiles: readonly unknown[] | undefined = snapshotClosedArray(["src/index.ts"]);
const canonicalValue: CanonicalJsonValue | undefined = canonicalizeJsonValue({ closedFiles });
const canonicalObject: CanonicalJsonObject | undefined = canonicalizeJsonObject({
  kind: "type-acceptance"
});
const canonicalPrimitive: CanonicalJsonPrimitive = 1;
const staticallyExpressibleNaN: CanonicalJsonPrimitive = Number.NaN;
const canonicalText: string = canonicalJsonText({ canonicalPrimitive });
const canonicalBytes: Uint8Array = canonicalJsonBytes({ canonicalText });
void [closedHeader, canonicalValue, canonicalObject, canonicalBytes, staticallyExpressibleNaN];

const ruleRegion: ProjectFileRegion = { id: "rule", kind: "patterns", patterns: ["**/*.ts"] };
const memberRegion: ProjectFileRegion = { id: "actual", kind: "members", files: ["deleted.ts"] };
const regionSources: ProjectFileRegionSources = {
  fileSources: [["src/a.ts"], ["build/a.ts"]],
  regionSources: [[ruleRegion], [memberRegion]]
};
const relation: ProjectFileRegionIndex = createProjectFileRegionIndex(regionSources);
const fileMembership: readonly string[] | undefined = relation.regionsForFile("src/a.ts");
const regionFiles: readonly string[] | undefined = relation.filesForRegion("rule");
const appendedRelation: ProjectFileRegionIndex = relation.appendSources({ fileSources: [["src/b.ts"]] });
const emptyRelation: ProjectFileRegionIndex = createProjectFileRegionIndex();
// @ts-expect-error index enumeration is readonly.
relation.filePaths.push("mutable.ts");
// @ts-expect-error query results are readonly even after checking the unknown-key branch.
fileMembership?.push("mutable");
// @ts-expect-error patterns regions cannot also carry actual member files.
const mixedRegion: ProjectFileRegion = { id: "invalid", kind: "patterns", patterns: [], files: [] };
void [fileMembership, regionFiles, appendedRelation, emptyRelation, mixedRegion];
`;
