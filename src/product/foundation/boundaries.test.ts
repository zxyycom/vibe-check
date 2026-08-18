import { strict as assert } from "node:assert";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { parseScriptArgs, stringArrayOption, type ScriptArgValues } from "./args.ts";
import { parseCsvRows } from "./csv.ts";
import { walkFiles, writeJsonFile } from "./fs.ts";
import { parseNdjson, toNdjson } from "./ndjson.ts";
import { runProcessSync } from "./process/runner.ts";

describe("product foundation boundaries", () => {
  it("normalizes repeated CLI string options without preserving boolean entries", () => {
    const parsed = parseScriptArgs({
      allowPositionals: true,
      args: ["target", "--tag=one", "--tag=two"],
      options: { tag: { multiple: true, type: "string" } }
    });
    const mixedValues: ScriptArgValues = { tag: ["one", false, "two"] };

    assert.deepEqual(parsed.positionals, ["target"]);
    assert.deepEqual(stringArrayOption(parsed.values, "tag"), ["one", "two"]);
    assert.deepEqual(stringArrayOption(mixedValues, "tag"), ["one", "two"]);
  });

  it("validates CSV rows and keeps NDJSON failures and parse results explicit", () => {
    assert.deepEqual(parseCsvRows("\uFEFFname, value\nalpha, beta\n"), [
      ["name", "value"],
      ["alpha", "beta"]
    ]);

    const parsed = parseNdjson('{"ok":true}\n{');
    assert.deepEqual(parsed.records, [{ line: 1, value: { ok: true } }]);
    assert.equal(parsed.diagnostics.length, 1);
    assert.equal(parsed.diagnostics[0]?.line, 2);
    assert.match(parsed.diagnostics[0]?.message ?? "", /^invalid JSON:/u);
    assert.equal(Object.isFrozen(parsed), true);
    assert.equal(Object.isFrozen(parsed.records), true);
    assert.equal(Object.isFrozen(parsed.diagnostics), true);
    assert.throws(
      () => toNdjson([{ ok: true }, undefined]),
      /could not serialize NDJSON record 2/u
    );
  });

  it("uses named file and process inputs while preserving explicit serialization failures", () => {
    const rootDir = mkdtempSync(join(tmpdir(), "vibe-check-product-foundation-"));
    const filePath = join(rootDir, "record.json");

    try {
      writeJsonFile({ filePath, trailingNewline: false, value: { ok: true } });
      assert.deepEqual(JSON.parse(readFileSync(filePath, "utf8")), { ok: true });
      assert.deepEqual(walkFiles({ rootDir }), ["record.json"]);
      assert.throws(
        () => writeJsonFile({ filePath, value: undefined }),
        /could not serialize JSON file/u
      );

      const processResult = runProcessSync({
        args: ["-e", "process.stdout.write('ok')"],
        command: process.execPath
      });
      assert.equal(processResult.status, 0);
      assert.equal(processResult.stdout, "ok");
    } finally {
      rmSync(rootDir, { force: true, recursive: true });
    }
  });
});
