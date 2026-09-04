import assert from "node:assert/strict";
import { join } from "node:path";
import { describe, it } from "node:test";

import { createOxlintFailureProjection } from "./oxlint-failure-records.ts";

const workspaceRoot = process.cwd();

describe("Project Gate oxlint failure Records", () => {
  it("projects every complete scoped JSON diagnostic with installed-protocol label spans", () => {
    const projection = createOxlintFailureProjection({ scope: "product", workspaceRoot });
    const records = projection.recordsFromStdout(
      JSON.stringify({
        diagnostics: [
          diagnostic({ code: "eslint(second-rule)", column: 9, line: 7, path: "src/z.ts" }),
          diagnostic({ code: "eslint(first-rule)", column: 2, line: 3, path: "src/a.ts" })
        ],
        number_of_files: 2,
        number_of_rules: 120,
        start_time: 1.5,
        threads_count: 4
      })
    );

    assert.deepEqual(records, [
      {
        data: {
          kind: "oxlint-diagnostic",
          location: { column: 2, line: 3 },
          occurrence: 1,
          path: "src/a.ts",
          rule: "eslint(first-rule)",
          severity: "error"
        },
        id: "oxlint:src%2Fa.ts:3:2:eslint%28first-rule%29:1"
      },
      {
        data: {
          kind: "oxlint-diagnostic",
          location: { column: 9, line: 7 },
          occurrence: 1,
          path: "src/z.ts",
          rule: "eslint(second-rule)",
          severity: "error"
        },
        id: "oxlint:src%2Fz.ts:7:9:eslint%28second-rule%29:1"
      }
    ]);
    const serialized = JSON.stringify(records);
    assert.equal(serialized.includes("tool-secret"), false);
    assert.equal(serialized.includes("https://user:token@example.test"), false);
    assert.equal(serialized.includes(workspaceRoot), false);
  });

  it("declines malformed, out-of-scope, and incomplete diagnostic protocols as one whole", () => {
    const projection = createOxlintFailureProjection({ scope: "product", workspaceRoot });
    const complete = diagnostic({ code: "eslint(complete)", column: 1, line: 1, path: "src/a.ts" });
    const incomplete = diagnostic({
      code: "eslint(incomplete)",
      column: 1,
      line: 1,
      path: "scripts/a.ts"
    });
    assert.equal(projection.recordsFromStdout("not JSON"), undefined);
    assert.equal(
      projection.recordsFromStdout(
        JSON.stringify({
          diagnostics: [complete],
          number_of_files: 1,
          number_of_rules: 120,
          start_time: 1
        })
      ),
      undefined
    );
    assert.equal(
      projection.recordsFromStdout(
        JSON.stringify({
          diagnostics: [
            diagnostic({
              code: "eslint(missing-url)",
              column: 1,
              line: 1,
              path: "src/a.ts",
              includeUrl: false
            })
          ],
          number_of_files: 1,
          number_of_rules: 120,
          start_time: 1,
          threads_count: 4
        })
      ),
      undefined
    );
    assert.equal(
      projection.recordsFromStdout(
        JSON.stringify({
          diagnostics: [complete, incomplete],
          number_of_files: 2,
          number_of_rules: 120,
          start_time: 1,
          threads_count: 4
        })
      ),
      undefined
    );
    assert.equal(
      projection.recordsFromStdout(
        JSON.stringify({
          diagnostics: [
            complete,
            diagnostic({
              code: "eslint(https://user:token@example.test)",
              column: 1,
              line: 1,
              path: "src/credential-code.ts"
            })
          ],
          number_of_files: 2,
          number_of_rules: 120,
          start_time: 1,
          threads_count: 4
        })
      ),
      undefined
    );
    assert.equal(
      projection.recordsFromStdout(
        JSON.stringify({
          diagnostics: [
            complete,
            diagnostic({
              code: "eslint(no-unused-vars)",
              column: 1,
              line: 1,
              path: "src/https:/user:token@example.test.ts"
            })
          ],
          number_of_files: 2,
          number_of_rules: 120,
          start_time: 1,
          threads_count: 4
        })
      ),
      undefined
    );
    assert.equal(
      projection.recordsFromStdout(
        JSON.stringify({
          diagnostics: [complete],
          number_of_files: 1,
          number_of_rules: 120,
          start_time: 1,
          threads_count: 4,
          unrecognized: true
        })
      ),
      undefined
    );
    assert.equal(
      projection.recordsFromStdout(
        JSON.stringify({
          diagnostics: [
            diagnostic({
              code: "eslint(outside-workspace)",
              column: 1,
              line: 1,
              path: join(workspaceRoot, "..", "outside.ts")
            })
          ],
          number_of_files: 1,
          number_of_rules: 120,
          start_time: 1,
          threads_count: 4
        })
      ),
      undefined
    );
  });
});

function diagnostic(
  input: Readonly<{
    readonly code: string;
    readonly column: number;
    readonly includeUrl?: boolean;
    readonly line: number;
    readonly path: string;
  }>
): object {
  return {
    code: input.code,
    filename: input.path,
    help: "tool-secret https://user:token@example.test",
    labels: [
      {
        span: { column: input.column, length: 1, line: input.line, offset: 0 }
      }
    ],
    message: "tool-secret https://user:token@example.test",
    severity: "error",
    ...(input.includeUrl === false ? {} : { url: "https://user:token@example.test" })
  };
}
