import filesystem from "node:fs";
import crypto from "node:crypto";
import processes from "node:child_process";
import path from "node:path";

import type { CacheAcquisitionProbe } from "./constructor.cache.test-support.ts";

// Builtin mocks stay in this independently spawned process, never in the shared test runner.
const root = process.argv[2];
if (root === undefined) throw new Error("probe root missing");
const counts = { sourceReads: 0, fingerprintHashes: 0, git: 0, cacheDirectory: 0 };
const read = filesystem.readFileSync;
const hash = crypto.createHash;
const spawn = processes.spawnSync;
const originalPath = { ...path };
const bunTest = await import("bun:test");
const mock: unknown = Reflect.get(bunTest, "mock");
if (typeof mock !== "function") throw new Error("Bun mock unavailable");
const mockModule: unknown = Reflect.get(mock, "module");
if (typeof mockModule !== "function") throw new Error("Bun module mock unavailable");
const mockBuiltin = (specifier: string, factory: () => object): void => {
  Reflect.apply(mockModule, mock, [specifier, factory]);
};
mockBuiltin("node:fs", () => ({
  ...filesystem,
  readFileSync: (...args: Parameters<typeof read>) => {
    if (String(args[0]).startsWith(`${root}/src/`)) counts.sourceReads++;
    return Reflect.apply(read, filesystem, args);
  }
}));
mockBuiltin("node:crypto", () => ({
  ...crypto,
  createHash: (...args: Parameters<typeof hash>) => {
    if (new Error().stack?.includes("file-fingerprint.ts") === true) counts.fingerprintHashes++;
    return Reflect.apply(hash, crypto, args);
  }
}));
mockBuiltin("node:child_process", () => ({
  ...processes,
  spawnSync: (...args: Parameters<typeof spawn>) => {
    if (args[0] === "git") counts.git++;
    return Reflect.apply(spawn, processes, args);
  }
}));
mockBuiltin("node:path", () => ({
  ...originalPath,
  resolve: (...args: string[]) => {
    if (args.includes(".cache-probe")) counts.cacheDirectory++;
    return originalPath.resolve(...args);
  }
}));
const { duplicateDetection } = await import("./constructor.ts");
const { executeDuplicateDetection } = await import("./execution.ts");
const { executeCheck } = await import("../check-execution.test-support.ts");
// Load the expectations after Product imports so its fingerprint module observes the builtin mocks.
const { assertCacheAcquisitionSequence } = await import("./constructor.cache.test-support.ts");
let probeCount = 0;
const probe: CacheAcquisitionProbe = async (mode, minimumTokens = 100) => {
  // Fixture reads/assertions between executions must not contribute to the next acquisition counts.
  counts.sourceReads = 0;
  counts.fingerprintHashes = 0;
  counts.git = 0;
  counts.cacheDirectory = 0;
  const check = duplicateDetection({
    cache: { enabled: mode !== "cache-off", directory: ".cache-probe" },
    codeAreas: {
      source: {
        files: { patterns: mode === "no-eligible" ? ["src/a.ts"] : ["src/*.ts"] },
        minimumTokens
      }
    },
    scanner: {
      command: {
        kind: "custom",
        executable: `${root}/${mode === "unavailable" ? "missing" : "scanner.mjs"}`
      }
    }
  });
  const { result } = await executeCheck(executeDuplicateDetection, check.options, root);
  probeCount++;
  return { counts: { ...counts }, result };
};
await assertCacheAcquisitionSequence(root, probe);
process.stdout.write(JSON.stringify({ probeCount }));
