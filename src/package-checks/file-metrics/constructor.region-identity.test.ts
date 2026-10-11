import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { describe, it } from "node:test";

import { fileMetrics } from "./constructor.ts";
import { executeFileMetrics } from "./execution.ts";
import { createRoot, execute, scanner } from "./file-metrics.test-support.ts";

describe("fileMetrics region identity", () => {
  it("preserves nonempty NUL area identities for empty selection and finding policy", async () => {
    const root = createRoot("vibe-check-file-metrics-region-identity-");
    const id = "nul\0id";
    try {
      const empty = fileMetrics({
        codeAreas: { [id]: { files: { patterns: [] } } },
        scanner: { executable: "must-not-be-invoked" }
      });
      assert.deepEqual(await execute(executeFileMetrics, empty.options, root), {
        records: [],
        result: { status: "not-applicable", reason: { code: "no-eligible-input" } }
      });

      const executable = scanner(
        root,
        [
          "if (process.argv.includes('--version')) process.stdout.write('scc version 4.0.0\\n');",
          "else process.stdout.write('Language,Provider,Filename,Lines,Code,Comments,Blanks,Complexity,Bytes,ULOC\\nTypeScript,,src/a.ts,450,400,20,30,20,1000,400\\n');"
        ].join("\n")
      );
      const matched = fileMetrics({
        codeAreas: {
          [id]: {
            files: { patterns: ["src/a.ts"] },
            codeLines: { maximum: 300 },
            findingPolicy: "blocking"
          }
        },
        scanner: { executable }
      });
      const actual = await execute(executeFileMetrics, matched.options, root);
      assert.equal(actual.result.status, "failed");
      assert.deepEqual(actual.records, [
        {
          data: {
            blocking: true,
            codeAreas: [id],
            codeLines: 400,
            limit: 300,
            metric: "code-lines",
            path: "src/a.ts"
          },
          identity: { id: "src/a.ts" }
        }
      ]);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});
