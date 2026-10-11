import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Worker } from "node:worker_threads";

describe("functionMetrics analyzer Worker", () => {
  it("resolves the Product adapter from the source tree and rejects malformed transport", async () => {
    assert.deepEqual(
      await sendWorkerRequest({
        files: [
          {
            path: "src/sample.ts",
            source:
              "export function classify(value: number) {\n  if (value) return value;\n  return 0;\n}"
          }
        ]
      }),
      {
        kind: "complete",
        metrics: [
          {
            complexityContributors: [{ line: 2, token: "if" }],
            cyclomaticComplexity: { source: "typescript-analyzer", value: 2 },
            endLine: 4,
            file: "src/sample.ts",
            lines: 4,
            name: "classify",
            nestingDepth: { source: "typescript-analyzer", value: 1 },
            parameterCount: 1,
            startLine: 1
          }
        ]
      }
    );
    assert.deepEqual(
      await sendWorkerRequest({
        files: [
          {
            path: "src/arms.rs",
            source: "fn classify(value: i32) {\n match value {\n 0 => 3,\n 1 => 4,\n _ => 5,\n }\n}"
          },
          { path: "src/body.kt", source: "fun expression(value: Int) = value + 3\nfun after() {}" }
        ]
      }),
      {
        kind: "complete",
        metrics: [
          {
            complexityContributors: [
              { token: "=>", line: 4 },
              { token: "=>", line: 5 }
            ],
            cyclomaticComplexity: { source: "typescript-analyzer", value: 3 },
            endLine: 7,
            file: "src/arms.rs",
            lines: 7,
            name: "classify",
            nestingDepth: { source: "typescript-analyzer", value: 0 },
            parameterCount: 1,
            startLine: 1
          },
          {
            complexityContributors: [],
            cyclomaticComplexity: { source: "typescript-analyzer", value: 1 },
            endLine: 1,
            file: "src/body.kt",
            lines: 1,
            name: "expression",
            nestingDepth: { source: "typescript-analyzer", value: 0 },
            parameterCount: 1,
            startLine: 1
          },
          {
            complexityContributors: [],
            cyclomaticComplexity: { source: "typescript-analyzer", value: 1 },
            endLine: 2,
            file: "src/body.kt",
            lines: 1,
            name: "after",
            nestingDepth: { source: "typescript-analyzer", value: 0 },
            parameterCount: 0,
            startLine: 2
          }
        ]
      }
    );
    assert.deepEqual(
      await sendWorkerRequest({
        files: [
          {
            path: "src/nullish.ts",
            source:
              "function defaults(a,b,c,d): number[] {\n return [a ?? 0,b??0,c ?? 0,d??0];\n}\nif (true) { for (const x of [1]) { if (x) {} } }"
          }
        ]
      }),
      {
        kind: "complete",
        metrics: [
          {
            complexityContributors: [2, 2, 2, 2].map((line) => ({ line, token: "??" })),
            cyclomaticComplexity: { source: "typescript-analyzer", value: 5 },
            endLine: 3,
            file: "src/nullish.ts",
            lines: 3,
            name: "defaults",
            nestingDepth: { source: "typescript-analyzer", value: 4 },
            parameterCount: 4,
            startLine: 1
          }
        ]
      }
    );
    assert.deepEqual(await sendWorkerRequest({ files: [{ path: "src/a.ts" }] }), {
      kind: "analysis-failed"
    });
  });
});

async function sendWorkerRequest(request: unknown): Promise<unknown> {
  const worker = new Worker(new URL("./analyzer-worker.ts", import.meta.url));
  try {
    worker.postMessage(request);
    return await receiveWorkerResponse(worker);
  } finally {
    await worker.terminate();
  }
}

function receiveWorkerResponse(worker: Worker): Promise<unknown> {
  return new Promise((resolve, reject) => {
    worker.once("message", resolve);
    worker.once("error", reject);
  });
}
