import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import type {
  TokenFactory,
  TokenMatch
} from "../../../../../src/package-checks/function-metrics/analyzer/shared/code-reader.ts";

type SharedSnapshot =
  typeof import("../../../../../src/package-checks/function-metrics/analyzer/shared/code-reader.ts");
type SnapshotReader = Readonly<{
  name: string;
  generateTokens: SharedSnapshot["CodeReader"]["generateTokens"];
}>;
type RegistrySnapshot = Readonly<{
  languages(): readonly SnapshotReader[];
  get_reader_for(filename: string): SnapshotReader;
}>;
type CorpusManifestEntry = Readonly<{ path: string; bytes: number; sha256: string }>;
type SelectedExtensionObservations = Readonly<{
  fixtures: readonly Readonly<{ fixture: string; readerClass: string; sourceSha256: string }>[];
}>;

const argv = process.argv.slice(2);
if (
  argv.length > 2 ||
  argv.some((argument) => argument !== "--smoke" && argument !== "--corpus") ||
  new Set(argv).size !== argv.length
) {
  throw new Error("arguments: only --smoke and --corpus are accepted, each at most once");
}

const root = "/workspace/vibe-check";
const work = `${root}/tmp/optimization-20261012/tokenizer`;
const owner = "src/package-checks/function-metrics/analyzer";
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
async function modules(base: string) {
  const load = (file: string) => import(pathToFileURL(`${base}/${file}`).href);
  const shared: SharedSnapshot = await load(`${owner}/shared/code-reader.ts`);
  const registry: RegistrySnapshot = await load(`${owner}/reader-registry.ts`);
  const adapter: typeof import("../../../../../src/package-checks/function-metrics/analyzer-adapter.ts") =
    await load("src/package-checks/function-metrics/analyzer-adapter.ts");
  let raw: unknown[] = [];
  const original = shared.CodeReader.generateTokens;
  shared.CodeReader.generateTokens = function (
    source: string,
    addition: string,
    factory?: TokenFactory,
    template?: string
  ) {
    const lineStarts = [0];
    for (const match of source.matchAll(/\n/g)) lineStarts.push(match.index + 1);
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
    return original.call(
      this,
      source,
      addition,
      (match: TokenMatch) => {
        raw.push({
          text: match.text,
          startOffset: match.startOffset,
          line: lineAt(match.startOffset)
        });
        return factory ? factory(match) : match.text;
      },
      template
    );
  };
  return {
    shared,
    registry,
    adapter,
    stream(reader: SnapshotReader, source: string) {
      raw = [];
      const tokens = [...reader.generateTokens(source)];
      return { raw, tokens };
    }
  };
}
const before = await modules(`${work}/baseline`);
const after = await modules(`${work}/candidate-v3.1`);
const rows: unknown[] = [];
function check(label: string, readerName: string, source: string, filename?: string) {
  const a = before.registry
    .languages()
    .find((reader: SnapshotReader) => reader.name === readerName);
  const b = after.registry.languages().find((reader: SnapshotReader) => reader.name === readerName);
  assert.ok(a && b, readerName);
  const baseline = before.stream(a, source);
  const candidate = after.stream(b, source);
  assert.deepEqual(candidate, baseline, label);
  if (filename) {
    assert.deepEqual(
      after.adapter.analyzeFunctionMetricsSources({ files: [{ path: filename, source }] }),
      before.adapter.analyzeFunctionMetricsSources({ files: [{ path: filename, source }] }),
      `${label}: complete adapter`
    );
  }
  rows.push({
    label,
    readerName,
    bytes: Buffer.byteLength(source),
    rawMatches: baseline.raw.length,
    tokens: baseline.tokens.length,
    rawDigest: digest(baseline.raw),
    tokenDigest: digest(baseline.tokens)
  });
}
const smoke = argv.includes("--smoke");
const prefixes = ["", "/* ordinary */\nconst x = `closed ${value}`;\nfunction f(){ return 1; }\n"];
for (const [prefixIndex, prefix] of prefixes.entries()) {
  for (const n of smoke ? [2] : [0, 1, 2, 4, 8, 12, 16]) {
    for (const [reader, file] of [
      ["TypeScriptReader", "input.ts"],
      ["TSXReader", "input.tsx"]
    ] as const)
      check(`template-${prefixIndex}-${n}`, reader, prefix + "`" + "${x}".repeat(n), file);
  }
  for (const n of smoke ? [2] : [0, 1, 2, 8, 64, 256])
    check(`comment-${prefixIndex}-${n}`, "CLikeReader", prefix + "/* ".repeat(n), "input.c");
}
const edges = [
  "`ok`",
  "`a ${x} b`",
  '`a ${"tick`here"} b`',
  "`a ${'tick`here'} b`",
  "`a \\` b`",
  "`a ${x}",
  '`a ${"unterminated}',
  "`\\\n${x}",
  "\u{1f600}`${x}",
  "/*/",
  "/**/",
  "/* a /* b */ tail /*",
  "/* a\n*/ /* /*",
  "#define X \\\n/* ordinary */\n/* /*",
  "\u001c \r\n/* /*",
  "const a = `x`;\nconst b = `${x}",
  "const a = `x`;\nconst b = `\\`",
  "/* closed */ \t \r\n/* /* /* ",
  "`closed` \t \r\n`${x}${x}${x}",
  "/* closed */ \t\u001c /* /* ",
  "`closed` \t\u001c `${x}${x}",
  "\"/*\" '*/' /* tail",
  "\ud800/* /*",
  "\udc00`a",
  "`a`/* tail"
];
for (const [i, source] of edges.entries())
  for (const reader of ["CLikeReader", "TypeScriptReader", "TSXReader"])
    check(`edge-${reader}-${i}`, reader, source);
// Raw zero-width and custom-factory semantics are checked directly, not inferred from metrics.
for (const source of ["\u{1f600}/* ", "\ud800x", "\r\n#x\n", ""]) {
  for (const addition of ["|(?=.)", "|(?=\u{1f600})", "|(?=$)", "|(?i)(?=x)"]) {
    const capture = (shared: SharedSnapshot) => {
      const matches: unknown[] = [];
      const iterator = shared.CodeReader.generateTokens(source, addition, (match: TokenMatch) => {
        matches.push({ text: match.group(0), offset: match.start() });
        return match.text;
      });
      return { matches, tokens: [...iterator] };
    };
    assert.deepEqual(capture(after.shared), capture(before.shared), "zero-width/UTF16/factory");
  }
}
if (!smoke) {
  const evidence = `${root}/${owner}/fixtures/lizard-1.24.1/evidence`;
  const oracle = readSelectedObservations(
    `${evidence}/lizard-1.24-selected-extension-observations.json`
  );
  for (const fixture of oracle.fixtures) {
    const source = readFileSync(resolve(root, fixture.fixture), "utf8");
    assert.equal(createHash("sha256").update(source).digest("hex"), fixture.sourceSha256);
    check(fixture.fixture, fixture.readerClass, source, fixture.fixture);
  }
  if (argv.includes("--corpus")) {
    const manifest = readCorpusManifest(`${work}/corpus-manifest.json`);
    for (const file of manifest) {
      const source = readFileSync(`${work}/frozen-input/${file.path}`, "utf8");
      assert.equal(createHash("sha256").update(source).digest("hex"), file.sha256);
      const reader = before.registry.get_reader_for(file.path);
      check(file.path, reader.name, source, file.path);
    }
  }
}
const output = {
  runtime: process.versions,
  mode: smoke ? "smoke" : "synthetic+110-current-oracle-fixtures",
  limits: { syntheticTemplateN: smoke ? 2 : 16, syntheticCommentN: smoke ? 2 : 256 },
  sourceRoot: root,
  candidateRoot: `${work}/candidate-v3.1`,
  rows,
  zeroWidthMatrices: 16,
  note: "raw factory events include source-relative UTF16 offset and LF source line; final transformed token stream separately compared; upstream oracle JSON unchanged"
};
const target = `${work}/differential-v3.1-${process.versions.bun ? "bun" : "node"}${smoke ? "-smoke" : ""}.json`;
writeFileSync(target, JSON.stringify(output, null, 2) + "\n");
console.log(JSON.stringify({ target, rows: rows.length, result: "equal" }));

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

function readSelectedObservations(sourcePath: string): SelectedExtensionObservations {
  const decoded = readEvidenceJson(sourcePath);
  if (
    typeof decoded !== "object" ||
    decoded === null ||
    !("fixtures" in decoded) ||
    !Array.isArray(decoded.fixtures)
  ) {
    throw new Error(`${sourcePath}: expected fixtures array`);
  }
  const fixtures = decoded.fixtures.map((entry: unknown, index: number) => {
    if (
      typeof entry !== "object" ||
      entry === null ||
      Array.isArray(entry) ||
      !("fixture" in entry) ||
      !("readerClass" in entry) ||
      !("sourceSha256" in entry)
    ) {
      throw new Error(
        `${sourcePath}.fixtures[${index}]: expected fixture/readerClass/sourceSha256 entry`
      );
    }
    if (
      typeof entry.fixture !== "string" ||
      !entry.fixture ||
      entry.fixture.startsWith("/") ||
      entry.fixture.includes("\\") ||
      entry.fixture.split("/").some((part) => !part || part === "." || part === "..")
    ) {
      throw new Error(`${sourcePath}.fixtures[${index}].fixture: expected relative contained path`);
    }
    if (typeof entry.readerClass !== "string" || !entry.readerClass) {
      throw new Error(`${sourcePath}.fixtures[${index}].readerClass: expected reader name`);
    }
    if (typeof entry.sourceSha256 !== "string" || !/^[a-f0-9]{64}$/.test(entry.sourceSha256)) {
      throw new Error(`${sourcePath}.fixtures[${index}].sourceSha256: expected SHA-256`);
    }
    return {
      fixture: entry.fixture,
      readerClass: entry.readerClass,
      sourceSha256: entry.sourceSha256
    };
  });
  return { fixtures };
}
