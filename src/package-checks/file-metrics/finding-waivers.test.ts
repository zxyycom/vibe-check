import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { fileMetrics } from "./constructor.ts";
import { executeFileMetrics } from "./execution.ts";
import { FILES, createRoot, execute, scanner } from "./file-metrics.test-support.ts";
import { isValidResolvedFileMetricsOptions } from "./options-validation.ts";

describe("fileMetrics finding waivers", () => {
  it("validates declared waiver authoring and resolved options", () => {
    const defaultCheck = fileMetrics();
    assert.deepEqual(defaultCheck.options.findingWaivers, []);

    for (const invalidInput of [
      { findingWaivers: [{ identity: { metric: "code-lines", path: "src/a.ts" }, reason: "" }] },
      {
        findingWaivers: [
          { identity: { metric: "code-lines", path: "src/a.ts" }, reason: "First." },
          { identity: { metric: "code-lines", path: "src/a.ts" }, reason: "Second." }
        ]
      }
    ]) {
      assert.throws(
        () => Reflect.apply(fileMetrics, undefined, [invalidInput]),
        /fileMetrics options must match/
      );
    }

    for (const invalidPath of [
      "",
      "/absolute/path.ts",
      "../outside.ts",
      "src/../a.ts",
      "./src/a.ts",
      "src//a.ts",
      "src\\a.ts",
      "C:/workspace/a.ts"
    ]) {
      assert.throws(
        () =>
          fileMetrics({
            findingWaivers: [
              { identity: { metric: "code-lines", path: invalidPath }, reason: "Invalid path." }
            ]
          }),
        /fileMetrics options must match/
      );
      assert.equal(
        isValidResolvedFileMetricsOptions({
          ...defaultCheck.options,
          findingWaivers: [
            {
              identity: { metric: "code-lines" as const, path: invalidPath },
              reason: "Invalid path."
            }
          ]
        }),
        false
      );
    }
  });

  it("reconciles declared waivers after SCC forms findings without settling them as actionable", async () => {
    const root = createRoot("vibe-check-file-metrics-waiver-");
    const executable = scanner(
      root,
      [
        "if (process.argv.includes('--version')) process.stdout.write('scc version 4.0.0\\n');",
        "else process.stdout.write('Language,Provider,Filename,Lines,Code,Comments,Blanks,Complexity,Bytes,ULOC\\nTypeScript,,src/a.ts,700,650,20,30,5,1000,650\\n');"
      ].join("\n")
    );
    const check = fileMetrics({
      codeAreas: {
        source: {
          files: FILES,
          codeLines: {
            maximum: 300,
            lowDecisionTokenAllowance: { maximumCodeLines: 500, maximumDecisionTokens: 10 }
          },
          findingPolicy: "blocking"
        }
      },
      findingWaivers: [
        {
          identity: { metric: "code-lines", path: "src/a.ts" },
          reason: "The historical source is intentionally preserved."
        },
        {
          identity: { metric: "code-lines", path: "src/removed.ts" },
          reason: "This stale waiver must be audited."
        }
      ],
      scanner: { executable }
    });

    try {
      const result = await execute(executeFileMetrics, check.options, root);
      assert.deepEqual(result.result, {
        status: "passed",
        data: { blockingFindingCount: 0, findingCount: 1 },
        messages: [
          {
            code: "finding-waived",
            level: "info",
            message:
              "File metric finding for src/a.ts was waived: The historical source is intentionally preserved."
          },
          {
            code: "unused-finding-waiver",
            level: "warning",
            message:
              "Configured file-metrics finding waiver for src/removed.ts matched no finding; remove it or update its identity. Reason: This stale waiver must be audited."
          }
        ]
      });
      assert.deepEqual(result.records, [
        {
          data: {
            blocking: false,
            codeAreas: ["source"],
            codeLines: 650,
            limit: 500,
            metric: "code-lines",
            path: "src/a.ts",
            waiver: { reason: "The historical source is intentionally preserved." }
          },
          identity: { id: "src/a.ts" }
        },
        {
          data: {
            identity: { metric: "code-lines", path: "src/removed.ts" },
            kind: "finding-waiver-audit",
            matchCount: 0,
            reason: "This stale waiver must be audited.",
            status: "unused"
          },
          identity: { id: "/finding-waiver-audit/src/removed.ts" }
        }
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("audits unused waivers even when no eligible file reaches SCC", async () => {
    const root = createRoot("vibe-check-file-metrics-no-input-waiver-");
    const check = fileMetrics({
      codeAreas: {
        missing: {
          files: { ...FILES, include: ["missing/**/*.ts"] }
        }
      },
      findingWaivers: [
        {
          identity: { metric: "code-lines", path: "src/removed.ts" },
          reason: "This stale waiver must be audited without scanner input."
        }
      ]
    });

    try {
      const result = await execute(executeFileMetrics, check.options, root);
      assert.deepEqual(result.result, {
        status: "not-applicable",
        reason: { code: "no-eligible-input" },
        messages: [
          {
            code: "unused-finding-waiver",
            level: "warning",
            message:
              "Configured file-metrics finding waiver for src/removed.ts matched no finding; remove it or update its identity. Reason: This stale waiver must be audited without scanner input."
          }
        ]
      });
      assert.deepEqual(result.records, [
        {
          data: {
            identity: { metric: "code-lines", path: "src/removed.ts" },
            kind: "finding-waiver-audit",
            matchCount: 0,
            reason: "This stale waiver must be audited without scanner input.",
            status: "unused"
          },
          identity: { id: "/finding-waiver-audit/src/removed.ts" }
        }
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("uses a waiver-audit Record identity outside the normal normalized-path domain", async () => {
    const root = createRoot("vibe-check-file-metrics-waiver-record-id-");
    const normalFindingPath = "finding-waiver:src/removed.ts";
    mkdirSync(join(root, "finding-waiver:src"), { recursive: true });
    writeFileSync(join(root, normalFindingPath), "export const collision = 1;\n", "utf8");
    const executable = scanner(
      root,
      [
        "if (process.argv.includes('--version')) process.stdout.write('scc version 4.0.0\\n');",
        `else process.stdout.write(${JSON.stringify(
          "Language,Provider,Filename,Lines,Code,Comments,Blanks,Complexity,Bytes,ULOC\nTypeScript,,finding-waiver:src/removed.ts,700,650,20,30,5,1000,650\n"
        )});`
      ].join("\n")
    );
    const check = fileMetrics({
      codeAreas: {
        source: {
          files: FILES,
          codeLines: {
            maximum: 300,
            lowDecisionTokenAllowance: { maximumCodeLines: 500, maximumDecisionTokens: 10 }
          }
        }
      },
      findingWaivers: [
        {
          identity: { metric: "code-lines", path: "src/removed.ts" },
          reason: "This audit identity must not collide with a normal finding path."
        }
      ],
      scanner: { executable }
    });

    try {
      const result = await execute(executeFileMetrics, check.options, root);
      assert.deepEqual(
        result.records.map(({ identity }) => identity.id),
        [normalFindingPath, "/finding-waiver-audit/src/removed.ts"]
      );
      assert.equal(new Set(result.records.map(({ identity }) => identity.id)).size, 2);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
