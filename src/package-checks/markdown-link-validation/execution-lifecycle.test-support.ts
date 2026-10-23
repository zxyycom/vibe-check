import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { EventEmitter } from "node:events";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import * as filesystemPromises from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as workerThreads from "node:worker_threads";

import type { LinkIoRequest, LinkIoResponse } from "./io-protocol.ts";
import type { ResolvedMarkdownLinkValidationOptions } from "./options.ts";
import { readRegularFileNative } from "./io-native.ts";

interface FinalizationScenario {
  readonly content: string;
  readonly maxMarkdownBytes?: number;
  readonly closeFault?: boolean;
  readonly abortOnClose?: boolean;
  readonly failCacheAppend?: boolean;
  readonly expected:
    | Readonly<{
        status: "unavailable";
        code: "target-unavailable" | "cancelled" | "source-too-large" | "invalid-local-destination";
      }>
    | Readonly<{ status: "passed" | "failed" }>;
}

const FINALIZATION_SCENARIOS = [
  {
    content: "[missing](missing.md)",
    closeFault: true,
    expected: { status: "unavailable", code: "target-unavailable" }
  },
  {
    content: "[missing](missing.md)",
    closeFault: true,
    abortOnClose: true,
    expected: { status: "unavailable", code: "cancelled" }
  },
  {
    content: "# Too large",
    maxMarkdownBytes: 1,
    closeFault: true,
    expected: { status: "unavailable", code: "source-too-large" }
  },
  {
    content: "# Too large",
    maxMarkdownBytes: 1,
    closeFault: true,
    abortOnClose: true,
    expected: { status: "unavailable", code: "cancelled" }
  },
  {
    content: "[bad](%00)",
    closeFault: true,
    expected: { status: "unavailable", code: "invalid-local-destination" }
  },
  { content: "[missing](missing.md)", failCacheAppend: true, expected: { status: "failed" } },
  { content: "# Okay", failCacheAppend: true, expected: { status: "passed" } }
] as const satisfies readonly FinalizationScenario[];

/** A child-local Worker double observes publication without replacing the shared runner's modules. */
export function assertFinalizationPriority(): void {
  const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], {
    encoding: "utf8",
    timeout: 20_000
  });
  assert.equal(child.error, undefined, child.error?.message);
  assert.equal(child.status, 0, `${child.stdout}\n${child.stderr}`);
}

/** Only the isolated child installs the module mock, before importing production execution. */
async function verifyFinalizationPriority(): Promise<void> {
  const { mock } = await import("bun:test");
  let controller = new AbortController();
  let scenario: FinalizationScenario = FINALIZATION_SCENARIOS[0];
  let exits = 0;
  let constructions = 0;
  let cacheAppendAttempts = 0;
  let cacheFileToFail: string | undefined;
  // Bun mocks replace live module exports; snapshot all delegates before installing the mock.
  const realFilesystemPromises = { ...filesystemPromises };
  const realAppendFile = realFilesystemPromises.appendFile;
  mock.module("node:fs/promises", () => ({
    ...realFilesystemPromises,
    appendFile: async (
      ...args: Parameters<typeof realAppendFile>
    ): ReturnType<typeof realAppendFile> => {
      if (args[0] === cacheFileToFail) {
        cacheAppendAttempts++;
        throw new Error("Injected cache publication append failure");
      }
      return realAppendFile(...args);
    }
  }));
  mock.module("node:worker_threads", () => ({
    ...workerThreads,
    Worker: class extends EventEmitter {
      readonly root: string;
      readonly flag: Int32Array;

      constructor(
        _url: URL,
        options: Readonly<{
          workerData: Readonly<{ root: string; cancellation: SharedArrayBuffer }>;
        }>
      ) {
        super();
        constructions++;
        this.root = options.workerData.root;
        this.flag = new Int32Array(options.workerData.cancellation);
      }

      postMessage(request: LinkIoRequest): void {
        queueMicrotask(() => {
          if (request.kind === "close") {
            if (scenario.abortOnClose === true) controller.abort();
            this.emit("message", {
              kind: scenario.closeFault === true ? "invalid-close" : "closed",
              id: request.id
            });
            exits++;
            this.emit("exit", 0);
            return;
          }
          this.emit("message", observeFixtureJob(request, this.root, this.flag));
        });
      }

      terminate(): never {
        throw new Error("must not terminate active or normal work");
      }
    }
  }));
  const { executeMarkdownLinkValidation } = await import("./execution.ts");
  const { execute, MARKDOWN_LINK_OPTIONS, MARKDOWN_FILES } =
    await import("./constructor.test-support.ts");
  const root = mkdtempSync(join(tmpdir(), "mdlink-finalization-"));
  const cacheDirectory = join(root, "cache");
  try {
    mkdirSync(join(root, "docs"));
    for (scenario of FINALIZATION_SCENARIOS) {
      controller = new AbortController();
      constructions = 0;
      exits = 0;
      cacheAppendAttempts = 0;
      cacheFileToFail =
        scenario.failCacheAppend === true
          ? join(cacheDirectory, "markdown-link-parse-facts-v1.jsonl")
          : undefined;
      writeFileSync(join(root, "docs", "source.md"), scenario.content);
      const options: ResolvedMarkdownLinkValidationOptions = {
        ...MARKDOWN_LINK_OPTIONS,
        limits: {
          ...MARKDOWN_LINK_OPTIONS.limits,
          maxMarkdownBytes: scenario.maxMarkdownBytes ?? 1_024
        },
        cache:
          scenario.failCacheAppend === true
            ? { enabled: true, directory: cacheDirectory }
            : { enabled: false }
      };
      const result = await execute(
        executeMarkdownLinkValidation,
        options,
        root,
        MARKDOWN_FILES,
        controller.signal
      );
      assert.equal(constructions, 1);
      assert.equal(exits, 1, "execution must await exit before settlement");
      assert.equal(result.result.status, scenario.expected.status);
      if (scenario.expected.status === "unavailable") {
        assert.equal(result.result.status, "unavailable");
        if (result.result.status === "unavailable") {
          assert.equal(result.result.reason.code, scenario.expected.code);
        }
        assert.deepEqual(result.records, []);
        assert.equal("data" in result.result, false);
      }
      if (scenario.failCacheAppend === true) {
        assert.equal(
          cacheAppendAttempts,
          1,
          "the cache must reach append before the injected publication failure"
        );
        assert.ok(result.result.status === "passed" || result.result.status === "failed");
        const findingCount = scenario.expected.status === "failed" ? 1 : 0;
        assert.equal(result.records.length, findingCount);
        assert.deepEqual(result.result.data, {
          sourceFileCount: 1,
          occurrenceCount: findingCount,
          targetReadCount: findingCount,
          findingCount,
          rejectedInputCount: 0
        });
      }
    }
    controller = new AbortController();
    constructions = 0;
    exits = 0;
    const empty = await execute(
      executeMarkdownLinkValidation,
      MARKDOWN_LINK_OPTIONS,
      root,
      { patterns: ["nothing.md"] },
      controller.signal
    );
    assert.equal(empty.result.status, "not-applicable");
    assert.equal(constructions, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

/** This lifecycle fixture has one authorized source and one missing target, not a general I/O backend. */
function observeFixtureJob(
  request: Extract<LinkIoRequest, { kind: "job" }>,
  root: string,
  cancellation: Int32Array
): LinkIoResponse {
  const { job, id } = request;
  if (job.kind === "source-read") {
    const sourcePath = join(root, "docs", "source.md");
    assert.equal(job.path, sourcePath);
    return {
      kind: "source-read",
      id,
      source: {
        probe: { kind: "contained", absolutePath: sourcePath },
        read: readRegularFileNative(sourcePath, job.maxBytes, cancellation)
      }
    };
  }
  if (job.kind === "containment") {
    const missingTargetPath = join(root, "docs", "missing.md");
    assert.equal(job.path, missingTargetPath);
    return { kind: "containment", id, probe: { kind: "missing", absolutePath: missingTargetPath } };
  }
  assert.fail(`Unexpected lifecycle fixture I/O job: ${job.kind}`);
}

if (import.meta.main) await verifyFinalizationPriority();
