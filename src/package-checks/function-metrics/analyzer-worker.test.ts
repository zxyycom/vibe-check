import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("functionMetrics analyzer Worker", () => {
  it("resolves from the source tree and turns a malformed request into a whole-request failure", async () => {
    const worker = new Worker(new URL("./analyzer-worker.ts", import.meta.url).href);
    try {
      worker.postMessage({ files: [{ path: "src/a.ts" }] });
      assert.deepEqual(await receiveWorkerResponse(worker), { kind: "analysis-failed" });
    } finally {
      worker.terminate();
    }
  });
});

function receiveWorkerResponse(worker: Worker): Promise<unknown> {
  return new Promise((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<unknown>): void => resolve(event.data);
    worker.onerror = (event: ErrorEvent): void => reject(event.error);
  });
}
