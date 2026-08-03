import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const annotateEntrypoint = join(repoRoot, "scripts", "quality", "annotate.ts");
const canonicalWarningPath = join(
  repoRoot,
  "docs",
  "examples",
  "artifacts",
  "complete-warning",
  "warnings-all.ndjson"
);
const defaultWarningsPath = join(
  "artifacts",
  "vibe-check-quality",
  "warnings-all.ndjson"
);

describe("quality annotation CLI", () => {
  it("accepts the conforming stream, defaults, filtering, and limit matrix", () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "vibe-check-annotate-valid-"));

    try {
      const warning = readCanonicalWarning();
      const warnings = [
        { ...warning, level: "info", message: "filtered info", ruleId: "filtered.info" },
        ...Array.from({ length: 6 }, (_, index) => ({
          ...warning,
          level: index === 0 ? "error" : warning.level,
          message: `rendered warning ${index + 1}`,
          ruleId: `rendered.warning.${index + 1}`
        }))
      ];
      const defaultInput = join(tempRoot, defaultWarningsPath);
      mkdirSync(dirname(defaultInput), { recursive: true });
      writeFileSync(
        defaultInput,
        `${warnings.map((record) => JSON.stringify(record)).join("\n")}\n`,
        "utf8"
      );

      const defaults = runAnnotation([], tempRoot);
      assert.equal(defaults.status, 0);
      assert.equal(defaults.stderr, "");
      assert.equal(annotationCommands(defaults.stdout).length, 5);
      assert.doesNotMatch(defaults.stdout, /filtered\.info|filtered info/);
      assert.doesNotMatch(defaults.stdout, /^::error /m);
      assert.match(
        defaults.stdout,
        /Quality warning annotation limit: showing 5 of 6; see artifacts\/vibe-check-quality\/warnings-all\.ndjson/
      );

      const explicit = runAnnotation([defaultInput, "1"]);
      assert.equal(explicit.status, 0);
      assert.equal(explicit.stderr, "");
      assert.equal(annotationCommands(explicit.stdout).length, 1);
      assert.match(
        explicit.stdout,
        new RegExp(`Quality warning annotation limit: showing 1 of 6; see ${escapeRegExp(defaultInput)}`)
      );

      const zeroInput = join(tempRoot, "zero.ndjson");
      writeFileSync(zeroInput, new Uint8Array());
      const zero = runAnnotation([zeroInput]);
      assert.equal(zero.status, 0);
      assert.equal(zero.stdout, "");
      assert.equal(zero.stderr, "");
    } finally {
      rmSync(tempRoot, { force: true, recursive: true });
    }
  });

  it("fails closed for argument, read, decoding, framing, syntax, and schema errors", () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "vibe-check-annotate-invalid-"));

    try {
      const warning = readCanonicalWarning();
      const validInput = join(tempRoot, "valid.ndjson");
      writeFileSync(validInput, `${JSON.stringify(warning)}\n`, "utf8");

      const missingSchemaVersion = { ...warning };
      delete missingSchemaVersion.schemaVersion;
      const invalidCases: Array<{
        args: string[];
        diagnostic: RegExp;
        label: string;
      }> = [
        {
          args: [validInput, "1", "extra"],
          diagnostic: /argument/i,
          label: "extra argument"
        },
        ...["0", "01", "9007199254740992"].map((limit) => ({
          args: [validInput, limit],
          diagnostic: /limit/i,
          label: `invalid limit ${limit}`
        })),
        {
          args: [join(tempRoot, "missing.ndjson")],
          diagnostic: /read/i,
          label: "read failure"
        },
        {
          args: [writeBytes(tempRoot, "decoding.ndjson", [0xc3, 0x28, 0x0a])],
          diagnostic: /decoding/i,
          label: "decoding failure"
        },
        {
          args: [writeBytes(tempRoot, "framing.ndjson", JSON.stringify(warning))],
          diagnostic: /framing/i,
          label: "framing failure"
        },
        {
          args: [
            writeBytes(
              tempRoot,
              "syntax.ndjson",
              `${JSON.stringify(warning)}\n{\n`
            )
          ],
          diagnostic: /syntax/i,
          label: "syntax failure after a valid prefix"
        },
        {
          args: [
            writeBytes(
              tempRoot,
              "schema.ndjson",
              `${JSON.stringify(warning)}\n${JSON.stringify(missingSchemaVersion)}\n`
            )
          ],
          diagnostic: /schema.*\/schemaVersion/i,
          label: "schema failure after a valid prefix"
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

function readCanonicalWarning(): Record<string, unknown> {
  return JSON.parse(readFileSync(canonicalWarningPath, "utf8").trim()) as Record<string, unknown>;
}

function writeBytes(
  root: string,
  filename: string,
  content: string | readonly number[]
): string {
  const path = join(root, filename);
  writeFileSync(path, typeof content === "string" ? content : Uint8Array.from(content));
  return path;
}

function annotationCommands(stdout: string): string[] {
  return stdout.split(/\r?\n/).filter((line) => line.startsWith("::warning "));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
