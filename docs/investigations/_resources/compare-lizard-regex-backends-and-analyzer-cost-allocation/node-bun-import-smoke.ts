import { analyzePortForPerformanceBenchmark } from "../../../../src/package-checks/function-metrics/analyzer/performance-harness.test-support.ts";
import { TypeScriptReader } from "../../../../src/package-checks/function-metrics/analyzer/readers/typescript.ts";
void analyzePortForPerformanceBenchmark;
void TypeScriptReader;
const bun = typeof Bun === "undefined" ? undefined : Bun.version;
console.log(
  JSON.stringify(
    bun === undefined
      ? { engine: "v8", node: process.version, v8: process.versions.v8 }
      : { engine: "jsc", bun, nodeCompatibility: process.version }
  )
);
