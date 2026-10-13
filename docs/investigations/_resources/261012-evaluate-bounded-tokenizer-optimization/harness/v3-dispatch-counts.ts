import type { TokenFactory } from "../../../../../src/package-checks/function-metrics/analyzer/shared/code-reader.ts";
type CorpusManifestEntry = Readonly<{ path: string; bytes: number; sha256: string }>;
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
if (process.argv.length !== 2)
  throw new Error("arguments: this fixed-input historical helper accepts none");

const w = "/workspace/vibe-check/tmp/optimization-20261012/tokenizer";
const shared: typeof import("../../../../../src/package-checks/function-metrics/analyzer/shared/code-reader.ts") =
  await import(
    `${w}/candidate-v3/src/package-checks/function-metrics/analyzer/shared/code-reader.ts`
  );
const adapter: typeof import("../../../../../src/package-checks/function-metrics/analyzer-adapter.ts") =
  await import(`${w}/candidate-v3/src/package-checks/function-metrics/analyzer-adapter.ts`);
const counts = {
  calls: 0,
  nativeFastPath: 0,
  guarded: 0,
  commentOnly: 0,
  templateOnly: 0,
  both: 0
};
const labels: { bytes: number; sha256: string; commentRisk: boolean; templateRisk: boolean }[] = [];
const original = shared.CodeReader.generateTokens;
shared.CodeReader.generateTokens = function (
  source: string,
  addition: string,
  factory?: TokenFactory,
  template = ""
) {
  const open = source.lastIndexOf("/*"),
    close = source.lastIndexOf("*/"),
    tick = template ? source.lastIndexOf("`") : -1;
  const c = open >= 0 && open > close - 2,
    t = Boolean(template) && tick >= 0 && source.indexOf("${", tick + 1) !== -1;
  counts.calls++;
  if (c || t) {
    counts.guarded++;
    counts[c && t ? "both" : c ? "commentOnly" : "templateOnly"]++;
    labels.push({
      bytes: Buffer.byteLength(source),
      sha256: createHash("sha256").update(source).digest("hex"),
      commentRisk: c,
      templateRisk: t
    });
  } else counts.nativeFastPath++;
  return original.call(this, source, addition, factory, template);
};
const manifest = readCorpusManifest(w + "/corpus-manifest.json");
const files = manifest.map((f: CorpusManifestEntry) => {
  const source = readFileSync(w + "/frozen-input/" + f.path, "utf8");
  if (createHash("sha256").update(source).digest("hex") !== f.sha256) throw Error("drift");
  return { path: f.path, source };
});
const result = adapter.analyzeFunctionMetricsSources({ files });
writeFileSync(
  w + `/v3-dispatch-${process.versions.bun ? "bun" : "node"}.json`,
  JSON.stringify(
    {
      runtime: process.versions,
      files: files.length,
      counts,
      labels,
      result: result.kind,
      note: "Separate untimed diagnostic analysis; wrapper counts matching cost predicates at each shared tokenizer invocation (including nested reader calls), all inputs fully drained; no counters instrumented in timed candidate source."
    },
    null,
    2
  ) + "\n"
);
console.log(JSON.stringify({ counts, result: result.kind }));

function readEvidenceJson(sourcePath: string): unknown {
  try {
    return JSON.parse(readFileSync(sourcePath, "utf8"));
  } catch (error: unknown) {
    throw new Error(`Cannot read evidence JSON ${sourcePath}`, { cause: error });
  }
}

function readCorpusManifest(sourcePath: string): readonly CorpusManifestEntry[] {
  const decoded = readEvidenceJson(sourcePath);
  if (!Array.isArray(decoded)) throw new Error(`${sourcePath}: expected corpus array`);
  return decoded.map((entry: unknown, index: number) => {
    if (
      typeof entry !== "object" ||
      entry === null ||
      Array.isArray(entry) ||
      !("path" in entry) ||
      !("bytes" in entry) ||
      !("sha256" in entry)
    ) {
      throw new Error(`${sourcePath}[${index}]: expected path/bytes/sha256 entry`);
    }
    if (
      typeof entry.path !== "string" ||
      !entry.path ||
      entry.path.startsWith("/") ||
      entry.path.includes("\\") ||
      entry.path.split("/").some((part) => !part || part === "." || part === "..")
    ) {
      throw new Error(`${sourcePath}[${index}].path: expected relative contained path`);
    }
    if (typeof entry.bytes !== "number" || !Number.isSafeInteger(entry.bytes) || entry.bytes < 0) {
      throw new Error(`${sourcePath}[${index}].bytes: expected nonnegative safe integer`);
    }
    if (typeof entry.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(entry.sha256)) {
      throw new Error(`${sourcePath}[${index}].sha256: expected SHA-256`);
    }
    return { path: entry.path, bytes: entry.bytes, sha256: entry.sha256 };
  });
}
