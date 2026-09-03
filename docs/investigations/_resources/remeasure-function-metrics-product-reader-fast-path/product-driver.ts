import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

interface Request { readonly corpusRoot: string; readonly moduleRoot: string; readonly paths: readonly string[]; readonly warmup: boolean; }
const request = parse(process.argv.slice(2));
const api = await import(pathToFileURL(`${request.moduleRoot}/src/index.ts`).href) as typeof import("/home/dev/.codex/worktrees/d20e/vibe-check/src/index.ts");
if (request.warmup) await runProduct();
const started = performance.now();
const snapshot = await runProduct();
console.log(JSON.stringify({
  condition: request.moduleRoot,
  operationWallMs: performance.now() - started,
  snapshotDigest: digest(snapshot),
  summary: snapshotSummary(snapshot)
}));
async function runProduct(): Promise<unknown> {
  const check = api.functionMetrics({
    codeAreas: { benchmark: { files: { include: request.paths }, limits: { codeLines: { lowComplexityAllowance: { cyclomaticComplexityBelow: 6, maximum: 1 }, maximum: 1 }, cyclomaticComplexity: { maximum: 1 }, parameters: { maximum: 1 } } } },
    findingPolicy: "non-blocking"
  });
  const result = await api.run(api.defineConfig({ checks: [check], outputs: { diagnosticLogging: { enabled: false }, machinePublication: { enabled: false }, progressRendering: { enabled: false } } }), { projectRoot: request.corpusRoot });
  if (result.kind !== "completed") throw new Error(`Product run did not complete: ${result.kind}`);
  return result.snapshot;
}
function digest(value: unknown): string { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
function snapshotSummary(snapshot: unknown): object {
  if (typeof snapshot !== "object" || snapshot === null) return { kind: typeof snapshot };
  const record = snapshot as Record<string, unknown>;
  return {
    topLevelKeys: Object.keys(record).sort(),
    checkCount: Array.isArray(record.checks) ? record.checks.length : null,
    recordCount: Array.isArray(record.records) ? record.records.length : null
  };
}
function parse(args: readonly string[]): Request {
  const get=(flag:string): string => { const i=args.indexOf(flag); const v=i < 0 ? undefined : args[i+1]; if (!v) throw new Error(`missing ${flag}`); return v; };
  return Object.freeze({ corpusRoot:get("--corpus-root"), moduleRoot:get("--module-root"), paths: JSON.parse(readFileSync(get("--paths"),"utf8")) as string[], warmup: args.includes("--warmup") });
}
