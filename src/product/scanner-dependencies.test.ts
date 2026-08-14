import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  resolveSelectedScannerDependencySnapshot,
  resolveScannerDependencySnapshot,
  ScannerOperationalInputError
} from "./scanner-dependencies.ts";

describe("scanner dependency resolution", () => {
  it("uses explicit controls before supported environment and definition bindings", () => {
    const snapshot = resolveScannerDependencySnapshot({
      controls: { file: { executable: "/controls/scc" } },
      definition: {
        duplication: { executable: "/definition/jscpd" },
        file: { executable: "/definition/scc" },
        function: { executable: "/definition/python" }
      },
      environment: {
        VIBE_CHECK_JSCPD_CMD: "/environment/jscpd",
        VIBE_CHECK_LIZARD_CMD: "/environment/python",
        VIBE_CHECK_SCC_CMD: "/environment/scc"
      }
    });

    assert.deepEqual(snapshot, {
      duplication: {
        args: [],
        availabilityArgs: ["--version"],
        executable: "/environment/jscpd",
        maxConcurrency: 4
      },
      file: {
        args: [],
        availabilityArgs: ["--version"],
        executable: "/controls/scc"
      },
      function: {
        args: ["-m", "lizard"],
        availabilityArgs: ["-m", "lizard", "--version"],
        executable: "/environment/python"
      }
    });
  });

  it("fails before work without repository, pinned-environment, or PATH fallback", () => {
    assert.throws(
      () => resolveScannerDependencySnapshot({
        environment: {
          VIBE_CHECK_PINNED_LIZARD_CMD: "/private/python",
          VIBE_CHECK_PINNED_SCC_CMD: "/private/scc"
        }
      }),
      (error: unknown) => error instanceof ScannerOperationalInputError
        && error.dependencyId === "duplication" && !error.message.includes("/private")
    );
  });

  it("resolves only the selected built-in dependency bindings", () => {
    const dependencies = resolveSelectedScannerDependencySnapshot({
      definition: { file: { executable: "/definition/scc" } }
    }, ["file"]);

    assert.deepEqual(dependencies, {
      file: {
        args: [],
        availabilityArgs: ["--version"],
        executable: "/definition/scc"
      }
    });
  });
});
