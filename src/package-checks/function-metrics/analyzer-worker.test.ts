import assert from "node:assert/strict";
import { describe, it } from "node:test";

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
            cyclomaticComplexity: { source: "typescript-analyzer", value: 2 },
            endLine: 4,
            file: "src/sample.ts",
            lines: 4,
            name: "classify",
            parameterCount: 1,
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
  const worker = new Worker(new URL("./analyzer-worker.ts", import.meta.url).href);
  try {
    worker.postMessage(request);
    return await receiveWorkerResponse(worker);
  } finally {
    worker.terminate();
  }
}

function receiveWorkerResponse(worker: Worker): Promise<unknown> {
  return new Promise((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<unknown>): void => resolve(event.data);
    worker.onerror = (event: ErrorEvent): void => reject(event.error);
  });
}
