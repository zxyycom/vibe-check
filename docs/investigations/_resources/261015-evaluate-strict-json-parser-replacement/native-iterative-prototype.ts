import type { StrictJsonDocumentResult, StrictJsonValue } from "./momoa-control.ts";

/** Investigation prototype, not an adopted Product parser or a general JSON lexer. */
export function inspectNativeBytes(bytes: Uint8Array): StrictJsonDocumentResult {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf)
    return Object.freeze({ kind: "issue", reason: "bom" });
  let source: string;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return Object.freeze({ kind: "issue", reason: "invalid-utf8" });
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch (error) {
    return error instanceof SyntaxError
      ? Object.freeze({ kind: "issue", reason: "invalid-json" })
      : Object.freeze({ kind: "unavailable" });
  }
  try {
    if (hasDecodedDuplicate(source))
      return Object.freeze({ kind: "issue", reason: "duplicate-key" });
    return Object.freeze({ kind: "valid", jsonValue: projectNativeValue(parsed) });
  } catch {
    return Object.freeze({ kind: "unavailable" });
  }
}

/** Called only AFTER complete native grammar acceptance; it does not decide syntax validity. */
function hasDecodedDuplicate(source: string): boolean {
  const frames: (Set<string> | null)[] = [];
  for (let offset = 0; offset < source.length; offset += 1) {
    const character = source[offset];
    if (character === "{") frames.push(new Set<string>());
    else if (character === "[") frames.push(null);
    else if (character === "}" || character === "]") frames.pop();
    else if (character === '"') {
      const start = offset;
      let hasEscape = false;
      offset += 1;
      while (offset < source.length && source[offset] !== '"') {
        if (source[offset] === "\\") {
          hasEscape = true;
          offset += 1;
        }
        offset += 1;
      }
      if (offset === source.length) throw new Error("accepted string has no closing quote");
      let next = offset + 1;
      while (isJsonWhitespace(source.charCodeAt(next))) next += 1;
      if (source[next] !== ":") continue;
      const frame = frames.at(-1);
      if (frame === undefined || frame === null) throw new Error("key outside accepted object");
      const key: unknown = hasEscape
        ? JSON.parse(source.slice(start, offset + 1))
        : source.slice(start + 1, offset);
      if (typeof key !== "string") throw new Error("accepted key is not a string");
      if (frame.has(key)) return true;
      frame.add(key);
    }
  }
  if (frames.length !== 0) throw new Error("accepted container is not closed");
  return false;
}

function isJsonWhitespace(code: number): boolean {
  return code === 0x20 || code === 0x09 || code === 0x0a || code === 0x0d;
}

/** Preserve private null-prototype/frozen aggregates, including -0 and numeric overflow. */
function projectNativeValue(value: unknown): StrictJsonValue {
  const pending: unknown[] = [value];
  while (pending.length > 0) {
    const aggregate = pending.pop();
    if (typeof aggregate !== "object" || aggregate === null) continue;
    if (!Array.isArray(aggregate)) Object.setPrototypeOf(aggregate, null);
    for (const child of Object.values(aggregate)) {
      if (typeof child === "object" && child !== null) pending.push(child);
    }
    Object.freeze(aggregate);
  }
  // Only a fresh native JSON.parse result reaches this private projection: no hooks, cycles or undefined.
  return value as StrictJsonValue;
}

/** Same successful-path operations, instrumented separately from throughput measurements. */
export function nativePhases(bytes: Uint8Array) {
  const started = performance.now();
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const decoded = performance.now();
  const value: unknown = JSON.parse(text);
  const parsed = performance.now();
  const duplicate = hasDecodedDuplicate(text);
  const scanned = performance.now();
  if (!duplicate) projectNativeValue(value);
  const projected = performance.now();
  return {
    decodeMs: decoded - started,
    parseMs: parsed - decoded,
    duplicateMs: scanned - parsed,
    projectionMs: projected - scanned,
    duplicate
  };
}
