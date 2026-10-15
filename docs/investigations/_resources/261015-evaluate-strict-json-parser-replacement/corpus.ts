import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export interface Workload {
  readonly id: string;
  readonly documents: readonly Uint8Array[];
}

export function loadWorkloads(packPath: string): readonly Workload[] {
  const pack: unknown = JSON.parse(readFileSync(packPath, "utf8"));
  assert.ok(typeof pack === "object" && pack !== null && "documents" in pack);
  assert.ok(Array.isArray(pack.documents));
  const real = pack.documents.map((document: unknown) => {
    assert.ok(
      typeof document === "object" &&
        document !== null &&
        "base64" in document &&
        "sha256" in document
    );
    assert.equal(typeof document.base64, "string");
    const bytes = Buffer.from(String(document.base64), "base64");
    assert.equal(createHash("sha256").update(bytes).digest("hex"), document.sha256);
    return bytes;
  });
  const encode = (source: string) => new TextEncoder().encode(source);
  const wide = Object.fromEntries(Array.from({ length: 4096 }, (_, i) => [`key-${i}`, i]));
  const wideText = JSON.stringify(wide);
  return [
    { id: "repository-json", documents: real },
    { id: "wide-keys", documents: Array.from({ length: 16 }, () => encode(wideText)) },
    {
      id: "numbers",
      documents: Array.from({ length: 8 }, () =>
        encode(JSON.stringify(Array.from({ length: 32768 }, (_, i) => i)))
      )
    },
    {
      id: "escaped-string",
      documents: Array.from({ length: 8 }, () =>
        encode(JSON.stringify('a\\"{}[]:雪'.repeat(32768)))
      )
    },
    {
      id: "duplicate-last",
      documents: Array.from({ length: 16 }, () =>
        encode('{"same":0,' + wideText.slice(1, -1) + ',"same":0}')
      )
    }
  ];
}

/** Seeded generated JSON plus intact duplicate members and invalid grammar mutations. */
export function semanticSources(): readonly string[] {
  const sources = [
    "null",
    "true",
    "false",
    "0",
    "-0",
    "1e999",
    "-1e999",
    "1e-999",
    "9007199254740993",
    '"text"',
    "[]",
    "{}",
    "",
    "undefined",
    "NaN",
    "Infinity",
    "01",
    "+1",
    "1.",
    "1e",
    "{} {}",
    "[1,]",
    '{"a":1,}',
    "{/*x*/}",
    "\u000bnull",
    "\u00a0null",
    '{"a":1,"a":1}',
    '{"a":1,"\\u0061":2}',
    '{"a":1,"a":2,}',
    '{"__proto__":1,"constructor":2,"toString":3}',
    '[{"__proto__":1,"__proto__":2}]',
    '{"x":{"a":1},"y":{"a":2}}',
    '{"":0,"":0}',
    '{"a:b":1,"a:b":2}',
    '{"\\u0000":1,"\\u0000":2}',
    '{"😀":1,"\\ud83d\\ude00":2}',
    '{"\\ud800":1,"\\ud800":2}',
    '{"a\\\\b":1,"a\\u005cb":2}',
    '{"a\\\"b":1,"a\\u0022b":2}',
    '{"é":1,"é":2}'
  ];
  let seed = 0x261015;
  const next = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed;
  };
  const keys = [
    "",
    "a",
    "__proto__",
    "constructor",
    "雪",
    "😀",
    "a:b",
    "x\\y",
    'x"y',
    "\u0000",
    "\ud800"
  ];
  for (let i = 0; i < 2500; i += 1) {
    const name = keys[next() % keys.length];
    assert.ok(name !== undefined);
    const key = JSON.stringify(name);
    const escapedKey =
      '"' +
      Array.from(
        { length: name.length },
        (_, j) => "\\u" + name.charCodeAt(j).toString(16).padStart(4, "0")
      ).join("") +
      '"';
    const value = JSON.stringify([i, false, null, { text: keys[next() % keys.length] }]);
    const object = `{${key}:${value},${i % 3 === 0 ? escapedKey : JSON.stringify(`other-${i}`)}:${i}}`;
    sources.push(i % 2 === 0 ? `[${object}]` : object);
    if (i % 5 === 0) sources.push(object.slice(0, -1) + ",}");
  }
  for (const depth of [8, 32, 128, 512]) {
    sources.push("[".repeat(depth) + "0" + "]".repeat(depth));
    sources.push("[".repeat(depth) + '{"a":0,"a":0}' + "]".repeat(depth));
  }
  return sources;
}
