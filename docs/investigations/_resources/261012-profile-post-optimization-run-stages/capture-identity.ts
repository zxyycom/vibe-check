/** Read-only runtime/source/lock identity; never part of the Run timing window. */
import { execFileSync } from "node:child_process";
import { readdirSync, writeFileSync } from "node:fs";
import { arch, cpus, hostname, platform, release, totalmem } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sourceManifest, manifestSha256, fileSha256 } from "./source-identity.ts";
const artifactRoot = fileURLToPath(new URL("./", import.meta.url));
const baseline = sourceManifest("/workspace/vibe-check");
const instrumented = sourceManifest(resolve(artifactRoot, "instrumented"));
const expected = new Set([
  "src/project-run/check-execution/plan.ts",
  "src/project-run/task-scheduler/graph.ts",
  "src/project-run/task-scheduler/scheduler.ts"
]);
if (baseline.length !== instrumented.length) throw new Error("Copied source inventory changed");
const differences = baseline.filter((entry, index) => {
  const copied = instrumented[index];
  if (copied === undefined || entry.path !== copied.path)
    throw new Error("Copied source file set changed");
  return entry.sha256 !== copied.sha256;
});
if (differences.length !== expected.size || differences.some((entry) => !expected.has(entry.path)))
  throw new Error("Unexpected instrumented source changes");
if (manifestSha256(baseline) !== "817a47c1ecfb19f12f74d5bac7ff55743b97e7aa4153a3c3d2db56d236129f0f")
  throw new Error("Current baseline src identity changed");
const artifactFiles = readdirSync(artifactRoot)
  .filter((name) => name.endsWith(".ts"))
  .sort();
const identity = {
  capturedAt: new Date().toISOString(),
  repositoryHead: execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: "/workspace/vibe-check",
    encoding: "utf8"
  }).trim(),
  baseline: {
    sourceManifestSha256: manifestSha256(baseline),
    fileCount: baseline.length
  },
  instrumented: {
    sourceManifestSha256: manifestSha256(instrumented),
    fileCount: instrumented.length,
    changedPaths: differences.map((entry) => ({
      path: entry.path,
      baselineSha256: entry.sha256,
      instrumentedSha256: instrumented.find((copied) => copied.path === entry.path)?.sha256
    }))
  },
  artifacts: artifactFiles.map((path) => ({
    path,
    sha256: fileSha256(resolve(artifactRoot, path))
  })),
  policyAndLocks: [
    "package.json",
    "pnpm-lock.yaml",
    "mise.lock",
    "mise.toml",
    "tsconfig.json",
    ".oxlintrc.json",
    ".oxfmtrc.json"
  ].map((path) => ({ path, sha256: fileSha256(resolve("/workspace/vibe-check", path)) })),
  host: {
    hostname: hostname(),
    platform: platform(),
    arch: arch(),
    release: release(),
    totalMemoryBytes: totalmem(),
    logicalCpuCount: cpus().length,
    cpuModels: [...new Set(cpus().map((cpu) => cpu.model))]
  },
  runtime: { executable: process.execPath, versions: process.versions },
  executionContext: {
    cwd: process.cwd(),
    projectRoot: "/workspace/vibe-check",
    changes: "not configured; no Product Git acquisition",
    dependencyPath: "/workspace/vibe-check/node_modules (same unmodified symlink target)"
  }
};
const suffix = process.argv[2] ?? "prepared";
if (!/^[a-z-]+$/.test(suffix))
  throw new Error("Identity suffix requires lowercase letters/hyphens");
writeFileSync(
  resolve(artifactRoot, `identity-${suffix}.json`),
  JSON.stringify(identity, null, 2) + "\n"
);
console.log(
  JSON.stringify({
    baseline: identity.baseline.sourceManifestSha256,
    instrumented: identity.instrumented.sourceManifestSha256,
    head: identity.repositoryHead
  })
);
