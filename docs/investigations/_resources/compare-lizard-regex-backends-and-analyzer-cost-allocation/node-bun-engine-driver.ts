import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { analyzePortForPerformanceBenchmark } from "../../../../src/package-checks/function-metrics/analyzer/performance-harness.test-support.ts";
import { TypeScriptReader } from "../../../../src/package-checks/function-metrics/analyzer/readers/typescript.ts";

type FileInput = { readonly path: string; readonly source: string };
type Request = { readonly files: readonly FileInput[] };
type Metric = {
  readonly ccn: number | null;
  readonly endLine: number;
  readonly file: string;
  readonly name: string;
  readonly nloc: number;
  readonly parameterCount: number;
  readonly startLine: number;
};

const [mode, requestPath] = process.argv.slice(2);
if (mode !== "matcher" && mode !== "tokens" && mode !== "full") {
  throw new Error("usage: <matcher|tokens|full> <request.json>");
}
if (requestPath === undefined) throw new Error("missing request");
const request = JSON.parse(readFileSync(requestPath, "utf8")) as Request;
const pattern = JSON.parse(
  readFileSync(
    new URL(
      "../explain-cpython-jsc-lizard-regex-performance-gap/typescript-token-pattern.json",
      import.meta.url
    ),
    "utf8"
  )
).source as string;
const EXPECT = {
  matcher: {
    count: 296074,
    digest: "47aeb09352ba3a1e0cbe1c3bfb8e8262974bfe38103a74345163376c759d460e"
  },
  tokens: {
    count: 295156,
    chars: 1127427,
    digest: "a3a71bd5022b4d6b9f15d2bd24b4947ff9e3c61d7395794be82042b3635fff98"
  },
  metrics: {
    count: 2222,
    digest: "29ff7a0e1535889e4055dd04989e70c6f925d08d745509b24f202744d5735ec6"
  }
} as const;

function digestMatcher(): { count: number; digest: string; fieldSum: number } {
  const hash = createHash("sha256");
  let count = 0;
  let fieldSum = 0;
  for (const file of request.files) {
    const regexp = new RegExp(pattern, "gmsu");
    let match: RegExpExecArray | null;
    while ((match = regexp.exec(file.source)) !== null) {
      count += 1;
      fieldSum += match[0].length + match.index;
      hash.update(match[0]);
      hash.update("\0");
      hash.update(String(match.index));
      hash.update("\0");
    }
  }
  return { count, digest: hash.digest("hex"), fieldSum };
}

function matcherFields(): { count: number; fieldSum: number } {
  let count = 0;
  let fieldSum = 0;
  for (const file of request.files) {
    const regexp = new RegExp(pattern, "gmsu");
    let match: RegExpExecArray | null;
    while ((match = regexp.exec(file.source)) !== null) {
      count += 1;
      fieldSum += match[0].length + match.index;
    }
  }
  return { count, fieldSum };
}

function tokenValues(): string[] {
  return Array.from(
    request.files.flatMap((file) => Array.from(TypeScriptReader.generateTokens(file.source)))
  );
}

function tokenGuard(values: readonly string[]) {
  const hash = createHash("sha256");
  let chars = 0;
  for (const value of values) {
    hash.update(value);
    hash.update("\0");
    chars += value.length;
  }
  return { count: values.length, chars, digest: hash.digest("hex") };
}

function canonicalMetricGuard(values: readonly Metric[]) {
  const normalized = [...values].sort(
    (left, right) =>
      left.file.localeCompare(right.file) ||
      left.startLine - right.startLine ||
      left.endLine - right.endLine ||
      left.name.localeCompare(right.name) ||
      left.nloc - right.nloc ||
      (left.ccn ?? -1) - (right.ccn ?? -1) ||
      left.parameterCount - right.parameterCount
  );
  return {
    count: normalized.length,
    digest: createHash("sha256").update(JSON.stringify(normalized)).digest("hex")
  };
}

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label} drift: ${JSON.stringify(actual)}`);
  }
}

function runtime() {
  const bun = typeof Bun === "undefined" ? undefined : Bun.version;
  return bun === undefined
    ? { engine: "v8", node: process.version, v8: process.versions.v8 }
    : { bun, engine: "jsc", nodeCompatibility: process.version };
}

let preflight: Record<string, unknown>;
let operation: () => unknown;
let validate: (value: unknown) => void;
if (mode === "matcher") {
  const guard = digestMatcher();
  assertEqual(
    { count: guard.count, digest: guard.digest },
    EXPECT.matcher,
    "exact raw matcher preflight"
  );
  preflight = { ...guard, exact: true };
  operation = matcherFields;
  validate = (value) => {
    assertEqual(value, { count: guard.count, fieldSum: guard.fieldSum }, "matcher fields");
    // SHA-256 is deliberately an outside-the-timer exact-output guard. The timed
    // matcher operation only consumes each match's UTF-16 index and text length.
    const post = digestMatcher();
    assertEqual(
      { count: post.count, digest: post.digest },
      EXPECT.matcher,
      "exact raw matcher postflight"
    );
    assertEqual(post.fieldSum, guard.fieldSum, "matcher postflight fields");
  };
} else if (mode === "tokens") {
  const values = tokenValues();
  const guard = tokenGuard(values);
  assertEqual(guard, EXPECT.tokens, "token stream preflight");
  preflight = { ...guard, exact: true };
  operation = tokenValues;
  validate = (value) => assertEqual(tokenGuard(value as string[]), guard, "token stream");
} else {
  const values = analyzePortForPerformanceBenchmark(request.files);
  const guard = canonicalMetricGuard(values);
  assertEqual(guard, EXPECT.metrics, "full analyzer preflight");
  preflight = { ...guard, exact: true };
  operation = () => analyzePortForPerformanceBenchmark(request.files);
  validate = (value) =>
    assertEqual(canonicalMetricGuard(value as Metric[]), guard, "full analyzer");
}

validate(operation()); // Uncounted same-process warmup.
const started = performance.now();
const value = operation();
const operationMs = performance.now() - started;
validate(value); // Guard deliberately runs after timer.
console.log(JSON.stringify({ mode, operationMs, preflight, runtime: runtime() }));
