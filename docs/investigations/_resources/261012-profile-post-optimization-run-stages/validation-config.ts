/** Copy current verification policy unchanged except target matching and cache IO. */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const artifactRoot = fileURLToPath(new URL("./", import.meta.url));
function isRecord(candidate: unknown): candidate is Record<string, unknown> {
  return candidate !== null && typeof candidate === "object" && !Array.isArray(candidate);
}
const parsed: unknown = JSON.parse(readFileSync("/workspace/vibe-check/.oxlintrc.json", "utf8"));
if (!isRecord(parsed) || !Array.isArray(parsed.overrides))
  throw new Error("Invalid current lint config");
const overrides: readonly unknown[] = parsed.overrides;
let implementationMatches = 0;
const mappedOverrides = overrides.map((override) => {
  if (!isRecord(override)) throw new Error("Invalid lint override");
  if (JSON.stringify(override.files) !== JSON.stringify(["src/**/*.ts", "scripts/**/*.ts"]))
    return override;
  implementationMatches += 1;
  return { ...override, files: ["*.ts", "instrumented/src/**/*.ts"] };
});
if (implementationMatches !== 2) throw new Error("Current implementation override shape changed");
writeFileSync(
  resolve(artifactRoot, "lint.json"),
  JSON.stringify({ ...parsed, overrides: mappedOverrides }, null, 2) + "\n"
);
writeFileSync(
  resolve(artifactRoot, "tsconfig.json"),
  JSON.stringify(
    {
      extends: "/workspace/vibe-check/tsconfig.json",
      compilerOptions: {
        incremental: false,
        typeRoots: ["/workspace/vibe-check/node_modules/@types"]
      },
      include: [
        "./*.ts",
        "./instrumented/src/project-run/check-execution/plan.ts",
        "./instrumented/src/project-run/task-scheduler/graph.ts",
        "./instrumented/src/project-run/task-scheduler/scheduler.ts"
      ],
      exclude: []
    },
    null,
    2
  ) + "\n"
);
console.log(
  JSON.stringify({
    implementationMatches,
    policyDifference:
      "Only implementation override file patterns; all rules/options/plugins unchanged"
  })
);
