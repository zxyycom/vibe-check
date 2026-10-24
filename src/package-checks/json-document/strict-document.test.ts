import { assertJsonValueEqual } from "../../data-boundary/json-value-equality.test-support.ts";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  readStrictJsonDocument,
  type JsonDocumentIssue,
  type StrictJsonValue,
  type StrictJsonObject,
  type StrictJsonDocumentResult
} from "./strict-document.ts";

function inspectBytes(bytes: Uint8Array, maximumBytes = 1_048_576): StrictJsonDocumentResult {
  const directory = mkdtempSync(join(tmpdir(), "vibe-check-strict-json-"));
  const filePath = join(directory, "document.json");
  try {
    writeFileSync(filePath, bytes);
    return readStrictJsonDocument({ filePath, maximumBytes });
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
}

function inspectText(source: string, maximumBytes = 1_048_576): StrictJsonDocumentResult {
  return inspectBytes(new TextEncoder().encode(source), maximumBytes);
}

function assertIssue(result: StrictJsonDocumentResult, reason: JsonDocumentIssue): void {
  assert.deepEqual(result, { kind: "issue", reason });
  assert.deepEqual(Object.keys(result).sort(), ["kind", "reason"]);
}

function assertValid(result: StrictJsonDocumentResult, expectedJsonValue: unknown): void {
  assert.ok(result.kind === "valid");
  assertJsonValueEqual(result.jsonValue, expectedJsonValue);
  assert.deepEqual(Object.keys(result).sort(), ["jsonValue", "kind"]);
}

function isStrictJsonObject(value: StrictJsonValue): value is StrictJsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

describe("strict JSON document boundary", () => {
  it("uses byte length with a strict greater-than limit before every document issue", () => {
    const bom = new Uint8Array([0xef, 0xbb, 0xbf, 0xff]);
    assertIssue(inspectBytes(bom, bom.byteLength - 1), "too-large");
    assertIssue(inspectBytes(bom, bom.byteLength), "bom");
    assertValid(inspectText("null", 4), null);
    assertIssue(inspectText("null", 3), "too-large");
  });

  it("returns BOM before fatal UTF-8 and strict grammar failures", () => {
    assertIssue(inspectBytes(new Uint8Array([0xef, 0xbb, 0xbf, 0xff])), "bom");
    assertIssue(inspectBytes(new Uint8Array([0xc3, 0x28])), "invalid-utf8");
    for (const invalidSource of [
      "{/* comment */}",
      "[1,]",
      '{"a": 1,}',
      "{} {}",
      '{"a": 1, "a": 2,}',
      '{"a": 1, "a": 1} trailing',
      '{"a": 1, "a": "\\x61"}',
      "01",
      "NaN",
      "Infinity"
    ] as const) {
      assertIssue(inspectText(invalidSource), "invalid-json");
    }
  });

  it("accepts every JSON root value only after complete strict grammar acceptance", () => {
    for (const [validSource, value] of [
      ["{}", {}],
      ["[]", []],
      ['"string"', "string"],
      ["0", 0],
      ["true", true],
      ["false", false],
      ["null", null]
    ] as const) {
      assertValid(inspectText(validSource), value);
    }
  });

  it("detects decoded duplicate keys in each object without exposing the key or AST", () => {
    assertIssue(inspectText('{"a": 1, "a": 2}'), "duplicate-key");
    assertIssue(inspectText('{"a": 1, "\\u0061": 2}'), "duplicate-key");
    assertIssue(inspectText('{"outer": {"b": 1, "b": 2}}'), "duplicate-key");
    assertIssue(inspectText('[{"__proto__": 1, "__proto__": 2}]'), "duplicate-key");
    assertIssue(inspectText('{"constructor": 1, "constructor": 2}'), "duplicate-key");
    assertValid(inspectText('{"__proto__": 1, "constructor": 2, "toString": 3}'), {
      ["__proto__"]: 1,
      constructor: 2,
      toString: 3
    });
    assertValid(inspectText('{"left": {"a": 1}, "right": {"a": 2}}'), {
      left: { a: 1 },
      right: { a: 2 }
    });
    const stringValue = 'braces {} [] and a fake key "a":, plus slash \\ and quote "';
    for (const keyName of [
      "",
      "a",
      "__proto__",
      "constructor",
      'quote"key',
      "slash\\key",
      "colon:key",
      "\u0000",
      "\ud800",
      "\udc00",
      "😀",
      "雪"
    ]) {
      const literalKey = JSON.stringify(keyName);
      const escapedKey =
        '"' +
        Array.from(
          { length: keyName.length },
          (_, index) => "\\u" + keyName.charCodeAt(index).toString(16).padStart(4, "0")
        ).join("") +
        '"';
      for (const whitespace of ["", " ", "\t\r\n"]) {
        const member = `${literalKey}${whitespace}:${JSON.stringify(stringValue)}`;
        assertIssue(inspectText(`[{${member},${escapedKey}:0}]`), "duplicate-key");
        assertIssue(inspectText(`{${literalKey}:0,${escapedKey}${whitespace}:0}`), "duplicate-key");
        assertValid(inspectText(`[{${member}},{${escapedKey}:0}]`), [
          { [keyName]: stringValue },
          { [keyName]: 0 }
        ]);
      }
    }
    assertValid(inspectText('{"A":0,"a":1,"é":2,"e\\u0301":3}'), {
      A: 0,
      a: 1,
      é: 2,
      ["e\u0301"]: 3
    });
  });

  it("returns a frozen private value without an object prototype or source/AST detail", () => {
    const result = inspectText('{"__proto__": {"nested": [1, 2]}, "number": 1e999}');
    assert.ok(result.kind === "valid");
    assert.ok(isStrictJsonObject(result.jsonValue));
    const objectValue = result.jsonValue;
    assert.equal(Object.getPrototypeOf(objectValue), null);
    assert.equal(Object.isFrozen(objectValue), true);
    assert.deepEqual(Object.getOwnPropertyDescriptor(objectValue, "number"), {
      configurable: false,
      enumerable: true,
      value: Infinity,
      writable: false
    });
    const prototypeNamedValue = objectValue["__proto__"];
    assert.ok(prototypeNamedValue !== undefined && isStrictJsonObject(prototypeNamedValue));
    const prototypeNamedObject = prototypeNamedValue;
    assert.equal(Object.getPrototypeOf(prototypeNamedObject), null);
    assert.equal(Object.isFrozen(prototypeNamedObject), true);
    assert.ok(Array.isArray(prototypeNamedObject.nested));
    assert.equal(Object.getPrototypeOf(prototypeNamedObject.nested), Array.prototype);
    assert.equal(Object.isFrozen(prototypeNamedObject.nested), true);
    assert.equal(objectValue.number, Infinity);
    assert.deepEqual(Object.keys(result).sort(), ["jsonValue", "kind"]);
  });

  it("preserves deeply nested private objects and negative zero", () => {
    const depth = 4096;
    const result = inspectText('{"next":'.repeat(depth) + "-0" + "}".repeat(depth));
    assert.ok(result.kind === "valid");
    let nestedValue = result.jsonValue;
    for (let remaining = depth; remaining > 0; remaining -= 1) {
      assert.ok(isStrictJsonObject(nestedValue));
      assert.equal(Object.getPrototypeOf(nestedValue), null);
      assert.equal(Object.isFrozen(nestedValue), true);
      const child = nestedValue.next;
      assert.ok(child !== undefined);
      nestedValue = child;
    }
    assert.equal(Object.is(nestedValue, -0), true);
  });

  it("maps a read failure to a closed unavailable result", () => {
    const directory = mkdtempSync(join(tmpdir(), "vibe-check-missing-strict-json-"));
    try {
      const result = readStrictJsonDocument({
        filePath: join(directory, "missing.json"),
        maximumBytes: 1
      });
      assert.deepEqual(result, { kind: "unavailable" });
      assert.deepEqual(Object.keys(result), ["kind"]);
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });
});
