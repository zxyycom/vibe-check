import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const out = resolve(root, "tmp/scheduler-shared-condition-implementation");
const baseline = resolve(out, "baseline");
await mkdir(baseline, { recursive: true });
// Only the committed Product tree is extracted. No worktree, branch, index or production route is changed.
execFileSync("bash", ["-c", `git archive c45e549971813d7a01a89c89e75975b0530f1eb4 src | tar --exclude='*.test.ts' -x -C ${JSON.stringify(baseline)}`], { cwd: root });
const entry = (src: string) => `
export * from "${src}/project-run/task-scheduler/admission-core/core.ts";
export { staticAdmissionCandidateForCore } from "${src}/project-run/task-scheduler/admission-core/static-selection-query.ts";
export { prepareTaskGraph } from "${src}/project-run/task-scheduler/graph.ts";
export { SchedulerQueueMeasurements } from "${src}/project-run/task-scheduler/measurement/queue.ts";
export { runTaskGraph } from "${src}/project-run/task-scheduler/scheduler.ts";
export { admissionSelectionPolicyFor } from "${src}/project-run/task-scheduler/custom-admission-policy.ts";
export { defineContextCallback } from "${src}/package-tools/context-callback/define-context-callback.ts";
export { defineConfig, defineCheck, run } from "${src}/index.ts";
`;
const manifest: Record<string, unknown> = { inventoryScope: "all src files except *.test.ts, same scope for both variants", baselineExcludes: "Generated *.test.ts only; runtime source bytes and test-support unchanged; prevents Bun substring discovery collisions", baselineCommit: "c45e549971813d7a01a89c89e75975b0530f1eb4", bun: Bun.version, variants: {} };
for (const [variant, src] of [["A", resolve(baseline, "src")], ["B", resolve(root, "src")]]) {
  const path = resolve(out, `entry-${variant}.ts`);
  await writeFile(path, entry(src));
  const result = await Bun.build({ entrypoints: [path], outdir: out, naming: `${variant}.mjs`, target: "node", format: "esm", minify: false });
  if (!result.success) throw new AggregateError(result.logs, `build ${variant} failed`);
  const bundle = resolve(out, `${variant}.mjs`);
  const bytes = await readFile(bundle);
  const inventory = execFileSync("bash", ["-c", "find src -type f ! -name '*.test.ts' -print0 | sort -z | xargs -0 sha256sum"], { cwd: variant === "A" ? baseline : root, encoding: "utf8" });
  (manifest.variants as Record<string, unknown>)[variant] = { bundle, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex"), runtimeTreeDigest: createHash("sha256").update(inventory).digest("hex") };
  await writeFile(resolve(out, `source-${variant}.sha256`), inventory);
}
await writeFile(resolve(out, "build-manifest.json"), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify(manifest));
