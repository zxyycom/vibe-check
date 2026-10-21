import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { toProcessResult } from "./result.ts";
import type { ExecaResultLike } from "./contract.ts";

describe("Product process result normalization", () => {
  it("preserves completion eligibility independently of terminal-cause priority", () => {
    for (const exitCode of [0, 23]) {
      const complete = toProcessResult({ exitCode, stdout: "complete" }, "child");
      assert.equal(complete.isComplete, true);
      assert.equal(complete.status, exitCode);

      const incompleteMarkers: readonly ExecaResultLike[] = [
        { isMaxBuffer: true },
        { timedOut: true },
        { isCanceled: true },
        { signal: "SIGTERM" },
        { isCanceled: true, isMaxBuffer: true, timedOut: true }
      ];
      for (const markers of incompleteMarkers) {
        const incomplete = toProcessResult(
          { exitCode, failed: true, stdout: "partial", ...markers },
          "child"
        );
        assert.equal(incomplete.isComplete, false, JSON.stringify({ exitCode, ...markers }));
        assert.equal(incomplete.status, exitCode);
        assert.equal(incomplete.stdout, "partial");
        if (exitCode !== 0) {
          assert.equal(incomplete.error, undefined);
          assert.equal(incomplete.isMaxBuffer, undefined);
          assert.equal(incomplete.isCanceled, undefined);
          assert.equal(incomplete.timedOut, undefined);
        }
      }
    }
    assert.equal(toProcessResult({ failed: true, code: "ENOENT" }, "child").isComplete, false);
    assert.equal(toProcessResult({ failed: true, isMaxBuffer: true }, "child").isComplete, false);
  });

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
