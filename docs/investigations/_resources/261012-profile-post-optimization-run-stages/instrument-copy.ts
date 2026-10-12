/** Reproducible observational-only edits. Never point --copy-root at the repository. */
import { readFileSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const artifactRoot = fileURLToPath(new URL("./", import.meta.url));
const copyRoot = resolve(artifactRoot, "instrumented");
if (!copyRoot.startsWith("/tmp/vibe-check-r04-profile-")) {
  throw new Error("Instrumentation requires an owned profiling root outside the repository");
}
function replaceOnce(source: string, before: string, after: string): string {
  if (source.split(before).length !== 2)
    throw new Error(`Expected one exact source anchor: ${before}`);
  return source.replace(before, after);
}
function modify(relativePath: string, edit: (source: string) => string): void {
  const path = resolve(copyRoot, relativePath);
  const original = readFileSync(path, "utf8");
  writeFileSync(path, edit(original));
}
function observationImport(relativePath: string, names: string): string {
  const directory = resolve(copyRoot, relativePath, "..");
  const path = relative(directory, resolve(artifactRoot, "profiling-observer.ts"));
  return `import { ${names} } from "${path}";\n`;
}
const planPath = "src/project-run/check-execution/plan.ts";
modify(planPath, (original) => {
  let source = observationImport(planPath, "observePlan") + original;
  source = replaceOnce(
    source,
    "): TaskGraph {\n",
    "): TaskGraph {\n  const profilingStartedAt = performance.now();\n"
  );
  source = replaceOnce(
    source,
    "  return Object.freeze({\n    resourceCapacities,",
    "  const profilingGraph = Object.freeze({\n    resourceCapacities,"
  );
  return replaceOnce(
    source,
    "    scopes: Object.freeze(scopes)\n  });\n}",
    "    scopes: Object.freeze(scopes)\n  });\n  observePlan(profilingStartedAt, performance.now());\n  return profilingGraph;\n}"
  );
});
const graphPath = "src/project-run/task-scheduler/graph.ts";
modify(graphPath, (original) => {
  let source = observationImport(graphPath, "observePrepare") + original;
  source = replaceOnce(
    source,
    "): PlannedTaskGraph {\n",
    "): PlannedTaskGraph {\n  const profilingStartedAt = performance.now();\n"
  );
  source = replaceOnce(
    source,
    "  validatePreparedTaskGraph({",
    "  const profilingNormalizedAt = performance.now();\n  validatePreparedTaskGraph({"
  );
  source = replaceOnce(
    source,
    "  return Object.freeze({\n    resourceCapacities,\n    schedulerGraphSnapshot:",
    "  const profilingValidatedAt = performance.now();\n  const profilingGraph = Object.freeze({\n    resourceCapacities,\n    schedulerGraphSnapshot:"
  );
  return replaceOnce(
    source,
    "    scopes: Object.freeze(scopes)\n  });\n}",
    "    scopes: Object.freeze(scopes)\n  });\n  observePrepare(profilingStartedAt, profilingNormalizedAt, profilingValidatedAt, performance.now());\n  return profilingGraph;\n}"
  );
});
const schedulerPath = "src/project-run/task-scheduler/scheduler.ts";
modify(schedulerPath, (original) => {
  let source =
    observationImport(schedulerPath, "observeSchedulerStateSetup, observeSchedulerLoop") + original;
  source = replaceOnce(
    source,
    "  const state = createSchedulerState(graph, options);",
    "  const profilingSetupStartedAt = performance.now();\n  const state = createSchedulerState(graph, options);\n  observeSchedulerStateSetup(profilingSetupStartedAt, performance.now());"
  );
  source = replaceOnce(
    source,
    "  while (true) {",
    "  const profilingLoopStartedAt = performance.now();\n  while (true) {"
  );
  return replaceOnce(
    source,
    "        if (diagnostics === undefined) return buildTaskGraphRun(state);",
    "        if (diagnostics === undefined) {\n          const profilingRun = buildTaskGraphRun(state);\n          observeSchedulerLoop(profilingLoopStartedAt, performance.now());\n          return profilingRun;\n        }"
  );
});
console.log(JSON.stringify({ copyRoot, editedPaths: [planPath, graphPath, schedulerPath] }));
