import { strict as assert } from "node:assert";
import { resolve } from "node:path";
import { describe, it } from "node:test";

import {
  ScannerOperationalInputError,
  resolveScannerDependencySnapshot
} from "./scanner-dependencies.ts";

const repoRoot = resolve(import.meta.dirname, "../..");

describe("scanner dependency resolution", () => {
  it("resolves platform defaults, availability arguments, and bounded concurrency", () => {
    const posix = resolveScannerDependencySnapshot({}, "linux");
    assert.deepEqual(posix, {
      file: {
        args: [],
        availabilityArgs: ["--version"],
        executable: "scc"
      },
      function: {
        args: ["-m", "lizard"],
        availabilityArgs: ["-m", "lizard", "--version"],
        executable: "python3"
      },
      duplication: {
        args: [],
        availabilityArgs: ["--version"],
        executable: resolve(repoRoot, "node_modules", ".bin", "jscpd"),
        maxConcurrency: 4
      }
    });

    const windows = resolveScannerDependencySnapshot({}, "win32");
    assert.equal(windows.function.executable, "python");
    assert.equal(
      windows.duplication.executable,
      resolve(repoRoot, "node_modules", ".bin", "jscpd.cmd")
    );
  });

  it("applies supported operational overrides without probing executables", () => {
    const snapshot = resolveScannerDependencySnapshot({
      VIBE_CHECK_JSCPD_ARGS: '["--silent", "--mode=strict"]',
      VIBE_CHECK_JSCPD_CMD: "/does/not/exist/jscpd",
      VIBE_CHECK_LIZARD_ARGS: '["must", "remain", "unsupported"]',
      VIBE_CHECK_LIZARD_CMD: "/does/not/exist/python",
      VIBE_CHECK_SCC_ARGS: '["--format", "csv"]',
      VIBE_CHECK_SCC_CMD: "/does/not/exist/scc"
    }, "linux");

    assert.deepEqual(snapshot.file, {
      args: ["--format", "csv"],
      availabilityArgs: ["--format", "csv", "--version"],
      executable: "/does/not/exist/scc"
    });
    assert.deepEqual(snapshot.function, {
      args: ["-m", "lizard"],
      availabilityArgs: ["-m", "lizard", "--version"],
      executable: "/does/not/exist/python"
    });
    assert.deepEqual(snapshot.duplication, {
      args: ["--silent", "--mode=strict"],
      availabilityArgs: ["--silent", "--mode=strict", "--version"],
      executable: "/does/not/exist/jscpd",
      maxConcurrency: 4
    });
  });

  it("treats unset and empty operational inputs as no override", () => {
    const unset = resolveScannerDependencySnapshot({}, "linux");
    const empty = resolveScannerDependencySnapshot({
      VIBE_CHECK_JSCPD_ARGS: "",
      VIBE_CHECK_JSCPD_CMD: "",
      VIBE_CHECK_LIZARD_CMD: "",
      VIBE_CHECK_SCC_ARGS: "",
      VIBE_CHECK_SCC_CMD: ""
    }, "linux");

    assert.deepEqual(empty, unset);
  });

  it("rejects malformed or non-string-array argument overrides without exposing values", () => {
    const cases = [
      ["VIBE_CHECK_SCC_ARGS", "TOP-SECRET invalid json"],
      ["VIBE_CHECK_SCC_ARGS", '{"secret":"TOP-SECRET"}'],
      ["VIBE_CHECK_JSCPD_ARGS", '["TOP-SECRET", 1]']
    ] as const;

    for (const [inputName, value] of cases) {
      assert.throws(
        () => resolveScannerDependencySnapshot({ [inputName]: value }, "linux"),
        (error: unknown) => {
          assert.ok(error instanceof ScannerOperationalInputError);
          assert.equal(error.code, "invalid-scanner-operational-input");
          assert.equal(error.inputName, inputName);
          assert.match(error.message, new RegExp(inputName));
          assert.match(error.message, /JSON array of strings/);
          assert.match(error.message, /unset/i);
          assert.doesNotMatch(error.message, /TOP-SECRET/);
          return true;
        }
      );
    }
  });
});
