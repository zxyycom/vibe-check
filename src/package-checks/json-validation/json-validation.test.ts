import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import type { JsonValidationOptions } from "./options.ts";
import type {
  CheckDependencies,
  CheckExecutionContext,
  CheckProjectContext,
  CheckResult,
  DeepReadonly
} from "../../check/check.ts";
import { executeJsonValidation } from "./json-validation.ts";
import { jsonValidation } from "./default-check.ts";
import type { ProjectFileSelection } from "../project-files/configuration.ts";

const DEFAULT_FILES = Object.freeze({
  exclude: Object.freeze([]),
  include: Object.freeze(["**/*"]),
  source: "filesystem" as const
});
const DEFAULT_OPTIONS = Object.freeze({ maximumBytes: 1_048_576 });
const NO_DEPENDENCIES: CheckDependencies = Object.freeze({
  get: (checkId: string) =>
    Object.freeze({ ok: false, error: Object.freeze({ code: "dependency-not-declared", checkId }) })
});

interface ObservedRecord {
  readonly data: object;
  readonly identity: Readonly<{ readonly id: string }>;
}

interface JsonValidationExecution {
  readonly records: readonly ObservedRecord[];
  readonly result: CheckResult;
}

interface RunJsonValidationInput {
  readonly fileConfiguration?: ProjectFileSelection;
  readonly onRecordReported?: (record: ObservedRecord) => void;
  readonly options?: DeepReadonly<Omit<JsonValidationOptions, "files">>;
  readonly root: string;
  readonly signal?: AbortSignal;
}

function createProjectContext(root: string): CheckProjectContext {
  return Object.freeze({
    flags: Object.freeze([]),
    root
  });
}

function runJsonValidation({
  fileConfiguration = DEFAULT_FILES,
  onRecordReported,
  options = DEFAULT_OPTIONS,
  root,
  signal = new AbortController().signal
}: RunJsonValidationInput): JsonValidationExecution {
  const records: ObservedRecord[] = [];
  const context: CheckExecutionContext<JsonValidationOptions> = Object.freeze({
    dependencies: NO_DEPENDENCIES,
    options: Object.freeze({ ...options, files: fileConfiguration }),
    project: createProjectContext(root),
    records: Object.freeze({
      report: (identity: Readonly<{ readonly id: string }>, data: object): void => {
        const record = Object.freeze({ data, identity });
        records.push(record);
        onRecordReported?.(record);
      }
    }),
    signal
  });
  return Object.freeze({ result: executeJsonValidation(context), records: Object.freeze(records) });
}

function createTemporaryProjectRoot(): string {
  return mkdtempSync(join(tmpdir(), "vibe-check-json-validation-"));
}

describe("JSON validation default Check", () => {
  it("filters only lower-case .json paths from its file selection and returns exact final counts", async () => {
    const root = createTemporaryProjectRoot();
    try {
      writeFileSync(join(root, "valid.json"), '{"enabled":true}', "utf8");
      writeFileSync(join(root, "invalid.json"), '{"a":1,"a":2}', "utf8");
      writeFileSync(join(root, "ignored.JSON"), '{"a":1,"a":2}', "utf8");
      writeFileSync(join(root, "notes.txt"), "not JSON", "utf8");

      const invalidPreflight = await jsonValidation.preflight!(
        {
          ...jsonValidation.options,
          maximumBytes: 0
        },
        new AbortController().signal
      );
      assert.equal(invalidPreflight.status, "failure");
      assert.deepEqual(runJsonValidation({ root, options: { maximumBytes: 0 } }).result, {
        status: "unavailable",
        reason: { code: "invalid-options" }
      });
      const result = runJsonValidation({ root });
      assert.deepEqual(result.result, {
        status: "failed",
        data: { scannedFileCount: 2, validFileCount: 1, invalidFileCount: 1, issueCount: 1 }
      });
      assert.deepEqual(result.records, [
        {
          identity: { id: "invalid.json" },
          data: { path: "invalid.json", reason: "duplicate-key" }
        }
      ]);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("uses only its included JSON paths without re-adding excluded paths", () => {
    const root = createTemporaryProjectRoot();
    try {
      mkdirSync(join(root, "generated"));
      mkdirSync(join(root, "vendor"));
      writeFileSync(join(root, "included.json"), "null", "utf8");
      writeFileSync(join(root, "generated", "invalid.json"), "{", "utf8");
      writeFileSync(join(root, "vendor", "invalid.json"), "{", "utf8");
      const files: ProjectFileSelection = Object.freeze({
        exclude: Object.freeze(["**/vendor/**", "generated/**"]),
        include: Object.freeze(["**/*"]),
        source: "filesystem"
      });

      assert.deepEqual(runJsonValidation({ fileConfiguration: files, root }), {
        records: [],
        result: {
          status: "passed",
          data: { scannedFileCount: 1, validFileCount: 1, invalidFileCount: 0, issueCount: 0 }
        }
      });
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("reports every closed document issue once with redacted Records and exact counts", () => {
    const root = createTemporaryProjectRoot();
    try {
      writeFileSync(join(root, "bom.json"), new Uint8Array([0xef, 0xbb, 0xbf]));
      writeFileSync(join(root, "duplicate.json"), '{"a":1,"a":2}', "utf8");
      writeFileSync(join(root, "grammar.json"), "{", "utf8");
      writeFileSync(join(root, "utf8.json"), new Uint8Array([0xc3, 0x28]));
      writeFileSync(join(root, "too-large.json"), new Uint8Array(31));
      writeFileSync(join(root, "valid.json"), "null", "utf8");

      const result = runJsonValidation({ options: { maximumBytes: 30 }, root });
      assert.deepEqual(result.records, [
        { identity: { id: "bom.json" }, data: { path: "bom.json", reason: "bom" } },
        {
          identity: { id: "duplicate.json" },
          data: { path: "duplicate.json", reason: "duplicate-key" }
        },
        {
          identity: { id: "grammar.json" },
          data: { path: "grammar.json", reason: "invalid-json" }
        },
        {
          identity: { id: "too-large.json" },
          data: { path: "too-large.json", reason: "too-large" }
        },
        {
          identity: { id: "utf8.json" },
          data: { path: "utf8.json", reason: "invalid-utf8" }
        }
      ]);
      assert.deepEqual(result.result, {
        status: "failed",
        data: { scannedFileCount: 6, validFileCount: 1, invalidFileCount: 5, issueCount: 5 }
      });
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("is not applicable when its file selection has no lower-case JSON input", () => {
    const root = createTemporaryProjectRoot();
    try {
      writeFileSync(join(root, "ignored.JSON"), "{}", "utf8");
      assert.deepEqual(runJsonValidation({ root }), {
        records: [],
        result: { status: "not-applicable", reason: { code: "no-eligible-input" } }
      });
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("retains accepted Records but becomes unavailable when a later eligible file disappears", () => {
    const root = createTemporaryProjectRoot();
    try {
      writeFileSync(join(root, "bad.json"), '{"a":1,"a":2}', "utf8");
      writeFileSync(join(root, "gone.json"), "{}", "utf8");
      const result = runJsonValidation({
        onRecordReported: () => unlinkSync(join(root, "gone.json")),
        root
      });
      assert.deepEqual(result.records, [
        { identity: { id: "bad.json" }, data: { path: "bad.json", reason: "duplicate-key" } }
      ]);
      assert.deepEqual(result.result, {
        status: "unavailable",
        reason: { code: "document-unavailable" }
      });
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("honors cancellation before and between file boundaries without final data", () => {
    const root = createTemporaryProjectRoot();
    try {
      writeFileSync(join(root, "bad.json"), '{"a":1,"a":2}', "utf8");
      writeFileSync(join(root, "later.json"), "{}", "utf8");
      const before = new AbortController();
      before.abort();
      assert.deepEqual(runJsonValidation({ root, signal: before.signal }), {
        records: [],
        result: { status: "unavailable", reason: { code: "execution-cancelled" } }
      });

      const between = new AbortController();
      const result = runJsonValidation({
        onRecordReported: () => between.abort(),
        root,
        signal: between.signal
      });
      assert.deepEqual(result.records, [
        { identity: { id: "bad.json" }, data: { path: "bad.json", reason: "duplicate-key" } }
      ]);
      assert.deepEqual(result.result, {
        status: "unavailable",
        reason: { code: "execution-cancelled" }
      });
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});
