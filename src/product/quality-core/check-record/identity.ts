import { canonicalJsonText } from "./canonical-data.ts";

/** Emits canonical UTF-8 JSON without invoking author getters or `toJSON`. */
export function canonicalJsonBytes(value: unknown): Uint8Array {
  return new TextEncoder().encode(canonicalJsonText(value));
}

/** Retained only for Check-local domain normalization; it is not a Record identity API. */
export function normalizeSemanticSubject(subject: string): string {
  return subject.replaceAll("\r\n", "\n").replaceAll("\r", "\n").normalize("NFC");
}
