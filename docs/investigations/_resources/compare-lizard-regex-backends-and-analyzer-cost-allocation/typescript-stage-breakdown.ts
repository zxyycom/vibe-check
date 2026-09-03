import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { analyzeLizardSource } from "../../../../src/package-checks/function-metrics/analyzer/port-facade.ts";
import {
  analyzeSourceCode,
  type FileInformation
} from "../../../../src/package-checks/function-metrics/analyzer/core.ts";
import { TypeScriptReader } from "../../../../src/package-checks/function-metrics/analyzer/readers/typescript.ts";

type Input = { path: string; source: string };
type Req = { files: Input[] };
type M = {
  ccn: number | null;
  endLine: number;
  file: string;
  name: string;
  nloc: number;
  parameterCount: number;
  startLine: number;
};
const requestPath = process.argv[2];
if (requestPath === undefined)
  throw new Error("usage: bun typescript-stage-breakdown.ts <request.json>");
const req = JSON.parse(readFileSync(requestPath, "utf8")) as Req;
const METRIC = "29ff7a0e1535889e4055dd04989e70c6f925d08d745509b24f202744d5735ec6";
function metric(x: any, file: string): M {
  return {
    ccn: x.cyclomatic_complexity,
    endLine: x.end_line,
    file,
    name: x.name,
    nloc: x.nloc,
    parameterCount: x.parameter_count,
    startLine: x.start_line
  };
}
function canon(ms: M[]) {
  return [...ms].sort(
    (a, b) =>
      a.file.localeCompare(b.file) ||
      a.startLine - b.startLine ||
      a.endLine - b.endLine ||
      a.name.localeCompare(b.name) ||
      a.nloc - b.nloc ||
      (a.ccn ?? -1) - (b.ccn ?? -1) ||
      a.parameterCount - b.parameterCount
  );
}
function mdig(ms: M[]) {
  return createHash("sha256")
    .update(JSON.stringify(canon(ms)))
    .digest("hex");
}
function assertMetrics(ms: M[]) {
  const d = mdig(ms);
  if (ms.length !== 2222 || d !== METRIC) throw new Error(`metric drift ${ms.length} ${d}`);
}
function normal() {
  const out: M[] = [];
  for (const f of req.files) {
    const r = analyzeLizardSource({ filename: f.path, sourceCode: f.source });
    if (!r) throw Error(f.path);
    for (const x of r.function_list) out.push(metric(x, f.path));
  }
  assertMetrics(out);
  return out;
}
function direct() {
  const out: M[] = [];
  for (const f of req.files) {
    const r = analyzeSourceCode(f.path, f.source, TypeScriptReader);
    for (const x of r.function_list) out.push(metric(x, f.path));
  }
  assertMetrics(out);
  return out;
}
function infos() {
  return req.files.map((f) => analyzeSourceCode(f.path, f.source, TypeScriptReader));
}
function project(v: FileInformation[]) {
  const out: M[] = [];
  for (let i = 0; i < v.length; i++)
    for (const x of v[i]!.function_list) out.push(metric(x, req.files[i]!.path));
  assertMetrics(out);
  return out;
}
function raw() {
  const h = createHash("sha256");
  let count = 0,
    chars = 0;
  for (const f of req.files)
    for (const t of TypeScriptReader.generateTokens(f.source)) {
      h.update(t);
      h.update("\0");
      count++;
      chars += t.length;
    }
  return { digest: h.digest("hex"), count, chars };
}
function q(a: number[], p: number) {
  const s = [...a].sort((x, y) => x - y),
    x = (s.length - 1) * p,
    i = Math.floor(x),
    j = Math.ceil(x);
  return s[i]! * (j - x) + s[j]! * (x - i);
}
function sm(a: number[]) {
  return {
    n: a.length,
    medianMs: q(a, 0.5),
    p10Ms: q(a, 0.1),
    p90Ms: q(a, 0.9),
    minMs: Math.min(...a),
    maxMs: Math.max(...a)
  };
}
function once<T>(fn: () => T) {
  const t = performance.now(),
    v = fn();
  return { ms: performance.now() - t, v };
}
const baselineNormal = normal(),
  baselineDirect = direct(),
  cachedInfos = infos(),
  baselineRaw = raw();
project(cachedInfos);
if (mdig(baselineNormal) !== mdig(baselineDirect)) throw Error("normal/direct mismatch");
// All modes warm once. 15 deterministic 4-operation ABBA/BAAB blocks per pair.
for (const f of [normal, direct, raw, () => project(cachedInfos)]) f();
const rows: any[] = [];
for (let block = 1; block <= 15; block++) {
  const orders =
    block % 2
      ? ([
          ["normal", normal],
          ["direct", direct],
          ["direct", direct],
          ["normal", normal]
        ] as const)
      : ([
          ["direct", direct],
          ["normal", normal],
          ["normal", normal],
          ["direct", direct]
        ] as const);
  for (const [label, fn] of orders) {
    const x = once(fn);
    rows.push({ group: "normal-v-direct", block, label, ms: x.ms });
  }
  const tokOrder =
    block % 2
      ? ([
          ["raw", raw],
          ["project", () => project(cachedInfos)],
          ["project", () => project(cachedInfos)],
          ["raw", raw]
        ] as const)
      : ([
          ["project", () => project(cachedInfos)],
          ["raw", raw],
          ["raw", raw],
          ["project", () => project(cachedInfos)]
        ] as const);
  for (const [label, fn] of tokOrder) {
    const x = once(fn);
    const val = x.v as any;
    if (label === "raw" && (val.digest !== baselineRaw.digest || val.count !== baselineRaw.count))
      throw Error("token drift");
    rows.push({ group: "raw-v-project", block, label, ms: x.ms });
  }
}
const by = (label: string) => rows.filter((x) => x.label === label).map((x) => x.ms);
const blocks = [];
for (let b = 1; b <= 15; b++) {
  const ns = rows
      .filter((x) => x.group === "normal-v-direct" && x.block === b && x.label === "normal")
      .map((x) => x.ms),
    ds = rows
      .filter((x) => x.group === "normal-v-direct" && x.block === b && x.label === "direct")
      .map((x) => x.ms);
  blocks.push({
    block: b,
    normalGeomeanMs: Math.sqrt(ns[0] * ns[1]),
    directGeomeanMs: Math.sqrt(ds[0] * ds[1]),
    directDivNormal: Math.sqrt(ds[0] * ds[1]) / Math.sqrt(ns[0] * ns[1])
  });
}
console.log(
  JSON.stringify({
    runtime: { bun: Bun.version },
    corpus: {
      files: req.files.length,
      bytes: req.files.reduce((n, x) => n + Buffer.byteLength(x.source), 0)
    },
    metricGuard: { count: 2222, digest: METRIC },
    tokenGuard: baselineRaw,
    statistics: {
      normalFullAndProjection: sm(by("normal")),
      directCoreAndProjection: sm(by("direct")),
      rawTypeScriptTokenGeneration: sm(by("raw")),
      projectionFromCachedFullInfos: sm(by("project"))
    },
    pairedNormalDirect: blocks,
    rawRows: rows.filter((x) => x.group === "raw-v-project"),
    normalDirectRows: rows.filter((x) => x.group === "normal-v-direct")
  })
);
