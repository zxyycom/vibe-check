import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  readStrictJsonDocument,
  type JsonDocumentIssue,
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

describe("strict JSON document boundary", () => {
  it("uses byte length with a strict greater-than limit before every document issue", () => {
    const bom = new Uint8Array([0xef, 0xbb, 0xbf, 0xff]);
    assertIssue(inspectBytes(bom, bom.byteLength - 1), "too-large");
    assertIssue(inspectBytes(bom, bom.byteLength), "bom");
    assert.deepEqual(inspectText("null", 4), { kind: "valid" });
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
    for (const validSource of ["{}", "[]", '"string"', "0", "true", "false", "null"] as const) {
      assert.deepEqual(inspectText(validSource), { kind: "valid" });
    }
  });

  it("detects decoded duplicate keys in each object without exposing the key or AST", () => {
    assertIssue(inspectText('{"a": 1, "a": 2}'), "duplicate-key");
    assertIssue(inspectText('{"a": 1, "\\u0061": 2}'), "duplicate-key");
    assertIssue(inspectText('{"outer": {"b": 1, "b": 2}}'), "duplicate-key");
    assert.deepEqual(inspectText('{"left": {"a": 1}, "right": {"a": 2}}'), { kind: "valid" });
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
