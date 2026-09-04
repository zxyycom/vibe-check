import assert from "node:assert/strict";
import { join } from "node:path";
import { describe, it } from "node:test";

import { workspaceFormatTargets } from "../../../development/format-targets.ts";
import { createOxfmtFailureProjection } from "./oxfmt-failure-records.ts";

const workspaceRoot = process.cwd();

describe("Project Gate oxfmt failure Records", () => {
  it("projects every authorized list-different path as a relative Record", () => {
    const projection = createOxfmtFailureProjection({
      targets: workspaceFormatTargets,
      workspaceRoot
    });
    const records = projection.recordsFromStdout(
      `${join(workspaceRoot, "scripts/development/format.ts")}\nsrc/index.ts\n`
    );

    assert.deepEqual(records, [
      {
        data: { kind: "oxfmt-difference", path: "scripts/development/format.ts" },
        id: "oxfmt:scripts%2Fdevelopment%2Fformat.ts"
      },
      {
        data: { kind: "oxfmt-difference", path: "src/index.ts" },
        id: "oxfmt:src%2Findex.ts"
      }
    ]);
    assert.equal(JSON.stringify(records).includes(workspaceRoot), false);
  });

  it("declines non-path text, duplicate paths, and paths outside the owned target set", () => {
    const projection = createOxfmtFailureProjection({
      targets: workspaceFormatTargets,
      workspaceRoot
    });
    assert.equal(projection.recordsFromStdout("Checking formatting...\n"), undefined);
    assert.equal(projection.recordsFromStdout("src/index.ts\nsrc/index.ts\n"), undefined);
    assert.equal(projection.recordsFromStdout("README.md\n"), undefined);
    assert.equal(
      projection.recordsFromStdout("src/https:/user:token@example.test.ts\n"),
      undefined
    );
    assert.equal(
      projection.recordsFromStdout(`${join(workspaceRoot, "..", "outside.ts")}\n`),
      undefined
    );
    assert.equal(
      projection.recordsFromStdout(
        "src/package-checks/function-metrics/analyzer/fixtures/fixture.ts\n"
      ),
      undefined
    );
  });
});
