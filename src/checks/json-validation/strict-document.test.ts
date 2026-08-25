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
  assert.equal(result.kind, "valid");
  if (result.kind !== "valid") return;
  assert.deepEqual(result.jsonValue, expectedJsonValue);
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
    for (const invalidSource of ["{/* comment */}", "[1,]", '{"a": 1,}', "{} {}"] as const) {
      assertIssue(inspectText(invalidSource), "invalid-json");
    }
  });

  it("accepts every JSON root value only after Momoa strictly consumes it", () => {
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
    assertValid(inspectText('{"left": {"a": 1}, "right": {"a": 2}}'), {
      left: { a: 1 },
      right: { a: 2 }
    });
  });

  it("returns a frozen private value without an object prototype or source/AST detail", () => {
    const result = inspectText('{"__proto__": {"nested": [1, 2]}, "number": 1e999}');
    assert.equal(result.kind, "valid");
    if (result.kind !== "valid" || !isStrictJsonObject(result.jsonValue)) return;
    const objectValue = result.jsonValue;
    assert.equal(Object.getPrototypeOf(objectValue), null);
    assert.equal(Object.isFrozen(objectValue), true);
    const prototypeNamedValue = objectValue["__proto__"];
    assert.notEqual(prototypeNamedValue, null);
    assert.equal(typeof prototypeNamedValue, "object");
    if (!isStrictJsonObject(prototypeNamedValue)) return;
    const prototypeNamedObject = prototypeNamedValue;
    assert.equal(Object.isFrozen(prototypeNamedObject), true);
    assert.equal(Object.isFrozen(prototypeNamedObject.nested), true);
    assert.equal(objectValue.number, Infinity);
    assert.deepEqual(Object.keys(result).sort(), ["jsonValue", "kind"]);
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
