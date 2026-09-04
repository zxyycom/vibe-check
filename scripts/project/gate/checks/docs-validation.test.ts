import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { pathToFileURL } from "node:url";

import { isNonArrayRecord } from "../../../value-guards.ts";
import type { DocsValidationDiagnostic } from "../../../validation/documentation/diagnostics.ts";
import { defineConfig, run as packageRun } from "@zxyycom/vibe-check";

import { createDocsValidationCheck } from "./docs-validation.ts";
import { projectGateAggregation } from "../definition.ts";

describe("Project Gate documentation native diagnostics", () => {
  it("publishes complete docs native diagnostic Records while terminal progress stays bounded", async () => {
    const artifactRoot = mkdtempSync(join(tmpdir(), "vibe-check-native-docs-records-"));
    const sourcePath = "docs/native-diagnostic-records-fixture.md";
    const longTarget = `native-missing-${"x".repeat(320)}.md`;
    const targets = [
      longTarget,
      ...Array.from({ length: 11 }, (_, index) => `native-missing-${index + 2}.md`)
    ];
    const diagnostics: readonly DocsValidationDiagnostic[] = Object.freeze(
      targets.map((target, index) =>
        Object.freeze({
          data: Object.freeze({
            kind: "missing-local-link",
            location: Object.freeze({ column: 1, line: index + 1 }),
            occurrence: index + 1,
            sourcePath,
            targetPath: `docs/${target}`
          }),
          id: `missing-local-link:${encodeURIComponent(sourcePath)}:${index + 1}:1:${index + 1}`,
          presentation: `${sourcePath}:${index + 1}:1 missing local Markdown link target: docs/${target}.`
        })
      )
    );
    let validationCalls = 0;
    try {
      const productRun = await packageRun(
        defineConfig({
          checks: [
            createDocsValidationCheck(
              {
                checkId: "docs-links-validator",
                displayName: "Documentation path existence validation",
                task: "links"
              },
              {
                validateDocs: async (options) => {
                  validationCalls += 1;
                  assert.deepEqual(options, { tasks: ["links"] });
                  return Object.freeze({ diagnostics, status: "failed" as const });
                }
              }
            )
          ],
          outputs: {
            diagnosticLogging: { enabled: false },
            machinePublication: { directory: "machine", enabled: true },
            progressRendering: { enabled: true }
          }
        }),
        {
          checkArtifactBaseDirectory: join(artifactRoot, "checks"),
          checkAggregation: projectGateAggregation(),
          progressLogFile: join(artifactRoot, "progress.log"),
          projectRoot: artifactRoot
        }
      );

      assert.equal(validationCalls, 1);
      assert.equal(productRun.kind, "completed");
      if (productRun.kind !== "completed") throw new Error("fixture Product Run must complete");
      assert.equal(productRun.aggregate, "failed");
      assert.equal(productRun.outputs.machinePublication.status, "succeeded");
      assert.equal(productRun.outputs.progressRendering.status, "succeeded");
      const outcome = productRun.snapshot.checks[0]?.outcome;
      if (outcome?.status !== "failed") throw new Error("fixture docs Check must fail");
      assert.deepEqual(outcome.data, {
        diagnosticCode: "docs-links-validator-invalid",
        diagnosticCount: 12,
        outcome: "failed"
      });
      assert.equal(productRun.snapshot.records.length, 12);
      assert.equal(
        existsSync(join(artifactRoot, "checks", "docs-links-validator", "process.log")),
        false
      );

      const expectedRecords = diagnostics.map(({ data, id }) => ({
        checkId: "docs-links-validator",
        data,
        id
      }));
      assert.deepEqual(
        productRun.snapshot.records
          .map(({ checkId, data, id }) => ({ checkId, data, id }))
          .sort(compareRecordIdentity),
        expectedRecords.sort(compareRecordIdentity)
      );

      const machineRecords = readFileSync(join(artifactRoot, "machine", "records.ndjson"), "utf8")
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line) as unknown);
      assert.equal(machineRecords.length, 12);
      assert.deepEqual(
        machineRecords.map(machineRecordFact).sort(compareRecordIdentity),
        expectedRecords.sort(compareRecordIdentity)
      );

      const checkMessages = productRun.checkMessages.filter(
        (message) => message.checkId === "docs-links-validator"
      );
      assert.deepEqual(checkMessages, [
        {
          checkId: "docs-links-validator",
          level: "error",
          code: "docs-links-validator-invalid",
          message: "Run: bun run validate -- docs links."
        }
      ]);

      const omitted = "    [records] 7 additional record(s) were omitted from terminal preview.\n";
      const progressLog = readFileSync(join(artifactRoot, "progress.log"), "utf8");
      assert.equal(recordPreviewCount(progressLog), 5);
      assert.equal(progressLog.includes(omitted), true);
      assert.match(progressLog, /^ {4}\[record\].*… \[truncated\]$/mu);
      assert.equal(progressLog.includes(checkMessages[0]?.message ?? ""), true);

      const terminalDriver = join(artifactRoot, "terminal-run.ts");
      writeFileSync(
        terminalDriver,
        [
          `import { defineConfig, run } from ${JSON.stringify(
            pathToFileURL(
              join(process.cwd(), "scripts/project/node_modules/@zxyycom/vibe-check/index.mjs")
            ).href
          )};`,
          `import { createDocsValidationCheck } from ${JSON.stringify(
            pathToFileURL(join(process.cwd(), "scripts/project/gate/checks/docs-validation.ts"))
              .href
          )};`,
          `const diagnostics = ${JSON.stringify(diagnostics)};`,
          "await run(",
          "  defineConfig({",
          "    checks: [createDocsValidationCheck({",
          '      checkId: "docs-links-validator",',
          '      displayName: "Documentation path existence validation",',
          '      task: "links"',
          '    }, { validateDocs: async () => ({ diagnostics, status: "failed" }) })],',
          "    outputs: {",
          "      diagnosticLogging: { enabled: false },",
          "      machinePublication: { enabled: false },",
          "      progressRendering: { enabled: true }",
          "    }",
          "  }),",
          `  { projectRoot: ${JSON.stringify(artifactRoot)} }`,
          ");"
        ].join("\n"),
        "utf8"
      );
      const terminal = spawnSync(process.execPath, [terminalDriver], {
        cwd: process.cwd(),
        encoding: "utf8"
      });
      assert.equal(terminal.status, 0);
      assert.equal(terminal.stderr, "");
      assert.equal(recordPreviewCount(terminal.stdout), 5);
      assert.equal(terminal.stdout.includes(omitted), true);
      assert.match(terminal.stdout, /^ {4}\[record\].*… \[truncated\]$/mu);
      assert.equal(terminal.stdout.includes(checkMessages[0]?.message ?? ""), true);
    } finally {
      rmSync(artifactRoot, { force: true, recursive: true });
    }
  });
});

function recordPreviewCount(value: string): number {
  return value.match(/^ {4}\[record\]/gmu)?.length ?? 0;
}

function compareRecordIdentity(
  left: Readonly<{ readonly id: string }>,
  right: Readonly<{ readonly id: string }>
): number {
  return left.id.localeCompare(right.id);
}

function machineRecordFact(value: unknown): Readonly<{
  readonly checkId: string;
  readonly data: object;
  readonly id: string;
}> {
  if (
    !isNonArrayRecord(value) ||
    typeof value.checkId !== "string" ||
    !isNonArrayRecord(value.data) ||
    typeof value.id !== "string"
  ) {
    throw new Error("Machine publication must contain a diagnostic Record");
  }
  return { checkId: value.checkId, data: value.data, id: value.id };
}
