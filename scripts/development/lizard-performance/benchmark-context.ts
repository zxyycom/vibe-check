import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const benchmarkRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
export const benchmarkScriptRoot = resolve(dirname(fileURLToPath(import.meta.url)));
export const manifestPath = resolve(benchmarkScriptRoot, "workload-manifest.json");
export const supervisorPath = resolve(benchmarkScriptRoot, "supervisor.py");
export const pythonDriverPath = resolve(benchmarkScriptRoot, "python-driver.py");
export const portHarnessPath = resolve(
  benchmarkRoot,
  "src/package-checks/function-metrics/analyzer/performance-harness.test-support.ts"
);
export const publicProductDriverPath = resolve(benchmarkScriptRoot, "public-product-driver.ts");
export const currentHarnessPath = resolve(
  benchmarkRoot,
  "src/package-checks/function-metrics/measurement-performance-harness.test-support.ts"
);
export const historicalParent = "853b30eaaa1a0545edf24b3622a5245d16c94a63";
export const fixedLizard124Commit = "308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec";

/** Every executable protocol input covered by the driver identity digest. */
export const driverSnapshotPaths = Object.freeze([
  resolve(benchmarkScriptRoot, "analyzer-only.ts"),
  resolve(benchmarkScriptRoot, "arguments.ts"),
  resolve(benchmarkScriptRoot, "benchmark-context.ts"),
  resolve(benchmarkScriptRoot, "benchmark-identity.ts"),
  resolve(benchmarkScriptRoot, "canonical.ts"),
  resolve(benchmarkScriptRoot, "command.ts"),
  resolve(benchmarkScriptRoot, "comparison.ts"),
  resolve(benchmarkScriptRoot, "contract.ts"),
  resolve(benchmarkScriptRoot, "current-decomposition.ts"),
  resolve(benchmarkScriptRoot, "evidence-shapes.ts"),
  resolve(benchmarkScriptRoot, "fixed-lizard124.ts"),
  resolve(benchmarkScriptRoot, "historical-product.ts"),
  resolve(benchmarkScriptRoot, "sampling.ts"),
  resolve(benchmarkScriptRoot, "target-evidence.ts"),
  resolve(benchmarkScriptRoot, "workload.ts"),
  currentHarnessPath,
  resolve(
    benchmarkRoot,
    "src/package-checks/function-metrics/measurement-performance-worker.test-support.ts"
  ),
  portHarnessPath,
  publicProductDriverPath,
  pythonDriverPath,
  resolve(benchmarkScriptRoot, "statistics.ts"),
  supervisorPath,
  resolve(benchmarkScriptRoot, "supervisor-parent-child.py")
]);
