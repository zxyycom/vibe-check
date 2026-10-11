import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";
import { analyzeLizardSource, type LizardFunctionInfo } from "./port-facade.ts";
import { analyzeSourceCode } from "./pipeline.ts";
import { getExtensions } from "./extensions/registry.ts";
import { RustReader } from "./readers/rust.ts";

interface UpgradeCase {
  readonly filename: string;
  readonly sourceCode: string;
  readonly functions: readonly LizardFunctionInfo[];
}
const oracle: unknown = JSON.parse(
  readFileSync(
    new URL(
      "./fixtures/lizard-1.24.1/evidence/lizard-1.24.1-upgrade-observations.json",
      import.meta.url
    ),
    "utf8"
  )
);
assertUpgradeOracle(oracle);

test("fixed 1.24.1 upgrade scenarios retain raw oracle separately from approved Rust/Kotlin deviations", () => {
  assert.equal(oracle.cases.length, 14);
  assert.equal(oracle.inheritedTypeScriptDefectControls.length, 2);
  // These are fixed upstream controls, not claims that upgrading repaired them.
  for (const entry of oracle.inheritedTypeScriptDefectControls) {
    assert.deepEqual(analyzeLizardSource(entry)?.function_list, entry.functions);
  }
  for (const entry of oracle.cases) {
    const expected = entry.functions.map((functionInfo) => ({ ...functionInfo }));
    if (entry.filename === "match-arms.rs") {
      assert.deepEqual(expected[0]?.complex_tags, []);
      expected[0] = {
        ...expected[0],
        complex_tags: [
          ["=>", 4],
          ["=>", 5]
        ]
      };
    } else if (entry.filename === "expression-body.kt" || entry.filename === "expression-when.kt") {
      const raw = expected[0];
      assert.ok(raw !== undefined);
      assert.equal(raw.end_line, entry.filename === "expression-body.kt" ? 2 : 5);
      assert.equal(raw.nloc, raw.end_line);
      expected[0] = { ...raw, end_line: raw.end_line - 1, nloc: raw.nloc - 1 };
    }
    assert.deepEqual(analyzeLizardSource(entry)?.function_list, expected, entry.filename);
  }
});

test("Rust match increments and contributors share per-scope arm state across extension lifecycles", () => {
  const cases = [
    { body: "match x {}", ccn: 1, tags: [] },
    { body: "match x { _ => 1 }", ccn: 1, tags: [] },
    {
      body: "match (xs[index({ 0 })]) { 0 => 1, 1 => 2, _ => 3 }",
      ccn: 3,
      tags: [
        ["=>", 2],
        ["=>", 2]
      ]
    },
    {
      body: "match x { 0 => { match y { 0 => 1, _ => 2 } }, _ => 3 }",
      ccn: 3,
      tags: [
        ["=>", 2],
        ["=>", 2]
      ]
    },
    { body: "let fake = a => b;", ccn: 1, tags: [] },
    {
      body: "if x && y { match x { 0 if y => 1, _ => 2 } }",
      ccn: 5,
      tags: [
        ["if", 2],
        ["&&", 2],
        ["if", 2],
        ["=>", 2]
      ]
    },
    { body: "match x { 0 => 1, _ => 2 }; match y { _ => 3 }", ccn: 2, tags: [["=>", 2]] }
  ] as const;
  for (const { body, ccn, tags } of cases) {
    for (const extensions of [[], ["complextags"], ["complextags", "nd"]]) {
      const [f] = analyzeSourceCode(
        "arms.rs",
        `fn classify(x: i32) {\n${body}\n}`,
        RustReader,
        getExtensions(extensions)
      ).functionList;
      assert.ok(f !== undefined, body);
      assert.equal(f.cyclomaticComplexity, ccn, body);
      assert.deepEqual(f.complexTags, extensions.length === 0 ? undefined : tags, body);
      assert.equal(f.startLine, 1);
      assert.equal(f.endLine, 3);
      assert.equal(f.nloc, 3);
      assert.equal(f.parameterCount, 1);
      // Match arm counts do not introduce nesting-depth conditions.
      if (!body.startsWith("if")) assert.equal(f.maxNestingDepth, 0);
    }
  }
});

test("Kotlin expression boundaries exclude next declarations, outer braces, and trailing comments", () => {
  const cases = [
    { source: "fun first(x: Int) = x + 1\nfun after() {}", end: 1, nloc: 1 },
    { source: "fun first(x: Int) =\n  (x +\n   1)\n\n// comment\nfun after() {}", end: 3, nloc: 3 },
    { source: "fun first(x: Int) = Foo::class\nfun after() {}", end: 1, nloc: 1 },
    { source: "fun first(x: Int) = x + 1\n// trailing\n\n", end: 1, nloc: 1 },
    { source: "class Box {\nfun first(x: Int) = x + 1\n}\nfun after() {}", end: 2, nloc: 1 },
    {
      source: "fun first(x: Int) = when(x) {\n0 -> 1\nelse -> 2\n}\nfun after() {}",
      end: 4,
      nloc: 4
    },
    { source: "fun first(x: Int) = when(x) {\n0 -> 1\nelse -> 2\n}\n// EOF", end: 4, nloc: 4 }
  ];
  for (const { source, end, nloc } of cases) {
    const result = analyzeLizardSource({ filename: "body.kt", sourceCode: source })!;
    const [first, after] = result.function_list;
    assert.ok(first !== undefined, source);
    assert.deepEqual(
      first,
      {
        name: "first",
        filename: "body.kt",
        start_line: source.startsWith("class") ? 2 : 1,
        end_line: end,
        nloc,
        cyclomatic_complexity: source.includes("when") ? 2 : 1,
        parameter_count: 1,
        complex_tags: [],
        max_nesting_depth: 0
      },
      source
    );
    if (source.includes("fun after")) {
      assert.deepEqual(after, {
        name: "after",
        filename: "body.kt",
        start_line: source.split("\n").length,
        end_line: source.split("\n").length,
        nloc: 1,
        cyclomatic_complexity: 1,
        parameter_count: 0,
        complex_tags: [],
        max_nesting_depth: 0
      });
    } else assert.equal(result.function_list.length, 1);
  }
  assert.deepEqual(
    analyzeLizardSource({
      filename: "accessors.kt",
      sourceCode: "class Box {\nval size: Int\nget() = 1\nset(value) { save(value) }\n}\n"
    })?.function_list.map((f) => [
      f.name,
      f.start_line,
      f.end_line,
      f.nloc,
      f.cyclomatic_complexity,
      f.parameter_count,
      f.max_nesting_depth
    ]),
    [
      ["get", 3, 3, 1, 1, 0, 0],
      ["set", 4, 4, 1, 1, 0, 0]
    ]
  );
});

function assertUpgradeOracle(value: unknown): asserts value is {
  readonly cases: readonly UpgradeCase[];
  readonly inheritedTypeScriptDefectControls: readonly UpgradeCase[];
} {
  assert.ok(
    typeof value === "object" &&
      value !== null &&
      "cases" in value &&
      "inheritedTypeScriptDefectControls" in value
  );
  assert.ok(Array.isArray(value.cases));
  assert.ok(Array.isArray(value.inheritedTypeScriptDefectControls));
  const upgradeCases: readonly unknown[] = value.cases;
  const defectControls: readonly unknown[] = value.inheritedTypeScriptDefectControls;
  const cases = [...upgradeCases, ...defectControls];
  for (const entry of cases) {
    assert.ok(isRecord(entry));
    assert.equal(typeof entry.filename, "string");
    assert.equal(typeof entry.sourceCode, "string");
    assert.ok(Array.isArray(entry.functions));
    const functions: readonly unknown[] = entry.functions;
    for (const functionInfo of functions) {
      assert.ok(isRecord(functionInfo));
      for (const field of [
        "cyclomatic_complexity",
        "end_line",
        "nloc",
        "parameter_count",
        "max_nesting_depth",
        "start_line"
      ]) {
        assert.equal(typeof functionInfo[field], "number");
      }
      assert.equal(typeof functionInfo.filename, "string");
      assert.equal(typeof functionInfo.name, "string");
      assert.ok(Array.isArray(functionInfo.complex_tags));
      const tags: readonly unknown[] = functionInfo.complex_tags;
      for (const tag of tags) {
        assert.ok(Array.isArray(tag));
        assert.equal(tag.length, 2);
        assert.equal(typeof tag[0], "string");
        assert.equal(typeof tag[1], "number");
      }
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
