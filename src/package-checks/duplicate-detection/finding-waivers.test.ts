import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { describe, it } from "node:test";

import { duplicateDetection } from "./default-check.ts";
import { executeDuplicateDetection } from "./execution.ts";
import {
  CODE_AREAS,
  createRoot,
  duplicateScannerExecutable,
  execute,
  scanner
} from "./default-check.execution.test-support.ts";

const DUPLICATE_IDENTITY = {
  locations: [
    { endLine: 21, path: "src/a.ts", startLine: 10 },
    { endLine: 31, path: "src/b.ts", startLine: 20 }
  ],
  metric: "duplicate-tokens"
} as const;

describe("duplicateDetection finding waivers", () => {
  it("validates sorted closed identity authoring without invoking hostile accessors", () =>
    assertInvalidDuplicateWaiverAuthoring());

  it("audits unused waivers only after forming a complete empty candidate set", async () => {
    await assertDuplicateUnusedWaiverAudit();
    await assertDuplicateScannerFailureDoesNotAuditWaiver();
  });

  it("preserves applied and stale waiver evidence while removing only exact duplicates from settlement", async () => {
    const root = createRoot("vibe-check-duplicate-waiver-");
    try {
      const executable = duplicateScannerExecutable(root);
      const staleIdentity = {
        ...DUPLICATE_IDENTITY,
        locations: [
          DUPLICATE_IDENTITY.locations[0],
          { endLine: 41, path: "src/b.ts", startLine: 30 }
        ]
      } as const;
      const check = duplicateDetection({
        cache: { enabled: false },
        codeAreas: {
          source: { ...CODE_AREAS.source, findingPolicy: "blocking" }
        },
        findingWaivers: [
          { identity: DUPLICATE_IDENTITY, reason: "Generated mirror implementation." },
          { identity: staleIdentity, reason: "Stale duplicate policy." }
        ],
        scanner: { command: { executable, kind: "custom" } }
      });
      const observed = await execute(executeDuplicateDetection, check.options, root);

      assert.deepEqual(observed.result, {
        status: "passed",
        data: { blockingFindingCount: 0, findingCount: 1 },
        messages: [
          {
            code: "finding-waived",
            level: "info",
            message:
              "Duplicate finding at src/a.ts:10-21, src/b.ts:20-31 was waived: Generated mirror implementation."
          },
          {
            code: "unused-finding-waiver",
            level: "warning",
            message:
              "Configured duplicate-detection finding waiver at src/a.ts:10-21, src/b.ts:30-41 matched no finding; remove it or update its identity. Reason: Stale duplicate policy."
          }
        ]
      });
      assert.equal(observed.records.length, 2);
      assert.deepEqual(observed.records[0]?.data, {
        blocking: false,
        codeAreas: ["source"],
        lineCount: 12,
        locations: DUPLICATE_IDENTITY.locations,
        metric: "duplicate-tokens",
        tokenCount: 80,
        waiver: { reason: "Generated mirror implementation." }
      });
      assert.deepEqual(observed.records[1]?.data, {
        identity: staleIdentity,
        kind: "finding-waiver-audit",
        matchCount: 0,
        reason: "Stale duplicate policy.",
        status: "unused"
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("keeps repeated duplicate identities actionable when a waiver overmatches", async () => {
    const root = createRoot("vibe-check-duplicate-overmatched-waiver-");
    try {
      const executable = duplicateScanner(root, [duplicateReportItem(), duplicateReportItem()]);
      const check = duplicateDetection({
        cache: { enabled: false },
        codeAreas: {
          source: { ...CODE_AREAS.source, findingPolicy: "blocking" }
        },
        findingWaivers: [{ identity: DUPLICATE_IDENTITY, reason: "Must not cover two fragments." }],
        scanner: { command: { executable, kind: "custom" } }
      });
      const observed = await execute(executeDuplicateDetection, check.options, root);
      assert.equal(observed.result.status, "failed");
      if (observed.result.status !== "failed") return;
      assert.deepEqual(observed.result.data, { blockingFindingCount: 2, findingCount: 2 });
      assert.equal(
        observed.result.messages?.some(
          ({ code, message }) =>
            code === "overmatched-finding-waiver" && message.includes("matched 2 findings")
        ),
        true
      );
      assert.equal(observed.records.filter(({ data }) => Object.hasOwn(data, "waiver")).length, 0);
      assert.deepEqual(observed.records.at(-1)?.data, {
        identity: DUPLICATE_IDENTITY,
        kind: "finding-waiver-audit",
        matchCount: 2,
        reason: "Must not cover two fragments.",
        status: "overmatched"
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

function assertInvalidDuplicateWaiverAuthoring(): void {
  assert.deepEqual(duplicateDetection().options.findingWaivers, []);
  let getterReads = 0;
  const hostileIdentity = Object.defineProperty({}, "locations", {
    enumerable: true,
    get() {
      getterReads += 1;
      return DUPLICATE_IDENTITY.locations;
    }
  });
  const invalidInputs = [
    { findingWaivers: [{ identity: DUPLICATE_IDENTITY, reason: "" }] },
    {
      findingWaivers: [
        { identity: DUPLICATE_IDENTITY, reason: "First." },
        { identity: DUPLICATE_IDENTITY, reason: "Second." }
      ]
    },
    {
      findingWaivers: [
        {
          identity: {
            ...DUPLICATE_IDENTITY,
            locations: [...DUPLICATE_IDENTITY.locations].reverse()
          },
          reason: "Unsorted."
        }
      ]
    },
    { findingWaivers: [{ identity: hostileIdentity, reason: "Hostile." }] }
  ];
  for (const invalidInput of invalidInputs) {
    assert.throws(
      () => Reflect.apply(duplicateDetection, undefined, [invalidInput]),
      /duplicateDetection options are invalid/
    );
  }
  assert.doesNotThrow(() =>
    duplicateDetection({
      findingWaivers: [
        {
          identity: {
            locations: [
              {
                endLine: 9_000_000_000_000,
                path: "src/large.ts",
                startLine: 9_000_000_000_000
              },
              {
                endLine: 10_000_000_000_000,
                path: "src/large.ts",
                startLine: 10_000_000_000_000
              }
            ],
            metric: "duplicate-tokens"
          },
          reason: "Numeric location ordering remains exact."
        }
      ]
    })
  );
  assert.equal(getterReads, 0);
}

async function assertDuplicateScannerFailureDoesNotAuditWaiver(): Promise<void> {
  const root = createRoot("vibe-check-duplicate-failed-scan-waiver-");
  try {
    const executable = scanner(
      root,
      "if (process.argv.includes('--version')) process.stdout.write('jscpd 5.0.11\\n'); else process.exitCode = 2;"
    );
    const check = duplicateDetection({
      cache: { enabled: false },
      codeAreas: CODE_AREAS,
      findingWaivers: [{ identity: DUPLICATE_IDENTITY, reason: "Awaiting complete scan." }],
      scanner: { command: { executable, kind: "custom" } }
    });
    const observed = await execute(executeDuplicateDetection, check.options, root);
    assert.deepEqual(observed.result, {
      status: "unavailable",
      reason: { code: "external-execution-failed" },
      messages: [
        {
          code: "external-execution-failed",
          level: "error",
          message:
            "jscpd did not complete successfully; run the configured command directly and inspect its environment."
        }
      ]
    });
    assert.deepEqual(observed.records, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

async function assertDuplicateUnusedWaiverAudit(): Promise<void> {
  const root = createRoot("vibe-check-duplicate-no-input-waiver-");
  try {
    const check = duplicateDetection({
      codeAreas: {
        missing: { files: { exclude: [], include: ["missing/**/*.ts"], source: "filesystem" } }
      },
      findingWaivers: [{ identity: DUPLICATE_IDENTITY, reason: "Stale duplicate policy." }]
    });
    const observed = await execute(executeDuplicateDetection, check.options, root);
    assert.deepEqual(observed.result, {
      status: "not-applicable",
      reason: { code: "no-eligible-input" },
      messages: [
        {
          code: "unused-finding-waiver",
          level: "warning",
          message:
            "Configured duplicate-detection finding waiver at src/a.ts:10-21, src/b.ts:20-31 matched no finding; remove it or update its identity. Reason: Stale duplicate policy."
        }
      ]
    });
    assert.equal(observed.records.length, 1);
    assert.match(observed.records[0]?.identity.id ?? "", /^\/finding-waiver-audit\/sha256:/);
    assert.deepEqual(observed.records[0]?.data, {
      identity: DUPLICATE_IDENTITY,
      kind: "finding-waiver-audit",
      matchCount: 0,
      reason: "Stale duplicate policy.",
      status: "unused"
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function duplicateScanner(root: string, duplicates: readonly object[]): string {
  const report = JSON.stringify({ duplicates });
  return scanner(
    root,
    [
      "import { mkdirSync, writeFileSync } from 'node:fs';",
      "import { join } from 'node:path';",
      "if (process.argv.includes('--version')) process.stdout.write('jscpd 5.0.11\\n');",
      "else {",
      "  const output = process.argv[process.argv.indexOf('--output') + 1];",
      "  mkdirSync(output, { recursive: true });",
      `  writeFileSync(join(output, 'jscpd-report.json'), ${JSON.stringify(report)});`,
      "}"
    ].join("\n")
  );
}

function duplicateReportItem(): object {
  return {
    firstFile: { name: "src/a.ts", startLoc: { line: 10 }, endLoc: { line: 21 } },
    secondFile: { name: "src/b.ts", startLoc: { line: 20 }, endLoc: { line: 31 } },
    lines: 12,
    tokens: 80
  };
}
