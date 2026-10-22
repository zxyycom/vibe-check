// Change-local inspection; retain with this Change's evidence until closeout.
// This is not Gate registration or selection authority. Reruns replace import-audit.json.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { analyzeModuleSpecifiers } from "../../scripts/validation/module-specifier-analysis.ts";
import { resolveProjectGateTestLanes } from "../../scripts/project/gate/checks/test-execution/lanes.ts";

const repositoryRoot = process.cwd();
const lanes = resolveProjectGateTestLanes(repositoryRoot);
const closures = {};
const moduleAnalyses = new Map();

for (const [lane, testPaths] of Object.entries(lanes)) {
  const isInspectedLane = lane.startsWith("scripts") || lane === "packageSupporting";
  if (!isInspectedLane) continue;

  const dependencyPaths = new Set();
  const pendingPaths = testPaths.map((path) => resolve(repositoryRoot, path));
  while (pendingPaths.length > 0) {
    const modulePath = pendingPaths.pop();
    const isAlreadyVisited = dependencyPaths.has(modulePath);
    const isRepositoryModule = modulePath.startsWith(repositoryRoot + "/");
    const isInstalledDependency = modulePath.includes("/node_modules/");
    if (isAlreadyVisited || !isRepositoryModule || isInstalledDependency) continue;

    dependencyPaths.add(modulePath);
    if (!/\.(?:[cm]?[jt]s|tsx)$/.test(modulePath)) continue;

    let analysis = moduleAnalyses.get(modulePath);
    if (!analysis) {
      analysis = analyzeModuleSpecifiers(
        readFileSync(modulePath, "utf8"),
        relative(repositoryRoot, modulePath)
      );
      moduleAnalyses.set(modulePath, analysis);
    }
    if (analysis.diagnostics.length > 0) {
      throw new Error(analysis.diagnostics.join("\n"));
    }
    for (const specifier of analysis.moduleSpecifiers) {
      if (!specifier.startsWith(".")) continue;
      pendingPaths.push(Bun.resolveSync(specifier, dirname(modulePath)));
    }
  }
  closures[lane] = [...dependencyPaths].map((path) => relative(repositoryRoot, path)).sort();
}

const scriptDependencyPaths = [...new Set(Object.values(closures).flat())].filter((path) =>
  path.startsWith("scripts/")
);
const reads = [];
for (const path of scriptDependencyPaths) {
  const sourceLines = readFileSync(path, "utf8").split("\n");
  for (const [lineIndex, sourceLine] of sourceLines.entries()) {
    const hasPotentialRuntimeInput =
      /(?:readFile|readdir|Glob\b|collectProjectFiles|resolveBunTestFiles|src\/|spawnSync|Bun.spawn)/.test(
        sourceLine
      );
    if (hasPotentialRuntimeInput) {
      reads.push({ path, line: lineIndex + 1, text: sourceLine.trim() });
    }
  }
}

writeFileSync(
  new URL("./import-audit.json", import.meta.url),
  JSON.stringify(
    {
      formedAt: new Date().toISOString(),
      note: "Conservative relative static + literal dynamic import closure, including type imports and lazy branches. Bare imports and runtime-generated child/FS inputs require separate manual audit.",
      closures,
      reads
    },
    null,
    2
  ) + "\n"
);
for (const [lane, paths] of Object.entries(closures)) {
  console.log(
    JSON.stringify({
      lane,
      modules: paths.length,
      productTestImports: paths.filter(
        (path) => path.startsWith("src/") && path.endsWith(".test.ts")
      )
    })
  );
}
