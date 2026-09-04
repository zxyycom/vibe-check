import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import type { ResolvedJsonValidationOptions } from "./options.ts";
import type {
  CheckDependencies,
  CheckExecutionContext,
  CheckProjectContext,
  CheckResult,
  DeepReadonly
} from "../../check/check.ts";
import { executeJsonValidation } from "./json-validation.ts";
import { jsonValidation } from "./default-check.ts";
import { parseJsonValidationData } from "./final-data.ts";
import type { ProjectFileSelection } from "../project-files/configuration.ts";

const DEFAULT_FILES = Object.freeze({
  exclude: Object.freeze([]),
  include: Object.freeze(["**/*"]),
  source: "filesystem" as const
});
const DEFAULT_OPTIONS = Object.freeze({ maximumBytes: 1_048_576 });
const NO_DEPENDENCIES: CheckDependencies = Object.freeze({
  get: (checkId: string) =>
    Object.freeze({
      ok: false,
      error: Object.freeze({ code: "dependency-not-declared", checkId })
    }),
  list: () => Object.freeze([])
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
  readonly options?: DeepReadonly<Omit<ResolvedJsonValidationOptions, "files">>;
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
  const context: CheckExecutionContext<ResolvedJsonValidationOptions> = Object.freeze({
    artifactDirectory: null,
    dependencies: NO_DEPENDENCIES,
    invocationId: "invocation/v1:direct-check-test",
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
  it("reports selected non-JSON paths and returns exact mixed final counts", async () => {
    const root = createTemporaryProjectRoot();
    try {
      writeFileSync(join(root, "valid.json"), '{"enabled":true}', "utf8");
      writeFileSync(join(root, "invalid.json"), '{"a":1,"a":2}', "utf8");
      writeFileSync(join(root, "ignored.JSON"), '{"a":1,"a":2}', "utf8");
      writeFileSync(join(root, "notes.txt"), "not JSON", "utf8");

      const defaultCheck = jsonValidation();
      assert.equal(defaultCheck.options.maximumBytes, 1_048_576);
      assert.equal(defaultCheck.options.files.source, "filesystem");
      assert.deepEqual(defaultCheck.options.files.include, ["**/*.json"]);
      assert.deepEqual(
        jsonValidation({ files: { include: ["config/**/*.json"] }, maximumBytes: 512 }).options,
        {
          files: {
            exclude: defaultCheck.options.files.exclude,
            include: ["config/**/*.json"],
            source: "filesystem"
          },
          maximumBytes: 512
        }
      );
      assert.throws(
        () => Reflect.apply(jsonValidation, undefined, [{ unknown: true }]),
        /documented closed policy/
      );
      assert.throws(
        () => Reflect.apply(jsonValidation, undefined, [{ maximumBytes: null }]),
        /documented closed policy/
      );
      assert.equal(defaultCheck.parseData, parseJsonValidationData);
      assert.deepEqual(
        defaultCheck.parseData({
          scannedFileCount: 2,
          validFileCount: 1,
          invalidFileCount: 1,
          issueCount: 2,
          rejectedInputCount: 1
        }),
        {
          scannedFileCount: 2,
          validFileCount: 1,
          invalidFileCount: 1,
          issueCount: 2,
          rejectedInputCount: 1
        }
      );
      assert.throws(
        () =>
          defaultCheck.parseData({
            scannedFileCount: 2,
            validFileCount: 2,
            invalidFileCount: 1,
            issueCount: 1,
            rejectedInputCount: 0
          }),
        /jsonValidation final data/
      );
      const invalidPreflight = await defaultCheck.preflight!(
        {
          ...defaultCheck.options,
          maximumBytes: 0
        },
        new AbortController().signal
      );
      assert.equal(invalidPreflight.status, "failure");
      assert.deepEqual(runJsonValidation({ root, options: { maximumBytes: 0 } }).result, {
        status: "unavailable",
        reason: { code: "invalid-options" },
        messages: [
          {
            code: "invalid-options",
            level: "error",
            message:
              "jsonValidation options are invalid; recreate the Check with jsonValidation(options) or restore its complete resolved options."
          }
        ]
      });
      const result = runJsonValidation({ root });
      assert.deepEqual(result.result, {
        status: "failed",
        data: {
          scannedFileCount: 2,
          validFileCount: 1,
          invalidFileCount: 1,
          issueCount: 3,
          rejectedInputCount: 2
        },
        messages: [
          {
            code: "invalid-json-documents",
            level: "error",
            message:
              "1 JSON document(s) are invalid; inspect this Check's Records for each path and reason."
          },
          {
            code: "input-rejected",
            level: "warning",
            message:
              "2 selected jsonValidation input file(s) were rejected because only lower-case .json paths are supported; inspect this Check's Records and narrow files.include/exclude."
          }
        ]
      });
      assert.deepEqual(result.records, [
        {
          identity: { id: "/input-rejected/ignored.JSON" },
          data: {
            blocking: false,
            kind: "input-rejected",
            path: "ignored.JSON",
            reason: "unsupported-file-type"
          }
        },
        {
          identity: { id: "/input-rejected/notes.txt" },
          data: {
            blocking: false,
            kind: "input-rejected",
            path: "notes.txt",
            reason: "unsupported-file-type"
          }
        },
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
          data: {
            scannedFileCount: 1,
            validFileCount: 1,
            invalidFileCount: 0,
            issueCount: 0,
            rejectedInputCount: 0
          }
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
        data: {
          scannedFileCount: 6,
          validFileCount: 1,
          invalidFileCount: 5,
          issueCount: 5,
          rejectedInputCount: 0
        },
        messages: [
          {
            code: "invalid-json-documents",
            level: "error",
            message:
              "5 JSON document(s) are invalid; inspect this Check's Records for each path and reason."
          }
        ]
      });
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("settles all rejected selected inputs as non-blocking findings", () => {
    const root = createTemporaryProjectRoot();
    try {
      writeFileSync(join(root, "ignored.JSON"), "{}", "utf8");
      assert.deepEqual(runJsonValidation({ root }), {
        records: [
          {
            identity: { id: "/input-rejected/ignored.JSON" },
            data: {
              blocking: false,
              kind: "input-rejected",
              path: "ignored.JSON",
              reason: "unsupported-file-type"
            }
          }
        ],
        result: {
          status: "passed",
          data: {
            scannedFileCount: 0,
            validFileCount: 0,
            invalidFileCount: 0,
            issueCount: 1,
            rejectedInputCount: 1
          },
          messages: [
            {
              code: "input-rejected",
              level: "warning",
              message:
                "1 selected jsonValidation input file(s) were rejected because only lower-case .json paths are supported; inspect this Check's Records and narrow files.include/exclude."
            }
          ]
        }
      });
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("is not applicable only when its file selection is empty", () => {
    const root = createTemporaryProjectRoot();
    try {
      writeFileSync(join(root, "ignored.JSON"), "{}", "utf8");
      assert.deepEqual(
        runJsonValidation({
          fileConfiguration: Object.freeze({
            exclude: Object.freeze([]),
            include: Object.freeze(["missing/**"]),
            source: "filesystem"
          }),
          root
        }),
        {
          records: [],
          result: { status: "not-applicable", reason: { code: "no-eligible-input" } }
        }
      );
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("retains accepted Records but becomes unavailable when a later eligible file disappears", () => {
    const root = createTemporaryProjectRoot();
    try {
      writeFileSync(join(root, "bad.json"), '{"a":1,"a":2}', "utf8");
      writeFileSync(join(root, "gone.json"), "{}", "utf8");
      writeFileSync(join(root, "notes.txt"), "not JSON", "utf8");
      const result = runJsonValidation({
        onRecordReported: () => rmSync(join(root, "gone.json"), { force: true }),
        root
      });
      assert.deepEqual(result.records, [
        {
          identity: { id: "/input-rejected/notes.txt" },
          data: {
            blocking: false,
            kind: "input-rejected",
            path: "notes.txt",
            reason: "unsupported-file-type"
          }
        },
        { identity: { id: "bad.json" }, data: { path: "bad.json", reason: "duplicate-key" } }
      ]);
      assert.deepEqual(result.result, {
        status: "unavailable",
        reason: { code: "document-unavailable" },
        messages: [
          {
            code: "document-unavailable",
            level: "error",
            message:
              "A selected JSON document could not be read safely; check that the file still exists, is readable, and was not replaced during the Run."
          },
          {
            code: "input-rejected",
            level: "warning",
            message:
              "1 selected jsonValidation input file(s) were rejected because only lower-case .json paths are supported; inspect this Check's Records and narrow files.include/exclude."
          }
        ]
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
        result: {
          status: "unavailable",
          reason: { code: "execution-cancelled" },
          messages: [
            {
              code: "execution-cancelled",
              level: "error",
              message:
                "JSON validation was cancelled before it could form a complete result; inspect the caller's cancellation reason and retry if appropriate."
            }
          ]
        }
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
        reason: { code: "execution-cancelled" },
        messages: [
          {
            code: "execution-cancelled",
            level: "error",
            message:
              "JSON validation was cancelled before it could form a complete result; inspect the caller's cancellation reason and retry if appropriate."
          }
        ]
      });
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});
