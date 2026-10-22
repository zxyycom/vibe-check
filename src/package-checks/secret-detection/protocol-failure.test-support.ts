import assert from "node:assert/strict";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { mockModuleInIsolatedChild } from "../isolated-child.test-support.ts";

// Exercise the real adapter and whole-Check lifecycle without contaminating the parent detector.
const paths: string[] = [];
await mockModuleInIsolatedChild("@secretlint/core", () => ({
  lintSource: async (input: { readonly source: { readonly filePath: string } }) => {
    paths.push(input.source.filePath);
    return {
      messages: [
        {
          data: { raw: "protocol-raw-canary" },
          loc: { end: { column: 1, line: 1 }, start: { column: 0, line: 1 } },
          message: "protocol-raw-canary",
          ruleId: paths.length === 1 ? "@secretlint/secretlint-rule-privatekey" : "unexpected-rule",
          severity: "error",
          type: "message"
        }
      ]
    };
  }
}));

const { projectRoot, runSecretDetection } = await import("./secret-detection.test-support.ts");
const root = projectRoot();
try {
  writeFileSync(join(root, "a-first.txt"), "first approved input");
  writeFileSync(join(root, "b-later.txt"), "later approved input");
  const observed = await runSecretDetection(root, {
    findingWaivers: [
      {
        identity: {
          ordinal: 1,
          path: "a-first.txt",
          ruleId: "@secretlint/secretlint-rule-privatekey",
          structuralClass: "text-document"
        },
        reason: "The accepted prefix must not be published or audited after failure."
      }
    ]
  });
  assert.deepEqual(paths, ["a-first.txt", "b-later.txt"]);
  assert.deepEqual(observed, {
    records: [],
    result: {
      messages: [
        {
          code: "detector-protocol-failed",
          level: "error",
          message:
            "The private secret detector returned an unsupported result shape; update the package dependency only with a reviewed adapter change."
        }
      ],
      reason: { code: "detector-protocol-failed" },
      status: "unavailable"
    }
  });
  assert.equal(JSON.stringify(observed).includes("protocol-raw-canary"), false);
  console.log(JSON.stringify({ checkedFiles: paths.length, status: observed.result.status }));
} finally {
  rmSync(root, { recursive: true, force: true });
}
