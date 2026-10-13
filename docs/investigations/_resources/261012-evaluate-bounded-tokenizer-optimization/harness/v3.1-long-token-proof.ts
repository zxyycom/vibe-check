import type { TokenMatch } from "../../../../../src/package-checks/function-metrics/analyzer/shared/code-reader.ts";
import { strict as assert } from "node:assert";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
if (process.argv.length !== 2)
  throw new Error("arguments: this fixed-input historical helper accepts none");

const w = "/workspace/vibe-check/tmp/optimization-20261012/tokenizer";
const digest = (x: unknown) => createHash("sha256").update(JSON.stringify(x)).digest("hex");
const load = async (
  v: string
): Promise<{
  ts: typeof import("../../../../../src/package-checks/function-metrics/analyzer/readers/typescript.ts");
  c: typeof import("../../../../../src/package-checks/function-metrics/analyzer/shared/clike.ts");
  adapter: typeof import("../../../../../src/package-checks/function-metrics/analyzer-adapter.ts");
}> => ({
  ts: await import(`${w}/${v}/src/package-checks/function-metrics/analyzer/readers/typescript.ts`),
  c: await import(`${w}/${v}/src/package-checks/function-metrics/analyzer/shared/clike.ts`),
  adapter: await import(`${w}/${v}/src/package-checks/function-metrics/analyzer-adapter.ts`)
});
const before = await load("baseline"),
  after = await load("candidate-v3.1");
const rows = [];
for (const kind of ["template", "comment"])
  for (const hasPrefix of [false, true]) {
    const prefix = hasPrefix
      ? "/* ordinary */\nconst x = `closed ${value}`;\nfunction f(){ return 1; }\n"
      : "";
    const source = prefix + (kind === "comment" ? "/* ".repeat(16000) : "`" + "${x}".repeat(24));
    const path = kind === "comment" ? "input.c" : "input.ts";
    const label = `${kind}-${Number(hasPrefix)}`;
    const file = `${w}/supported-node-${label}-full.json`;
    const lineStarts = [0];
    for (const m of source.matchAll(/\n/g)) lineStarts.push(m.index + 1);
    const lineAt = (offset: number) => {
      let lo = 0,
        hi = lineStarts.length;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (lineStarts[mid]! <= offset) lo = mid + 1;
        else hi = mid;
      }
      return lo;
    };
    const capture = (module: Awaited<ReturnType<typeof load>>) => {
      const raw: [text: string, offset: number, line: number][] = [];
      const reader = kind === "comment" ? module.c.CLikeReader : module.ts.TypeScriptReader;
      const tokens = [
        ...reader.generateTokens(source, "", (m: TokenMatch) => {
          raw.push([m.text, m.startOffset, lineAt(m.startOffset)]);
          return m.text;
        })
      ];
      const adapter = module.adapter.analyzeFunctionMetricsSources({ files: [{ path, source }] });
      return { source, path, raw, tokens, adapter };
    };
    const baseline = capture(before),
      candidate = capture(after);
    const supported: unknown = process.versions.bun ? readEvidenceJson(file) : baseline;
    assert.deepEqual(candidate, supported, `${label}: candidate vs supported Node full facts`);
    if (!process.versions.bun) {
      assert.deepEqual(candidate, baseline, `${label}: Node before/after`);
      writeFileSync(file, JSON.stringify(baseline) + "\n");
    }
    const beforeEqualsSupported = JSON.stringify(baseline) === JSON.stringify(supported);
    rows.push({
      label,
      bytes: Buffer.byteLength(source),
      sourceSha256: createHash("sha256").update(source).digest("hex"),
      baseline: {
        rawMatches: baseline.raw.length,
        tokens: baseline.tokens.length,
        rawDigest: digest(baseline.raw),
        tokenDigest: digest(baseline.tokens),
        adapter: baseline.adapter
      },
      candidate: {
        rawMatches: candidate.raw.length,
        tokens: candidate.tokens.length,
        rawDigest: digest(candidate.raw),
        tokenDigest: digest(candidate.tokens),
        adapter: candidate.adapter
      },
      candidateEqualsSupportedNode: true,
      beforeEqualsSupportedNode: beforeEqualsSupported,
      baselineUnequalRaw: beforeEqualsSupported ? undefined : baseline.raw,
      baselineUnequalFinal: beforeEqualsSupported ? undefined : baseline.tokens
    });
  }
writeFileSync(
  w + `/v3.1-long-token-${process.versions.bun ? "bun" : "node"}.json`,
  JSON.stringify(
    {
      runtime: process.versions,
      candidate: "candidate-v3.1",
      baseline: "baseline",
      rows,
      note: "Complete raw tuples [text, UTF16 offset, LF line], full reader final stream and entire adapter result deep-equal before serializing summaries. Node full baseline separately saved. Bun before differences preserved, reason unknown."
    },
    null,
    2
  ) + "\n"
);
console.log(
  JSON.stringify({
    runtime: process.versions.bun ? "bun" : "node",
    rows: rows.map((r) => ({
      label: r.label,
      candidateEqualsSupportedNode: r.candidateEqualsSupportedNode,
      beforeEqualsSupportedNode: r.beforeEqualsSupportedNode,
      beforeTokens: r.baseline.tokens,
      afterTokens: r.candidate.tokens
    }))
  })
);

function readEvidenceJson(sourcePath: string): unknown {
  try {
    return JSON.parse(readFileSync(sourcePath, "utf8"));
  } catch (error: unknown) {
    throw new Error(`Cannot read evidence JSON ${sourcePath}`, { cause: error });
  }
}
