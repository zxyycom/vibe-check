import assert from "node:assert/strict";
import fs from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";

import { collectProjectFiles, collectProjectFileSets } from "./collection.ts";

function write(root: string, file: string): void {
  fs.mkdirSync(dirname(join(root, file)), { recursive: true });
  fs.writeFileSync(join(root, file), "content\n");
}

describe("quality input file collection", () => {
  it("preserves pathname identity without admitting lossy UTF-8 aliases", () => {
    const root = fs.mkdtempSync(join(tmpdir(), "collection-byte-identity-"));
    const rawFile = Buffer.concat([
      Buffer.from(`${root}/bad`),
      Buffer.from([0xff]),
      Buffer.from(".ts")
    ]);
    try {
      write(root, "src/a.ts");
      write(root, "good\uFFFD.ts");
      fs.writeFileSync(rawFile, "content\n");
      for (const patterns of [["**/*"], ["bad*.ts"], ["./bad*.ts"], ["./bad\uFFFD.ts"]])
        assert.throws(
          () => collectProjectFiles(root, { patterns }),
          (error: unknown) =>
            error instanceof Error &&
            !(error instanceof TypeError) &&
            error.message.includes(root) &&
            error.message.includes("626164ff2e7473")
        );
      assert.deepEqual(collectProjectFiles(root, { patterns: ["src/**/*.ts"] }), ["src/a.ts"]);
      for (const patterns of [["**/*", "!bad*"], ["!bad*"]])
        assert.deepEqual(collectProjectFiles(root, { patterns }), ["good\uFFFD.ts", "src/a.ts"]);
      assert.deepEqual(collectProjectFiles(root, { patterns: [] }), []);
      assert.throws(
        () =>
          collectProjectFileSets(root, {
            safe: { patterns: ["src/**/*.ts"] },
            necessary: { patterns: ["./bad*.ts"] }
          }),
        /name bytes 626164ff2e7473/u
      );
      write(root, "bad\uFFFD.ts");
      for (const patterns of [["bad*.ts"], ["./bad\uFFFD.ts"]])
        assert.throws(() => collectProjectFiles(root, { patterns }), /name bytes 626164ff2e7473/u);
      fs.rmSync(rawFile);
      assert.deepEqual(collectProjectFiles(root, { patterns: ["**/*"] }), [
        "bad\uFFFD.ts",
        "good\uFFFD.ts",
        "src/a.ts"
      ]);
      assert.deepEqual(collectProjectFiles(root, { patterns: ["./bad\uFFFD.ts", "!bad*/**"] }), [
        "bad\uFFFD.ts"
      ]);
      const rawDirectory = Buffer.concat([Buffer.from(`${root}/bad`), Buffer.from([0xff])]);
      fs.mkdirSync(rawDirectory);
      fs.writeFileSync(Buffer.concat([rawDirectory, Buffer.from("/a.ts")]), "content\n");
      write(root, "bad\uFFFD/a.ts");
      for (const patterns of [["./bad\uFFFD/**/*.ts"], ["./bad\uFFFD/a.ts"]])
        assert.throws(() => collectProjectFiles(root, { patterns }), /name bytes 626164ff/u);
      assert.deepEqual(collectProjectFiles(root, { patterns: ["src/**/*.ts"] }), ["src/a.ts"]);
      assert.deepEqual(collectProjectFiles(root, { patterns: ["**/*", "!bad*/**"] }), [
        "bad\uFFFD.ts",
        "good\uFFFD.ts",
        "src/a.ts"
      ]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
