// #region package-api-example:data-boundaries
import {
  canonicalizeJsonObject,
  canonicalizeJsonValue,
  canonicalJsonBytes,
  canonicalJsonText,
  snapshotClosedArray,
  snapshotExactClosedRecord,
  type CanonicalJsonObject,
  type CanonicalJsonPrimitive,
  type CanonicalJsonValue
} from "@zxyycom/vibe-check";

const parsedHeader: unknown = { kind: "bundle", version: 1 };
const header = snapshotExactClosedRecord(parsedHeader, ["kind", "version"] as const);
if (header === undefined || typeof header.kind !== "string" || typeof header.version !== "number") {
  throw new TypeError("Expected a closed bundle header.");
}

const parsedFiles: unknown = ["src/index.ts", "src/cli.ts"];
const files = snapshotClosedArray(parsedFiles);
if (files === undefined || !files.every((file) => typeof file === "string")) {
  throw new TypeError("Expected a dense list of file paths.");
}

const version: CanonicalJsonPrimitive = header.version;
const identity = canonicalizeJsonObject({ files, kind: header.kind, version });
if (identity === undefined) throw new TypeError("Expected canonical object identity.");
const objectIdentity: CanonicalJsonObject = identity;
const evidence: CanonicalJsonValue | undefined = canonicalizeJsonValue({ objectIdentity });
if (evidence === undefined) throw new TypeError("Expected canonical JSON evidence.");

const identityText = canonicalJsonText(evidence);
const identityBytes = canonicalJsonBytes(evidence);
if (
  identityText !==
    '{"objectIdentity":{"files":["src/index.ts","src/cli.ts"],"kind":"bundle","version":1}}' ||
  new TextDecoder().decode(identityBytes) !== identityText ||
  !Object.isFrozen(evidence)
) {
  throw new Error("Expected one frozen deterministic identity.");
}
// #endregion package-api-example:data-boundaries
