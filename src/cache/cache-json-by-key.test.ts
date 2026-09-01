import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { cacheJsonByKey } from "./cache-json-by-key.ts";

type Payload = Readonly<{
  readonly count: number;
  readonly nested?: Readonly<{ readonly value: string }>;
}>;

async function withCacheDirectory(run: (directory: string) => Promise<void>): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), "vibe-check-cache-"));
  try {
    await run(directory);
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
}

function parsePayload(value: unknown): Payload {
  if (!isRecord(value) || typeof value.count !== "number") {
    throw new TypeError("payload must have numeric count");
  }
  if (value.nested === undefined) return { count: value.count };
  if (!isRecord(value.nested) || typeof value.nested.value !== "string") {
    throw new TypeError("payload nested value is invalid");
  }
  return { count: value.count, nested: { value: value.nested.value } };
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function options(directory: string, compute: () => unknown) {
  return {
    compute,
    directory,
    key: "source:1",
    namespace: "test.cache",
    parse: parsePayload,
    version: "1"
  };
}

function runIsolatedRenameScenario(errorCode: "EACCES" | "EEXIST"): unknown {
  const cacheModuleUrl = new URL("./cache-json-by-key.ts", import.meta.url).href;
  const result = spawnSync(
    process.execPath,
    ["-e", isolatedRenameScenario(cacheModuleUrl, errorCode)],
    {
      encoding: "utf8"
    }
  );
  assert.equal(
    result.error,
    undefined,
    `isolated rename scenario could not start: ${result.error?.message}`
  );
  assert.equal(result.signal, null, `isolated rename scenario was terminated by ${result.signal}`);
  assert.equal(result.status, 0, `isolated rename scenario failed: ${result.stderr}`);
  return JSON.parse(result.stdout) as unknown;
}

function isolatedRenameScenario(cacheModuleUrl: string, errorCode: "EACCES" | "EEXIST"): string {
  return `
import { promises as fs } from "node:fs";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cacheJsonByKey } from ${JSON.stringify(cacheModuleUrl)};

const directory = await mkdtemp(join(tmpdir(), "vibe-check-cache-rename-"));
const parse = (value) => {
  if (value === null || typeof value !== "object" || Array.isArray(value) || typeof value.count !== "number") {
    throw new TypeError("payload must have numeric count");
  }
  return { count: value.count };
};
const options = (compute) => ({
  compute,
  directory,
  key: "rename-scenario",
  namespace: "test.cache",
  parse,
  version: "1"
});
try {
  const initial = await cacheJsonByKey(options(() => ({ count: 1 })));
  if (initial.write !== "stored") throw new Error("initial cache entry was not stored");
  const [entry] = await readdir(directory);
  const target = join(directory, entry);
  const validConcurrentEntry = await readFile(target, "utf8");
  await rm(target);
  const originalRename = fs.rename;
  fs.rename = async () => {
    await writeFile(target, validConcurrentEntry, "utf8");
    throw Object.assign(new Error("simulated rename failure"), { code: ${JSON.stringify(errorCode)} });
  };
  try {
    process.stdout.write(JSON.stringify(await cacheJsonByKey(options(() => ({ count: 2 })) )));
  } finally {
    fs.rename = originalRename;
  }
} finally {
  await rm(directory, { force: true, recursive: true });
}
`;
}

describe("caller-keyed JSON cache", () => {
  it("validates a closed absolute input grammar before reading or computing", async () => {
    await withCacheDirectory(async (directory) => {
      for (const candidate of [
        { ...options(directory, () => ({ count: 1 })), extra: true },
        { ...options(directory, () => ({ count: 1 })), directory: "relative" },
        { ...options(directory, () => ({ count: 1 })), directory: "\0" },
        { ...options(directory, () => ({ count: 1 })), key: "" },
        { ...options(directory, () => ({ count: 1 })), namespace: "" },
        { ...options(directory, () => ({ count: 1 })), version: "" }
      ]) {
        await assert.rejects(cacheJsonByKey(candidate), /cacheJsonByKey/);
      }
    });
  });

  it("uses a digest-only identity and returns a parser-backed hit without recomputing", async () => {
    await withCacheDirectory(async (directory) => {
      let calls = 0;
      const first = await cacheJsonByKey(options(directory, () => ({ count: ++calls })));
      const second = await cacheJsonByKey(options(directory, () => ({ count: ++calls })));
      assert.deepEqual(first, {
        read: "miss",
        source: "computed",
        value: { count: 1 },
        write: "stored"
      });
      assert.deepEqual(second, {
        read: "hit",
        source: "cache",
        value: { count: 1 },
        write: "not-attempted"
      });
      assert.equal(Object.isFrozen(second), true);
      assert.equal(calls, 1);
      const files = await readdir(directory);
      assert.equal(files.length, 1);
      assert.match(files[0] ?? "", /^[a-f0-9]{64}\.json$/);
      const entry = await readFile(join(directory, files[0] ?? ""), "utf8");
      assert.equal(entry.includes("source:1"), false);
      assert.equal(entry.includes("test.cache"), false);
    });
  });

  it("isolates namespace, payload version, and key identities", async () => {
    await withCacheDirectory(async (directory) => {
      const calls: string[] = [];
      for (const [namespace, version, key] of [
        ["cache", "1", "one"],
        ["cache.two", "1", "one"],
        ["cache", "2", "one"],
        ["cache", "1", "two"]
      ]) {
        await cacheJsonByKey({
          compute: () => ({ count: calls.push(`${namespace}:${version}:${key}`) }),
          directory,
          key,
          namespace,
          parse: parsePayload,
          version
        });
      }
      assert.equal(calls.length, 4);
      assert.equal((await readdir(directory)).length, 4);
    });
  });

  it("recovers malformed, mismatched, parser-rejected, and read-failed entries by computing once", async () => {
    await withCacheDirectory(async (directory) => {
      let initialCalls = 0;
      const initial = await cacheJsonByKey(options(directory, () => ({ count: ++initialCalls })));
      assert.equal(initial.write, "stored");
      assert.equal(initialCalls, 1);
      const [entry] = await readdir(directory);
      const target = join(directory, entry ?? "");
      await writeFile(target, "not json", "utf8");
      let malformedCalls = 0;
      const malformed = await cacheJsonByKey(
        options(directory, () => ({ count: ++malformedCalls + 1 }))
      );
      assert.equal(malformed.read, "invalid");
      assert.equal(malformedCalls, 1);
      await writeFile(
        target,
        JSON.stringify({
          cacheFormatVersion: "caller-keyed-json-v1",
          identityDigest: "0".repeat(64),
          payload: { count: 3 }
        }),
        "utf8"
      );
      let mismatchCalls = 0;
      const mismatch = await cacheJsonByKey(
        options(directory, () => ({ count: ++mismatchCalls + 3 }))
      );
      assert.equal(mismatch.read, "invalid");
      assert.equal(mismatchCalls, 1);
      await writeFile(
        target,
        JSON.stringify({
          cacheFormatVersion: "caller-keyed-json-v1",
          identityDigest: (await readdir(directory))[0]?.replace(".json", ""),
          payload: { count: "bad" }
        }),
        "utf8"
      );
      let rejectedCalls = 0;
      const rejected = await cacheJsonByKey(
        options(directory, () => ({ count: ++rejectedCalls + 4 }))
      );
      assert.equal(rejected.read, "invalid");
      assert.equal(rejectedCalls, 1);
      await rm(target);
      await mkdir(target);
      let failedCalls = 0;
      const failed = await cacheJsonByKey(options(directory, () => ({ count: ++failedCalls + 5 })));
      assert.equal(failedCalls, 1);
      assert.deepEqual(failed, {
        read: "failed",
        source: "computed",
        value: { count: 6 },
        write: "failed"
      });
    });
  });

  it("rejects thenable parsers at runtime without writing an entry", async () => {
    await withCacheDirectory(async (directory) => {
      const parse = async (value: unknown): Promise<Payload> => parsePayload(value);
      await assert.rejects(
        cacheJsonByKey({
          compute: () => ({ count: 1 }),
          directory,
          key: "thenable-parser",
          namespace: "test.cache",
          // @ts-expect-error cache payload parsing must synchronously return a non-thenable value.
          parse,
          version: "1"
        }),
        /parse must synchronously return computed value/
      );
      assert.deepEqual(await readdir(directory), []);
    });
  });

  it("counts only an EEXIST rename with a valid reread as stored", () => {
    assert.deepEqual(runIsolatedRenameScenario("EEXIST"), {
      read: "miss",
      source: "computed",
      value: { count: 2 },
      write: "stored"
    });
  });

  it("classifies an ordinary rename failure as failed without rereading a target", () => {
    assert.deepEqual(runIsolatedRenameScenario("EACCES"), {
      read: "miss",
      source: "computed",
      value: { count: 2 },
      write: "failed"
    });
  });

  it("uses the same canonical payload/parser boundary for computation and cache hits", async () => {
    await withCacheDirectory(async (directory) => {
      const parsed: unknown[] = [];
      const parse = (value: unknown): Payload => {
        parsed.push(value);
        return parsePayload(value);
      };
      const first = await cacheJsonByKey({
        compute: () => ({ count: 1, nested: { value: "one" } }),
        directory,
        key: "parity",
        namespace: "test.cache",
        parse,
        version: "1"
      });
      const second = await cacheJsonByKey({
        compute: () => ({ count: 2 }),
        directory,
        key: "parity",
        namespace: "test.cache",
        parse,
        version: "1"
      });
      assert.deepEqual(first.value, second.value);
      assert.equal(parsed.length, 2);
      assert.equal(Object.isFrozen(parsed[0]), true);
      assert.equal(Object.isFrozen(parsed[1]), true);
    });
  });

  it("does not publish thrown, cancelled, noncanonical, or parser-rejected computations", async () => {
    await withCacheDirectory(async (directory) => {
      for (const compute of [
        () => {
          throw new Error("compute failed");
        },
        () => Promise.reject(new Error("compute cancelled")),
        () => ["not", "an", "object"],
        () => ({ count: "rejected" })
      ]) {
        await assert.rejects(cacheJsonByKey(options(directory, compute)));
        assert.deepEqual(await readdir(directory), []);
      }
    });
  });

  it("keeps computed values when the target directory cannot be published", async () => {
    await withCacheDirectory(async (directory) => {
      const fileDirectory = join(directory, "not-a-directory");
      await writeFile(fileDirectory, "occupied", "utf8");
      const result = await cacheJsonByKey(options(fileDirectory, () => ({ count: 7 })));
      assert.deepEqual(result, {
        read: "failed",
        source: "computed",
        value: { count: 7 },
        write: "failed"
      });
    });
  });

  it("permits concurrent computation while exposing only a complete cached target", async () => {
    await withCacheDirectory(async (directory) => {
      let release!: () => void;
      const barrier = new Promise<void>((resolve) => {
        release = resolve;
      });
      let calls = 0;
      const run = () =>
        cacheJsonByKey(
          options(directory, async () => {
            calls += 1;
            await barrier;
            return { count: 8 };
          })
        );
      const left = run();
      const right = run();
      await new Promise((resolve) => setTimeout(resolve, 10));
      release();
      const [first, second] = await Promise.all([left, right]);
      assert.equal(calls, 2);
      assert.equal(first.source, "computed");
      assert.equal(second.source, "computed");
      assert.equal(first.write, "stored");
      assert.equal(second.write, "stored");
      const hit = await cacheJsonByKey(options(directory, () => ({ count: 9 })));
      assert.deepEqual(hit, {
        read: "hit",
        source: "cache",
        value: { count: 8 },
        write: "not-attempted"
      });
      assert.deepEqual(
        (await readdir(directory)).filter((name) => name.endsWith(".tmp")),
        []
      );
    });
  });
});
