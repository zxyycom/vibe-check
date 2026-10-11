import assert from "node:assert/strict";
import test from "node:test";
import { analyzeLizardSource } from "./port-facade.ts";
import { TypeScriptReader } from "./readers/typescript.ts";
import { TSXReader } from "./readers/tsx.ts";
import { KotlinReader } from "./readers/kotlin.ts";

const tail =
  "if (true) {\n for (const value of [1]) {\n  if (true) {\n   void value;\n  }\n }\n}\n";

test("TypeScript function boundaries exclude trailing blocks for typed and inferred declarations and arrows", () => {
  for (const declaration of [
    "function marker()",
    "function marker(): string",
    "function marker(): Promise<string>",
    "function marker(): { value: string }",
    "const marker = (): string =>",
    "const marker = (): Promise<string> =>",
    "const marker = (): { value: string } =>"
  ]) {
    for (const suffix of ["", tail]) {
      let returnExpression = '"marker"';
      if (declaration.includes("Promise<string>")) returnExpression = 'Promise.resolve("marker")';
      else if (declaration.includes("{ value: string }")) returnExpression = '{value: "marker"}';
      const sourceCode = `${declaration} {\n return ${returnExpression};\n}\n${suffix}`;
      const functions = analyzeLizardSource({ filename: "boundary.ts", sourceCode })?.function_list;
      assert.deepEqual(
        functions,
        [
          {
            name: "marker",
            filename: "boundary.ts",
            start_line: 1,
            end_line: 3,
            nloc: 3,
            parameter_count: 0,
            cyclomatic_complexity: 1,
            complex_tags: [],
            max_nesting_depth: 0
          }
        ],
        declaration
      );
    }
  }
  const nested = analyzeLizardSource({
    filename: "nested.ts",
    sourceCode:
      'function nested(): string {\n if (true) {\n  for (const value of [1]) {\n   if (true) { return "yes"; }\n  }\n }\n return "no";\n}\n' +
      tail
  })?.function_list[0];
  assert.deepEqual(nested, {
    name: "nested",
    filename: "nested.ts",
    start_line: 1,
    end_line: 8,
    nloc: 8,
    parameter_count: 0,
    cyclomatic_complexity: 4,
    max_nesting_depth: 3,
    complex_tags: [
      ["if", 2],
      ["for", 3],
      ["if", 4]
    ]
  });
});

test("TypeScript nullish tokens preserve optional parameters and real ternaries with complete line contributions", () => {
  for (const reader of [TypeScriptReader, TSXReader]) {
    assert.deepEqual(
      [...reader.generateTokens("a??b a ?? b a?: number a ? b : c")].filter((token) =>
        token.trim()
      ),
      reader === TypeScriptReader
        ? ["a", "??", "b", "a", "??", "b", "a?", ":", "number", "a", "?", "b", ":", "c"]
        : ["a", "??", "b", "a", "??", "b", "a", "?", ":", "number", "a", "?", "b", ":", "c"]
    );
  }
  // Seven original operator controls remain independent of the typed-tail defect.
  for (const { expression, parameters, ccn, nd, tokens } of [
    { expression: "a,b,c,d", parameters: "a,b,c,d", ccn: 1, nd: 0, tokens: [] },
    { expression: "a ?? 0", parameters: "a", ccn: 2, nd: 1, tokens: ["??"] },
    {
      expression: "a ?? 0,b ?? 0,c ?? 0,d ?? 0",
      parameters: "a,b,c,d",
      ccn: 5,
      nd: 4,
      tokens: ["??", "??", "??", "??"]
    },
    { expression: "a??0", parameters: "a", ccn: 2, nd: 1, tokens: ["??"] },
    { expression: "a", parameters: "a?: number", ccn: 1, nd: 0, tokens: [] },
    { expression: "a == null ? 0 : a", parameters: "a", ccn: 2, nd: 1, tokens: ["?"] },
    {
      expression: "a == null ? 0 : a,b == null ? 0 : b,c == null ? 0 : c,d == null ? 0 : d",
      parameters: "a,b,c,d",
      ccn: 5,
      nd: 4,
      tokens: ["?", "?", "?", "?"]
    }
  ]) {
    const [f] = analyzeLizardSource({
      filename: "operators.ts",
      sourceCode: `function defaults(${parameters}) {\n return [${expression}];\n}`
    })!.function_list;
    assert.equal(f?.cyclomatic_complexity, ccn, expression);
    assert.equal(f?.max_nesting_depth, nd, expression);
    assert.deepEqual(
      f?.complex_tags,
      tokens.map((token) => [token, 2]),
      expression
    );
    assert.equal(f?.end_line, 3);
    assert.equal(f?.nloc, 3);
  }
  const [multiline] = analyzeLizardSource({
    filename: "lines.ts",
    sourceCode: "function f(a,b,c) {\n return [a ?? 0,\n b??0,\n c ?? 0];\n}"
  })!.function_list;
  assert.equal(multiline?.cyclomatic_complexity, 4);
  assert.deepEqual(multiline?.complex_tags, [
    ["??", 2],
    ["??", 3],
    ["??", 4]
  ]);
});

test("Nullish nesting depth follows short-circuit condition, hidden-bracket, semicolon, and function-reset paths", () => {
  // Independent expectations follow the existing ND state transitions, not AST depth.
  // Each opening parenthesis resets first-logical tracking; a semicolon retires
  // at most one hidden bracket, and no hidden bracket is added while loop status is set.
  const cases = [
    { body: "return a ?? b;", nd: 1, tokens: ["??"] },
    { body: "return a ?? b ?? c;", nd: 2, tokens: ["??", "??"] },
    { body: "return (a ?? b ?? c);", nd: 1, tokens: ["??", "??"] },
    { body: "if (a ?? b ?? c) { return a; }", nd: 2, tokens: ["if", "??", "??"] },
    { body: "return ((a ?? b) ?? c);", nd: 1, tokens: ["??", "??"] },
    { body: "return (a ?? b) || c;", nd: 2, tokens: ["??", "||"] },
    { body: "return a ?? (b && c);", nd: 2, tokens: ["??", "&&"] },
    { body: "return [(a ?? b), (b ?? c)];", nd: 2, tokens: ["??", "??"] },
    { body: "a ?? b; c ?? d;", nd: 2, tokens: ["??", "??"] },
    { body: "if (a) { return b ?? c ?? d; }", nd: 3, tokens: ["if", "??", "??"] },
    { body: "if (a ?? (b ?? c)) { return a; }", nd: 3, tokens: ["if", "??", "??"] }
  ];
  for (const { body, nd, tokens } of cases) {
    for (const operator of ["??", "&&", "||"]) {
      const sourceCode = `function f(a,b,c,d) {\n${body.replaceAll("??", operator)}\n}\nfunction after() { return 0; }`;
      const [f, after] = analyzeLizardSource({ filename: "matrix.ts", sourceCode })!.function_list;
      assert.equal(f?.max_nesting_depth, nd, sourceCode);
      assert.equal(f?.cyclomatic_complexity, 1 + tokens.length, sourceCode);
      assert.deepEqual(
        f?.complex_tags,
        tokens.map((token) => [token === "??" ? operator : token, 2]),
        sourceCode
      );
      assert.equal(f?.end_line, 3);
      assert.equal(after?.max_nesting_depth, 0);
      assert.equal(after?.cyclomatic_complexity, 1);
      assert.deepEqual(after?.complex_tags, []);
    }
  }
});

test("Inherited JS JSX TSX and Vue readers share nullish corrections without granting Kotlin a logical operator", () => {
  for (const filename of ["sample.ts", "sample.js", "sample.jsx", "sample.tsx", "sample.vue"]) {
    for (const expression of ["a ?? b", "a??b"]) {
      const body = `function f(a,b) {\n return ${expression};\n}\n${tail}`;
      const sourceCode = filename.endsWith("vue") ? `<script>\n${body}</script>` : body;
      const [f] = analyzeLizardSource({ filename, sourceCode })!.function_list;
      assert.equal(f?.cyclomatic_complexity, 2, filename);
      assert.equal(f?.max_nesting_depth, 1, filename);
      assert.equal(f?.end_line, filename.endsWith("vue") ? 4 : 3, filename);
      assert.deepEqual(f?.complex_tags, [["??", filename.endsWith("vue") ? 3 : 2]], filename);
    }
  }
  assert.equal(KotlinReader.logicalOperators.has("??"), false);
  assert.deepEqual(
    [...KotlinReader.generateTokens("a ?? b")].filter((token) => token.trim()),
    ["a", "??", "b"]
  );
  const [kotlin] = analyzeLizardSource({
    filename: "sample.kt",
    sourceCode: "fun f(a: Int) { return a ?? 0 }"
  })!.function_list;
  assert.equal(kotlin?.cyclomatic_complexity, 1);
  assert.equal(kotlin?.max_nesting_depth, 0);
  assert.deepEqual(kotlin?.complex_tags, []);
});
