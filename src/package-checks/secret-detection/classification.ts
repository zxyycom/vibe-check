/** A bounded, non-secret classification result for one explicitly selected file. */
export type SecretDetectionInputClassification = Readonly<
  | { readonly kind: "coverage-gap"; readonly reason: SecretDetectionCoverageGapReason }
  | { readonly content: string; readonly kind: "text" }
>;

/** Deterministic reasons why an explicitly selected file did not receive detector coverage. */
export type SecretDetectionCoverageGapReason =
  | "contains-nul"
  | "file-count-limit"
  | "file-byte-limit"
  | "invalid-utf8"
  | "total-byte-limit";

const UTF8_DECODER = new TextDecoder("utf-8", { fatal: true });

/** Classifies already-read bytes without retaining or publishing their content on non-text branches. */
export function classifySecretDetectionBytes(
  bytes: Uint8Array,
  maximumFileBytes: number
): SecretDetectionInputClassification {
  if (bytes.byteLength > maximumFileBytes)
    return Object.freeze({ kind: "coverage-gap", reason: "file-byte-limit" });
  if (bytes.includes(0)) return Object.freeze({ kind: "coverage-gap", reason: "contains-nul" });
  try {
    return Object.freeze({ content: UTF8_DECODER.decode(bytes), kind: "text" });
  } catch {
    return Object.freeze({ kind: "coverage-gap", reason: "invalid-utf8" });
  }
}
