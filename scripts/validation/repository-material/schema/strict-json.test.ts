import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { ExpectedMaterialValidationFailure } from "../diagnostics.ts";
import { validateJsonSyntax } from "./validation.ts";

test("workspace strict JSON validation matches public JSON Check BOM, encoding, and duplicate-key failures", async () => {
  const repositoryRoot = mkdtempSync(join(tmpdir(), "vibe-check-strict-material-json-"));
  try {
    const docsDirectory = join(repositoryRoot, "docs");
    mkdirSync(docsDirectory);
    writeFileSync(join(docsDirectory, "bom.json"), Buffer.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d]));
    writeFileSync(join(docsDirectory, "duplicate.json"), '{"same":1,"same":2}', "utf8");
    writeFileSync(join(docsDirectory, "invalid-utf8.json"), Buffer.from([0xff]));

    await assert.rejects(
      () => validateJsonSyntax({ repositoryRoot }),
      (error: unknown) => {
        assert.ok(error instanceof ExpectedMaterialValidationFailure);
        assert.deepEqual(JSON.parse(JSON.stringify(error.diagnostics.map(({ data }) => data))), [
          { kind: "strict-json-invalid", path: "docs/bom.json", reason: "bom" },
          {
            kind: "strict-json-invalid",
            path: "docs/duplicate.json",
            reason: "duplicate-key"
          },
          {
            kind: "strict-json-invalid",
            path: "docs/invalid-utf8.json",
            reason: "invalid-utf8"
          }
        ]);
        return true;
      }
    );
  } finally {
    rmSync(repositoryRoot, { force: true, recursive: true });
  }
});
