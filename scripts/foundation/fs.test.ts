import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { expect, test } from "bun:test";

import { readJsonFile, walkFiles, writeJsonFile } from "./fs.ts";
import { parseJsonValue } from "./json/value.ts";
import { toNdjson } from "./ndjson.ts";

test("keeps file traversal deterministic and reports filesystem and JSON boundaries", () => {
  const testRoot = fs.mkdtempSync(path.join(tmpdir(), "vibe-check-foundation-"));
  const nestedDirectory = path.join(testRoot, "nested");
  const missingDirectory = path.join(testRoot, "missing");
  const missingJsonPath = path.join(testRoot, "missing.json");
  const invalidJsonPath = path.join(testRoot, "invalid.json");
  const unserializableJsonPath = path.join(testRoot, "unserializable.json");
  try {
    fs.mkdirSync(nestedDirectory);
    fs.writeFileSync(path.join(testRoot, "z.ts"), "", "utf8");
    fs.writeFileSync(path.join(nestedDirectory, "a.ts"), "", "utf8");
    fs.writeFileSync(invalidJsonPath, "{", "utf8");

    expect(parseJsonValue({ source: '{"ok":true}' })).toEqual({ ok: true });
    expect(walkFiles({ rootDir: testRoot })).toEqual(["invalid.json", "nested/a.ts", "z.ts"]);
    expect(() => walkFiles({ rootDir: missingDirectory })).toThrow(
      `could not read directory ${missingDirectory}`
    );
    expect(() => readJsonFile(invalidJsonPath)).toThrow(
      `could not parse JSON file ${invalidJsonPath}`
    );
    expect(() => readJsonFile(missingJsonPath)).toThrow(
      `could not read JSON file ${missingJsonPath}`
    );
    expect(() => writeJsonFile({ filePath: unserializableJsonPath, value: undefined })).toThrow(
      `could not serialize JSON file ${unserializableJsonPath}`
    );
    expect(() => toNdjson([undefined])).toThrow("could not serialize NDJSON record 1");
  } finally {
    fs.rmSync(testRoot, { force: true, recursive: true });
  }
});
