/** Investigation-only bounded operation counters; no timing or benchmark claims.
 * Run from repository root: mise exec -- bun docs/investigations/_resources/261012-audit-checks-core-algorithmic-complexity/checks-probe.ts
 * Creates only one owned .tmp/checks-complexity-* directory and removes it in finally.
 * Array prototype instrumentation is scoped to this standalone process and restored.
 */
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { collectProjectFiles } from "../../../../src/package-checks/project-files/collection.ts";
import { applyDuplicateAreaPolicy } from "../../../../src/package-checks/duplicate-detection/area-policy.ts";
import { anchorResolution } from "../../../../src/package-checks/markdown-link-validation/local-resolution.ts";
import { planSccBatches } from "../../../../src/package-checks/file-metrics/scc/batch-planner.ts";
import { maintenanceReminders } from "../../../../src/package-checks/maintenance-reminders/maintenance-reminders.ts";

const tmpRoot = resolve(".tmp");
mkdirSync(tmpRoot, { recursive: true });
const owned = mkdtempSync(join(tmpRoot, "checks-complexity-"));
const originalFilter = Array.prototype.filter;
const originalSome = Array.prototype.some;
const originalReduce = Array.prototype.reduce;
let directoryComparisons = 0;
let areaComparisons = 0;
let argvVisits = 0;
// These counters select the actual production callback by its source text.
// If transpilation changes this spelling, the non-zero assertion fails rather
// than silently presenting the counter as proof.
Array.prototype.filter = function (callback, thisArg) {
  if (!callback.toString().includes("candidate.name === part")) {
    return originalFilter.call(this, callback, thisArg);
  }
  return originalFilter.call(this, (value, index, array) => {
    directoryComparisons++;
    return callback.call(thisArg, value, index, array);
  });
};
Array.prototype.some = function (callback, thisArg) {
  if (!callback.toString().includes("candidate.codeArea === policy.codeArea")) {
    return originalSome.call(this, callback, thisArg);
  }
  return originalSome.call(this, (value, index, array) => {
    areaComparisons++;
    return callback.call(thisArg, value, index, array);
  });
};
Array.prototype.reduce = function (callback, ...rest) {
  if (!callback.toString().includes("argument.length")) {
    return originalReduce.apply(this, [callback, ...rest]);
  }
  return originalReduce.apply(this, [(previous, value, index, array) => {
    argvVisits++;
    return callback(previous, value, index, array);
  }, ...rest]);
};

try {
  const observations = [];
  for (const n of [32, 64, 128]) {
    const directory = join(owned, `files-${n}`);
    mkdirSync(directory);
    const paths = Array.from({ length: n }, (_, index) => `f${index}.ts`);
    for (const path of paths) writeFileSync(join(directory, path), "");
    directoryComparisons = 0;
    const selected = collectProjectFiles(directory, { patterns: paths, useDefaultExcludes: false });
    if (directoryComparisons === 0 || selected.length !== n) throw new Error("directory counter not exercised");

    areaComparisons = 0;
    const result = applyDuplicateAreaPolicy([{
      codeAreas: [], id: 1, lineCount: 1, tokenCount: 1,
      locations: [
        { path: "a.ts", startLine: 1, endLine: 1 },
        { path: "b.ts", startLine: 1, endLine: 1 }
      ]
    }], Array.from({ length: n }, (_, index) => ({
      approvedExactPaths: ["a.ts", "b.ts"], codeArea: `area-${index}`,
      minimumLines: 1, minimumTokens: 1
    })));
    if (areaComparisons === 0 || result?.length !== 1) throw new Error("area counter not exercised");

    let slugVisits = 0;
    const headings = Array.from({ length: n }, (_, index) => ({
      get slug() { slugVisits++; return `heading-${index}`; },
      line: index + 1
    }));
    for (let query = 0; query < n; query++) anchorResolution(headings, "missing", {
      kind: "same-document", path: "a.md", fragment: "missing"
    });
    if (slugVisits !== n * n) throw new Error("anchor counter unexpected");

    argvVisits = 0;
    const plan = planSccBatches("scc", [], paths);
    if (!plan.ok || argvVisits === 0) throw new Error("argv counter not exercised");
    observations.push({ n, selectedFiles: selected.length, directoryComparisons,
      areaComparisons, slugVisits, argvVisits,
      sccBatchCount: plan.batches.length });
  }
  // A fake executable with deterministic, tiny outputs exercises the actual
  // Check execute hook, not repository Git history. All files remain owned here.
  const commits = Array.from({ length: 4 }, (_, i) => (i + 1).toString(16).padStart(40, "0"));
  const baseCommit = commits[3];
  const log = join(owned, "fake-git-calls.txt");
  const executable = join(owned, "fake-git");
  const quoted = (s: string) => `'${s.replaceAll("'", "'\\''")}'`;
  writeFileSync(executable, `#!/bin/sh\nprintf '%s\\n' "$*" >> ${quoted(log)}\ncase "$1" in\nrev-parse) case "$3" in HEAD*) printf '%s\\n' '${commits[0]}' ;; *) printf '%s\\n' '${baseCommit}' ;; esac ;;\nrev-list) printf '%s\\n' ${commits.map(quoted).join(" ")} ;;\ndiff-tree) printf '1\\t2\\tpath\\n' ;;\n*) exit 1 ;;\nesac\n`, { mode: 0o700 });
  const entries = Array.from({ length: 3 }, (_, i) => ({
    id: `review-${i}`, baseCommit, limits: { commits: 1 }, message: "Investigation fake history"
  }));
  const check = maintenanceReminders(entries);
  const maintenanceResult = await check.execute({
    options: { entries, git: { executable } }, project: { root: owned },
    signal: new AbortController().signal
  });
  const maintenanceCalls = readFileSync(log, "utf8").trim().split("\n");
  const diffCalls = maintenanceCalls.filter(line => line.startsWith("diff-tree")).length;
  if (maintenanceResult.status !== "passed" || maintenanceCalls.length !== 14 || diffCalls !== 9) {
    throw new Error("maintenance bounded process count unexpected");
  }
  console.log(JSON.stringify({ runtime: { bun: Bun.version, bunReportedNodeCompatibility: process.version },
    scope: "bounded actual callback/property visits; not timings; SCC n stays inside fixed 28000 ceiling",
    observations,
    maintenance: { reminderCount: 3, firstParentHistoryLength: 4, baseIndex: 3,
      totalProcessCalls: maintenanceCalls.length, diffTreeCalls: diffCalls,
      expectedFormula: "2 + R + sum(baseIndex_i)", calls: maintenanceCalls,
      status: maintenanceResult.status,
      note: "Fake Git, actual execute hook; no real Git history or Git writes; all reminders have commits-only limits, yet changedLines remains mandatory final-data evidence." }
  }, null, 2));
} finally {
  Array.prototype.filter = originalFilter;
  Array.prototype.some = originalSome;
  Array.prototype.reduce = originalReduce;
  rmSync(owned, { recursive: true, force: true });
}
