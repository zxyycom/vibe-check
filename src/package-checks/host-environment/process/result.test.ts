import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { toProcessResult } from "./result.ts";

describe("Product process result normalization", () => {
  it("uses closed terminal-cause priority without reading native error text", () => {
    const numericExit = toProcessResult(
      {
        exitCode: 7,
        failed: true,
        isCanceled: true,
        isMaxBuffer: true,
        message: "timeout max buffer cancellation signal startup failure",
        signal: "SIGTERM",
        timedOut: true
      },
      "child"
    );
    assert.equal(numericExit.status, 7);
    assert.equal(numericExit.error, undefined);
    assert.equal(numericExit.isCanceled, undefined);
    assert.equal(numericExit.timedOut, undefined);
    assert.equal(numericExit.isMaxBuffer, undefined);

    const cancellation = toProcessResult(
      {
        failed: true,
        isCanceled: true,
        isMaxBuffer: true,
        signal: "SIGTERM",
        timedOut: true
      },
      "child"
    );
    assert.equal(cancellation.isCanceled, true);
    assert.equal(cancellation.timedOut, undefined);
    assert.equal(cancellation.isMaxBuffer, undefined);

    const timeout = toProcessResult(
      { failed: true, isMaxBuffer: true, signal: "SIGTERM", timedOut: true },
      "child"
    );
    assert.equal(timeout.isCanceled, undefined);
    assert.equal(timeout.timedOut, true);
    assert.equal(timeout.isMaxBuffer, undefined);

    const maxBuffer = toProcessResult(
      { failed: true, isMaxBuffer: true, signal: "SIGTERM" },
      "child"
    );
    assert.equal(maxBuffer.isCanceled, undefined);
    assert.equal(maxBuffer.timedOut, undefined);
    assert.equal(maxBuffer.isMaxBuffer, true);

    const signal = toProcessResult({ failed: true, signal: "SIGTERM" }, "child");
    assert.equal(signal.signal, "SIGTERM");
    assert.equal(signal.isCanceled, undefined);
    assert.equal(signal.timedOut, undefined);
    assert.equal(signal.isMaxBuffer, undefined);

    const startupFailure = toProcessResult(
      { code: "ENOENT", failed: true, message: "timeout", signal: undefined },
      "child"
    );
    assert.equal(startupFailure.error instanceof Error, true);
    const errorCode =
      startupFailure.error !== undefined && "code" in startupFailure.error
        ? startupFailure.error.code
        : undefined;
    assert.equal(errorCode, "ENOENT");
    assert.equal(startupFailure.signal, null);
    assert.equal(startupFailure.status, null);
    assert.equal(startupFailure.isCanceled, undefined);
    assert.equal(startupFailure.timedOut, undefined);
    assert.equal(startupFailure.isMaxBuffer, undefined);
  });
});
