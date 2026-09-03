import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { defineConfig } from "../../project-definition/project-definition.ts";
import { run } from "../../project-run/run.ts";
import { secretDetection } from "./default-check.ts";
import { parseSecretDetectionData } from "./final-data.ts";
import { adaptSecretlintMessages } from "./secretlint/adapter.ts";
import {
  allProductSurface,
  assertNoCanaryMaterial,
  CANARY,
  completedSecretDetectionData,
  EXPLICIT_FILES,
  projectRoot,
  runSecretDetection,
  settleDuplicateSafeFindings,
  syntheticPrivateKey,
  syntheticPrivateKeyPlaceholder
} from "./secret-detection.test-support.ts";

describe("secretDetection", () => {
  it("requires a complete explicit files policy and publishes the public parser", () => {
    assert.throws(
      () => Reflect.apply(secretDetection, undefined, [undefined]),
      /documented closed explicit file policy/
    );
    assert.throws(
      () => Reflect.apply(secretDetection, undefined, [{ files: { include: ["**/*"] } }]),
      /documented closed explicit file policy/
    );
    const check = secretDetection({ files: EXPLICIT_FILES });
    assert.equal(check.checkId, "secret-detection");
    assert.equal(check.parseData, parseSecretDetectionData);
    assert.deepEqual(
      check.parseData({
        coverageGapCount: 0,
        findingCount: 1,
        scannedFileCount: 1,
        selectedFileCount: 1,
        waivedFindingCount: 1
      }),
      {
        coverageGapCount: 0,
        findingCount: 1,
        scannedFileCount: 1,
        selectedFileCount: 1,
        waivedFindingCount: 1
      }
    );
    assert.throws(
      () =>
        check.parseData({
          coverageGapCount: 1,
          findingCount: 0,
          scannedFileCount: 1,
          selectedFileCount: 1,
          waivedFindingCount: 0
        }),
      /secretDetection final data/
    );
  });

  it("uses only exact approved files and projects findings without canary material", async () => {
    const root = projectRoot();
    try {
      mkdirSync(join(root, "approved"));
      mkdirSync(join(root, "outside"));
      writeFileSync(
        join(root, "approved", "placeholder.pem"),
        syntheticPrivateKeyPlaceholder(),
        "utf8"
      );
      writeFileSync(join(root, "approved", "secret.pem"), syntheticPrivateKey(), "utf8");
      writeFileSync(join(root, "outside", "secret.pem"), syntheticPrivateKey(), "utf8");
      const observed = await runSecretDetection(root, {
        files: Object.freeze({
          exclude: Object.freeze([]),
          include: Object.freeze(["approved/**"]),
          source: "filesystem"
        })
      });
      assert.deepEqual(observed.result, {
        data: {
          coverageGapCount: 0,
          findingCount: 1,
          scannedFileCount: 2,
          selectedFileCount: 2,
          waivedFindingCount: 0
        },
        messages: [
          {
            code: "secret-findings",
            level: "error",
            message:
              "1 high-confidence secret finding(s) require attention; inspect this Check's safe Records, remove the material, or author an exact finding waiver."
          }
        ],
        status: "failed"
      });
      assert.deepEqual(observed.records, [
        {
          data: {
            blocking: true,
            kind: "secret-finding",
            location: { endColumn: 26, endLine: 3, startColumn: 1, startLine: 1 },
            ordinal: 1,
            path: "approved/secret.pem",
            ruleId: "@secretlint/secretlint-rule-privatekey",
            structuralClass: "text-document"
          },
          identity: { id: "/secret-finding/approved/secret.pem/1" }
        }
      ]);
      const surface = allProductSurface(observed);
      assertNoCanaryMaterial(surface);
      assert.doesNotMatch(surface, /outside\/secret\.pem/u);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("keeps synthetic canary material out of completed Run facts and published outputs", async () => {
    const root = projectRoot();
    try {
      writeFileSync(join(root, "secret.pem"), syntheticPrivateKey(), "utf8");
      const result = await run(
        defineConfig({
          checks: [secretDetection({ files: EXPLICIT_FILES })],
          outputs: {
            diagnosticLogging: { directory: "published", enabled: true },
            machinePublication: { directory: "published", enabled: true },
            progressRendering: { enabled: false }
          }
        }),
        { projectRoot: root }
      );
      assert.equal(result.kind, "completed");
      if (result.kind !== "completed") return;
      assert.equal(result.outputs.machinePublication.status, "succeeded");
      assert.equal(result.outputs.diagnosticLogging.status, "succeeded");
      const diagnosticFile = result.outputs.diagnosticLogging.file;
      assertNoCanaryMaterial(
        [
          JSON.stringify(result),
          readFileSync(join(root, "published", "run.json"), "utf8"),
          readFileSync(join(root, "published", "records.ndjson"), "utf8"),
          diagnosticFile === null ? "" : readFileSync(join(root, diagnosticFile), "utf8")
        ].join("\n")
      );
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("reconciles safe waiver identities and audits unused and overmatched authoring", async () => {
    const root = projectRoot();
    try {
      writeFileSync(join(root, "one.pem"), syntheticPrivateKey(), "utf8");
      const identity = {
        ordinal: 1,
        path: "one.pem",
        ruleId: "@secretlint/secretlint-rule-privatekey" as const,
        structuralClass: "text-document" as const
      };
      const waived = await runSecretDetection(root, {
        findingWaivers: Object.freeze([{ identity, reason: "Synthetic training fixture." }])
      });
      assert.equal(waived.result.status, "passed");
      assert.deepEqual(waived.result.data, {
        coverageGapCount: 0,
        findingCount: 1,
        scannedFileCount: 1,
        selectedFileCount: 1,
        waivedFindingCount: 1
      });
      assert.deepEqual(waived.records[0], {
        data: {
          blocking: false,
          kind: "secret-finding",
          location: { endColumn: 26, endLine: 3, startColumn: 1, startLine: 1 },
          ordinal: 1,
          path: "one.pem",
          ruleId: "@secretlint/secretlint-rule-privatekey",
          structuralClass: "text-document",
          waiver: { reason: "Synthetic training fixture." }
        },
        identity: { id: "/secret-finding/one.pem/1" }
      });
      const unused = await runSecretDetection(root, {
        findingWaivers: Object.freeze([
          { identity: { ...identity, path: "missing.pem" }, reason: "Stale fixture." }
        ])
      });
      assert.equal(unused.result.status, "failed");
      assert.deepEqual(unused.records.at(-1), {
        data: {
          identity: { ...identity, path: "missing.pem" },
          kind: "finding-waiver-audit",
          matchCount: 0,
          reason: "Stale fixture.",
          status: "unused"
        },
        identity: { id: "/finding-waiver-audit/missing.pem/1" }
      });

      const overmatched = settleDuplicateSafeFindings(identity);
      assert.equal(overmatched.result.status, "failed");
      assert.deepEqual(overmatched.records.at(-1), {
        data: {
          identity,
          kind: "finding-waiver-audit",
          matchCount: 2,
          reason: "A unique finding only.",
          status: "overmatched"
        },
        identity: { id: "/finding-waiver-audit/one.pem/1" }
      });
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("fails closed for deterministic coverage gaps without treating them as waived findings", async () => {
    const root = projectRoot();
    try {
      writeFileSync(join(root, "binary.dat"), new Uint8Array([1, 0, 2]));
      writeFileSync(join(root, "large.txt"), new Uint8Array(12));
      writeFileSync(join(root, "utf8.txt"), new Uint8Array([0xc3, 0x28]));
      const observed = await runSecretDetection(root, {
        maximumFileBytes: 8,
        maximumTotalBytes: 8
      });
      assert.deepEqual(observed.result, {
        data: {
          coverageGapCount: 3,
          findingCount: 0,
          scannedFileCount: 0,
          selectedFileCount: 3,
          waivedFindingCount: 0
        },
        messages: [
          {
            code: "incomplete-coverage",
            level: "error",
            message:
              "3 selected input(s) could not receive bounded secret detection coverage; narrow files or increase this Check's explicit resource limits."
          }
        ],
        status: "failed"
      });
      assert.deepEqual(observed.records, [
        {
          data: {
            blocking: true,
            kind: "coverage-gap",
            path: "binary.dat",
            reason: "contains-nul"
          },
          identity: { id: "/coverage-gap/binary.dat" }
        },
        {
          data: {
            blocking: true,
            kind: "coverage-gap",
            path: "large.txt",
            reason: "file-byte-limit"
          },
          identity: { id: "/coverage-gap/large.txt" }
        },
        {
          data: { blocking: true, kind: "coverage-gap", path: "utf8.txt", reason: "invalid-utf8" },
          identity: { id: "/coverage-gap/utf8.txt" }
        }
      ]);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("accounts for non-text reads in the total budget and applies the selected-file limit", async () => {
    const totalBudgetRoot = projectRoot();
    const fileCountRoot = projectRoot();
    try {
      const withheldSecret = syntheticPrivateKey();
      writeFileSync(join(totalBudgetRoot, "a-binary.dat"), new Uint8Array([1, 0, 2, 3]));
      writeFileSync(join(totalBudgetRoot, "b-secret.pem"), withheldSecret, "utf8");
      const totalBudget = await runSecretDetection(totalBudgetRoot, {
        maximumTotalBytes: withheldSecret.length
      });
      assert.deepEqual(completedSecretDetectionData(totalBudget), {
        coverageGapCount: 2,
        findingCount: 0,
        scannedFileCount: 0,
        selectedFileCount: 2,
        waivedFindingCount: 0
      });
      assert.deepEqual(
        totalBudget.records.map((record) => record.data),
        [
          {
            blocking: true,
            kind: "coverage-gap",
            path: "a-binary.dat",
            reason: "contains-nul"
          },
          {
            blocking: true,
            kind: "coverage-gap",
            path: "b-secret.pem",
            reason: "total-byte-limit"
          }
        ]
      );
      assertNoCanaryMaterial(allProductSurface(totalBudget));

      writeFileSync(join(fileCountRoot, "a.txt"), "first", "utf8");
      writeFileSync(join(fileCountRoot, "b.txt"), "second", "utf8");
      writeFileSync(join(fileCountRoot, "c.txt"), "third", "utf8");
      const fileCount = await runSecretDetection(fileCountRoot, { maximumFileCount: 1 });
      assert.deepEqual(completedSecretDetectionData(fileCount), {
        coverageGapCount: 2,
        findingCount: 0,
        scannedFileCount: 1,
        selectedFileCount: 3,
        waivedFindingCount: 0
      });
      assert.deepEqual(
        fileCount.records.map((record) => record.data),
        [
          {
            blocking: true,
            kind: "coverage-gap",
            path: "b.txt",
            reason: "file-count-limit"
          },
          {
            blocking: true,
            kind: "coverage-gap",
            path: "c.txt",
            reason: "file-count-limit"
          }
        ]
      );
    } finally {
      rmSync(totalBudgetRoot, { force: true, recursive: true });
      rmSync(fileCountRoot, { force: true, recursive: true });
    }
  });

  it("keeps the safe finding identity when the detected value or line moves", async () => {
    const root = projectRoot();
    try {
      writeFileSync(join(root, "one.pem"), syntheticPrivateKey(), "utf8");
      const initial = await runSecretDetection(root);
      writeFileSync(
        join(root, "one.pem"),
        `\n\n${syntheticPrivateKey("MIBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB")}`,
        "utf8"
      );
      const changed = await runSecretDetection(root);
      assert.deepEqual(
        changed.records.map((record) => record.identity),
        initial.records.map((record) => record.identity)
      );
      assert.notDeepEqual(
        changed.records.map((record) => record.data),
        initial.records.map((record) => record.data)
      );
      assert.deepEqual(
        completedSecretDetectionData(changed),
        completedSecretDetectionData(initial)
      );
      assertNoCanaryMaterial(allProductSurface(initial));
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("uses a no-follow descriptor so an exact root-escaping symlink is unavailable without Records", async () => {
    const root = projectRoot();
    const outside = projectRoot();
    try {
      writeFileSync(join(outside, "outside.pem"), syntheticPrivateKey(), "utf8");
      execFileSync("git", ["init", "--quiet", root]);
      symlinkSync(join(outside, "outside.pem"), join(root, "escaped.pem"));
      execFileSync("git", ["-C", root, "add", "escaped.pem"]);
      const observed = await runSecretDetection(root, {
        files: Object.freeze({
          exclude: Object.freeze([]),
          include: Object.freeze(["escaped.pem"]),
          source: "git-worktree"
        })
      });
      assert.deepEqual(observed, {
        records: [],
        result: {
          messages: [
            {
              code: "source-unavailable",
              level: "error",
              message:
                "A selected secret detection input could not be read safely; check that it still exists, is readable, and was not replaced during the Run."
            }
          ],
          reason: { code: "source-unavailable" },
          status: "unavailable"
        }
      });
      assertNoCanaryMaterial(JSON.stringify(observed));
    } finally {
      rmSync(root, { force: true, recursive: true });
      rmSync(outside, { force: true, recursive: true });
    }
  });

  it("returns unavailable rather than a partial result after cancellation or detector protocol failure", async () => {
    const root = projectRoot();
    try {
      writeFileSync(join(root, "plain.txt"), "no secret", "utf8");
      const controller = new AbortController();
      controller.abort();
      assert.deepEqual(await runSecretDetection(root, {}, controller.signal), {
        records: [],
        result: {
          messages: [
            {
              code: "execution-cancelled",
              level: "error",
              message:
                "Secret detection was cancelled before it could form a complete result; inspect the caller's cancellation reason and retry if appropriate."
            }
          ],
          reason: { code: "execution-cancelled" },
          status: "unavailable"
        }
      });
      const unsafeResult = adaptSecretlintMessages(
        [
          {
            data: { raw: `${CANARY}-never-publish` },
            loc: { end: { column: 1, line: 1 }, start: { column: 0, line: 1 } },
            message: `${CANARY}-never-publish`,
            ruleId: "unexpected-rule",
            severity: "error",
            type: "message"
          }
        ],
        "plain.txt"
      );
      assert.deepEqual(unsafeResult, { kind: "protocol-failed" });
      assert.doesNotMatch(JSON.stringify(unsafeResult), new RegExp(CANARY, "u"));
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});
