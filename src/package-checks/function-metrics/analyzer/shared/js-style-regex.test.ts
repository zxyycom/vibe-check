/** Fixed-source tokenizer evidence: literal priority, whitespace, and streaming. */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";
import { analyzeLizardSource } from "../port-facade.ts";
import { get_reader_for } from "../reader-registry.ts";
import { CodeReader, type TokenMatch } from "./code-reader.ts";
import { js_style_regex_expression } from "./js-style-regex.ts";

test("JavaScript-style regex literals preserve fixed-source raw tokens across all six consumers", () => {
  const oracle: unknown = JSON.parse(
    readFileSync(
      new URL(
        "../fixtures/lizard-1.24.1/evidence/lizard-1.24.1-token-observations.json",
        import.meta.url
      ),
      "utf8"
    )
  );
  assertTokenOracle(oracle);
  assert.equal(oracle.cases.length, 78);
  for (const { suffix, source, tokens } of oracle.cases) {
    const Reader = get_reader_for(`tokens.${suffix}`);
    assert.ok(Reader);
    assert.deepEqual([...Reader.generateTokens(source)], tokens, `${suffix}: ${source}`);
  }
});

test("JavaScript-style regex recognition preserves tokenFactory and yields without draining input", () => {
  const matches: { text: string; offset: number }[] = [];
  const generator = js_style_regex_expression((source, addition, factory) =>
    CodeReader.generateTokens(source, addition, factory)
  );
  assert.deepEqual(
    [
      ...generator("x= \r\n\u001c\u0085 /[a]/g;", "", (match: TokenMatch) => {
        matches.push({ text: match.text, offset: match.startOffset });
        return match.text;
      })
    ],
    ["x", "=", " \r", "\n", "\u001c\u0085 ", "/[a]/g", ";"]
  );
  assert.deepEqual(
    matches.map(({ text }) => text),
    ["x", "=", " \r\n\u001c\u0085 /[a]/g", ";"]
  );
  assert.deepEqual(
    matches.map(({ offset }) => offset),
    [0, 1, 2, 14]
  );
  for (const [token, expected] of [
    ["", [""]],
    [" \t\n", [" \t\n"]],
    ["identifier", ["identifier"]],
    ["/a/", ["/a/"]],
    [" \t/a/", [" \t", "/a/"]],
    [" \n /a/", [" ", "\n", " ", "/a/"]],
    [" x /a/", [" x /a/"]]
  ] as const) {
    const suppliedToken = js_style_regex_expression(function* () {
      yield token;
    });
    assert.deepEqual([...suppliedToken("")], expected);
  }
  let consumed = 0;
  const streaming = js_style_regex_expression(function* () {
    consumed += 1;
    yield "first";
    consumed += 1;
    throw new Error("stream tail is not consumed early");
  })("");
  assert.deepEqual(streaming.next(), { value: "first", done: false });
  assert.equal(consumed, 1);
  streaming.return(undefined);
});

test("JavaScript-style regex source-start recognition does not consume cross-line division conditions", () => {
  for (const [sourceCode, endLine, contributorLine] of [
    ["function f(x,flag,a,b,y) {\n return x\n / (flag ? a : b) / y;\n}", 4, 3],
    ["function f(𝒜,flag,a,b,y) { return 𝒜/(flag ? a : b)/y; }", 1, 1]
  ] as const) {
    for (const filename of ["division.js", "division.jsx", "division.ts", "division.tsx"]) {
      assert.deepEqual(analyzeLizardSource({ filename, sourceCode })?.function_list, [
        {
          filename,
          name: "f",
          start_line: 1,
          end_line: endLine,
          nloc: endLine,
          parameter_count: 5,
          cyclomatic_complexity: 2,
          max_nesting_depth: 1,
          complex_tags: [["?", contributorLine]]
        }
      ]);
    }
  }
});

function assertTokenOracle(value: unknown): asserts value is {
  readonly cases: readonly {
    readonly suffix: string;
    readonly source: string;
    readonly tokens: readonly string[];
  }[];
} {
  assert.ok(typeof value === "object" && value !== null && "cases" in value);
  assert.ok(Array.isArray(value.cases));
  const cases: readonly unknown[] = value.cases;
  for (const entry of cases) {
    assert.ok(isRecord(entry));
    assert.equal(typeof entry.suffix, "string");
    assert.equal(typeof entry.source, "string");
    assert.ok(
      Array.isArray(entry.tokens) &&
        entry.tokens.every((token: unknown) => typeof token === "string")
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
