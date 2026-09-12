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
const canonicalText: string = canonicalJsonText({ canonicalPrimitive });
const canonicalBytes: Uint8Array = canonicalJsonBytes({ canonicalText });
void [closedHeader, canonicalValue, canonicalObject, canonicalBytes];
`;
