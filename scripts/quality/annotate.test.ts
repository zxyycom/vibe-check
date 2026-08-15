import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { writeCanonicalPublicationFixture } from "./annotate/contract-fixtures.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const annotateEntrypoint = join(repoRoot, "scripts", "quality", "annotate.ts");
const defaultArtifactDirectory = join("artifacts", "vibe-check-quality");

describe("quality annotation CLI", () => {
  it("accepts the complete v3 set, defaults, filtering, and limit matrix", () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "vibe-check-annotate-valid-"));

    try {
      const records = [
        { level: "info" as const, message: "filtered info" },
        ...Array.from({ length: 6 }, (_, index) => ({
          level: index === 0 ? "error" as const : "warning" as const,
          message: `rendered record ${index + 1}`
        }))
      ];
      const defaultInput = join(tempRoot, defaultArtifactDirectory);
      writeCanonicalPublicationFixture(defaultInput, records);

      const defaults = runAnnotation([], tempRoot);
      assert.equal(defaults.status, 0);
      assert.equal(defaults.stderr, "");
      assert.equal(annotationCommands(defaults.stdout).length, 5);
      assert.doesNotMatch(defaults.stdout, /filtered info/);
      assert.doesNotMatch(defaults.stdout, /^::error /m);
      assert.match(defaults.stdout, /title=annotation-fixture-record::rendered record 1/);
      assert.match(
        defaults.stdout,
        /Quality record annotation limit: showing 5 of 6; see artifacts\/vibe-check-quality/
      );

      const explicit = runAnnotation([defaultInput, "1"]);
      assert.equal(explicit.status, 0);
      assert.equal(explicit.stderr, "");
      assert.equal(annotationCommands(explicit.stdout).length, 1);
      assert.match(
        explicit.stdout,
        new RegExp(`Quality record annotation limit: showing 1 of 6; see ${escapeRegExp(defaultInput)}`)
      );

      const zeroInput = join(tempRoot, "zero-artifacts");
      writeCanonicalPublicationFixture(zeroInput, []);
      const zero = runAnnotation([zeroInput]);
      assert.equal(zero.status, 0);
      assert.equal(zero.stdout, "");
      assert.equal(zero.stderr, "");
    } finally {
      rmSync(tempRoot, { force: true, recursive: true });
    }
  });

  it("fails closed for argument, set read, decoding, framing, syntax, schema, and invariant errors", () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "vibe-check-annotate-invalid-"));

    try {
      const validInput = join(tempRoot, "valid-artifacts");
      const candidates = writeCanonicalPublicationFixture(validInput, [
        { level: "warning", message: "valid record" }
      ]);
      const invalidRecord = JSON.parse(candidates.recordsNdjson.trim()) as Record<string, unknown>;
      delete invalidRecord.schemaVersion;
      const invalidRun = JSON.parse(candidates.runJson) as Record<string, unknown>;
      invalidRun.catalogFingerprint = "check-record/v1/catalog/sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
      const invalidCases: Array<{
        artifactDirectory: string;
        args: string[];
        diagnostic: RegExp;
        label: string;
      }> = [
        {
          artifactDirectory: validInput,
          args: [validInput, "1", "extra"],
          diagnostic: /argument/i,
          label: "extra argument"
        },
        ...["0", "01", "9007199254740992"].map((limit) => ({
          artifactDirectory: validInput,
          args: [validInput, limit],
          diagnostic: /limit/i,
          label: `invalid limit ${limit}`
        })),
        {
          artifactDirectory: join(tempRoot, "missing-artifacts"),
          args: [join(tempRoot, "missing-artifacts")],
          diagnostic: /read.*run\.json/i,
          label: "run artifact read failure"
        },
        {
          artifactDirectory: writeArtifactSet(tempRoot, "decoding", candidates.runJson, [0xc3, 0x28, 0x0a]),
          args: [join(tempRoot, "decoding")],
          diagnostic: /records\.ndjson: decoding/i,
          label: "record decoding failure"
        },
        {
          artifactDirectory: writeArtifactSet(tempRoot, "framing", candidates.runJson, candidates.recordsNdjson.trimEnd()),
          args: [join(tempRoot, "framing")],
          diagnostic: /records\.ndjson: framing/i,
          label: "record framing failure"
        },
        {
          artifactDirectory: writeArtifactSet(
            tempRoot,
            "syntax",
            candidates.runJson,
            `${candidates.recordsNdjson}{\n`
          ),
          args: [join(tempRoot, "syntax")],
          diagnostic: /records\.ndjson: syntax.*line 2/i,
          label: "record syntax failure after a valid prefix"
        },
        {
          artifactDirectory: writeArtifactSet(
            tempRoot,
            "schema",
            candidates.runJson,
            `${candidates.recordsNdjson}${JSON.stringify(invalidRecord)}\n`
          ),
          args: [join(tempRoot, "schema")],
          diagnostic: /records\.ndjson: schema.*line 2/i,
          label: "record schema failure after a valid prefix"
        },
        {
          artifactDirectory: writeArtifactSet(
            tempRoot,
            "set-invariant",
            JSON.stringify({}),
            candidates.recordsNdjson
          ),
          args: [join(tempRoot, "set-invariant")],
          diagnostic: /run\.json: schema/i,
          label: "run schema failure"
        },
        {
          artifactDirectory: writeArtifactSet(
            tempRoot,
            "cross-file-invariant",
            JSON.stringify(invalidRun),
            candidates.recordsNdjson
          ),
          args: [join(tempRoot, "cross-file-invariant")],
          diagnostic: /run\.json: set-invariant.*catalog-fingerprint/i,
          label: "cross-file invariant failure"
        }
      ];

      for (const testCase of invalidCases) {
        const result = runAnnotation(testCase.args);
        assert.equal(result.status, 2, `${testCase.label}: ${result.stderr}`);
        assert.equal(result.stdout, "", `${testCase.label} emitted stdout`);
        assert.match(result.stderr, testCase.diagnostic, testCase.label);
      }
    } finally {
      rmSync(tempRoot, { force: true, recursive: true });
    }
  });
});

interface CommandResult {
  readonly status: number | null;
  readonly stderr: string;
  readonly stdout: string;
}

function runAnnotation(args: readonly string[], cwd = repoRoot): CommandResult {
  const result = spawnSync(process.execPath, [annotateEntrypoint, ...args], {
    cwd,
    encoding: "utf8"
  });
  assert.equal(result.error, undefined);
  assert.equal(result.signal, null);
  return {
    status: result.status,
    stderr: result.stderr,
    stdout: result.stdout
  };
}

function writeArtifactSet(
  root: string,
  dirname: string,
  runJson: string,
  recordsNdjson: string | readonly number[]
): string {
  const artifactDirectory = join(root, dirname);
  mkdirSync(artifactDirectory, { recursive: true });
  writeFileSync(join(artifactDirectory, "run.json"), runJson, "utf8");
  writeFileSync(
    join(artifactDirectory, "records.ndjson"),
    typeof recordsNdjson === "string" ? recordsNdjson : Uint8Array.from(recordsNdjson)
  );
  return artifactDirectory;
}

function annotationCommands(stdout: string): string[] {
  return stdout.split(/\r?\n/).filter((line) => line.startsWith("::warning "));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
