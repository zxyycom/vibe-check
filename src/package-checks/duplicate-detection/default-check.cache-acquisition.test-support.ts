import filesystem from "node:fs";
import crypto from "node:crypto";
import processes from "node:child_process";
import path from "node:path";

// Builtin mocks stay in this independently spawned process, never in the shared test runner.
const root = process.argv[2];
if (root === undefined) throw new Error("probe root missing");
const mode = process.argv[3];
const counts = { sourceReads: 0, fingerprintHashes: 0, git: 0, cacheDirectory: 0 };
const read = filesystem.readFileSync;
const hash = crypto.createHash;
const spawn = processes.spawnSync;
const resolve = path.resolve.bind(path);
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
  ...path,
  resolve: (...args: string[]) => {
    if (args.includes(".cache-probe")) counts.cacheDirectory++;
    return Reflect.apply(resolve, path, args);
  }
}));
const { defineConfig, duplicateDetection, run } = await import("../../index.ts");
const check = duplicateDetection({
  cache: { enabled: mode !== "cache-off", directory: ".cache-probe" },
  codeAreas: {
    source: {
      files: { patterns: mode === "no-eligible" ? ["src/a.ts"] : ["src/*.ts"] },
      minimumTokens: Number(process.argv[4] ?? "100")
    }
  },
  scanner: {
    command: {
      kind: "custom",
      executable: `${root}/${mode === "unavailable" ? "missing" : "scanner.mjs"}`
    }
  }
});
const result = await run(
  defineConfig({
    checks: [check],
    outputs: {
      diagnosticLogging: { enabled: false },
      machinePublication: { enabled: false },
      progressRendering: { enabled: false }
    }
  }),
  { projectRoot: root }
);
if (result.kind !== "completed") throw new Error(`unexpected Run result ${result.kind}`);
process.stdout.write(JSON.stringify({ counts, outcome: result.snapshot.checks[0]?.outcome }));
