import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { analyzeSourceCode, type FunctionInfo } from "../core.ts";
import { JavaScriptReader } from "./javascript.ts";

const fixtureDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures/lizard-1.24.0/javascript"
);

test("JavaScript reader preserves every suffix, regex/template tokens, class methods, and arrows", () => {
  for (const fixtureName of ["normal.js", "normal.cjs", "normal.mjs", "edge.js"]) {
    assert.deepEqual(readFixture(fixtureName), [
      { ccn: 2, endLine: 1, name: "readerSample", nloc: 1, parameterCount: 1, startLine: 1 }
    ]);
  }

  const functions = analyze(
    [
      "",
      "    const matcher = /a\\\\/b/g;",
      "    class Widget {",
      "      async compute(value, fallback = 1) { return `${value}:${matcher.test(value) ? fallback : 0}`; }",
      '      get label() { return "widget"; }',
      "    }",
      "    const transform = (value, count = 1) => value.repeat(count);",
      "  "
    ].join("\n")
  );
  assert.deepEqual(functions.map(toMeasurement), [
    { ccn: 1, endLine: 4, name: "compute", nloc: 1, parameterCount: 2, startLine: 4 },
    { ccn: 1, endLine: 5, name: "get label", nloc: 1, parameterCount: 0, startLine: 5 },
    { ccn: 1, endLine: 7, name: "transform", nloc: 1, parameterCount: 2, startLine: 7 }
  ]);
  assert.deepEqual([...JavaScriptReader.generateTokens("a=/ab/")], ["a", "=", "/ab/"]);
  assert.deepEqual(
    [...JavaScriptReader.generateTokens("`hello ${name}`")],
    ["`", "`hello `", "${", "name", "}", "`"]
  );
  for (const { expectedNames, sourceCode } of [
    { expectedNames: ["b", "a"], sourceCode: "function a(){function b(){}}" },
    {
      expectedNames: ["method", "computedName", "get prop", "set prop"],
      sourceCode:
        'var obj = {method() {}, ["computed" + "Name"]() {}, get prop(){}, set prop(value){}}'
    },
    {
      expectedNames: ["exported", "exports.named"],
      sourceCode: "module.exports = function exported() {}; exports.named = () => {};"
    },
    {
      expectedNames: ["constructor", "method", "child"],
      sourceCode: "class Base { constructor(){} method(){} } class Child extends Base { child(){} }"
    }
  ]) {
    assert.deepEqual(
      analyze(sourceCode).map((functionInfo) => functionInfo.name),
      expectedNames
    );
  }
});

function readFixture(name: string): readonly FunctionMeasurement[] {
  return analyze(readFileSync(resolve(fixtureDirectory, name), "utf8")).map(toMeasurement);
}

function analyze(sourceCode: string): readonly FunctionInfo[] {
  return analyzeSourceCode("source.js", sourceCode, JavaScriptReader).functionList;
}

function toMeasurement(functionInfo: FunctionInfo): FunctionMeasurement {
  return {
    ccn: functionInfo.cyclomaticComplexity,
    endLine: functionInfo.endLine,
    name: functionInfo.name,
    nloc: functionInfo.nloc,
    parameterCount: functionInfo.parameterCount,
    startLine: functionInfo.startLine
  };
}

type FunctionMeasurement = Readonly<{
  readonly ccn: number;
  readonly endLine: number;
  readonly name: string;
  readonly nloc: number;
  readonly parameterCount: number;
  readonly startLine: number;
}>;
