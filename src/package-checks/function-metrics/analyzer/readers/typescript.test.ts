import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { analyzeSourceCode, type FunctionInfo } from "../core.ts";
import { TypeScriptReader } from "./typescript.ts";

const fixtureDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures/lizard-1.24.0/typescript"
);

test("TypeScript reader preserves fixtures, type syntax, decorators, regexes, templates, methods, and arrows", () => {
  for (const fixtureName of ["normal.ts", "edge.ts"]) {
    assert.deepEqual(readFixture(fixtureName), [
      { ccn: 2, endLine: 1, name: "readerSample", nloc: 1, parameterCount: 1, startLine: 1 }
    ]);
  }

  const functions = analyze(
    [
      "",
      "    declare function external(input: string): void;",
      "    type Callback = (value: string) => boolean;",
      "    interface Shape { render(value: string): void; }",
      "    class Widget {",
      "      @decorate()",
      "      static async compute<T extends string>(value: T, fallback?: number): Promise<T> {",
      "        const matcher = /a\\\\/b/g;",
      '        return `${value}:${matcher.test(value) ? "yes" : "no"}`;',
      "      }",
      '      get label(): string { return "widget"; }',
      "    }",
      "    const transform = (value: string, count = 1) => value.repeat(count);",
      "  "
    ].join("\n")
  );
  assert.deepEqual(functions.map(toMeasurement), [
    { ccn: 1, endLine: 10, name: "compute", nloc: 4, parameterCount: 2, startLine: 7 },
    { ccn: 1, endLine: 11, name: "get label", nloc: 1, parameterCount: 0, startLine: 11 },
    { ccn: 1, endLine: 13, name: "transform", nloc: 1, parameterCount: 2, startLine: 13 }
  ]);
  assert.deepEqual(
    analyze(
      [
        "",
        "export function function1 (",
        "  parameter1: Param1,",
        "  parameter2: Param2,",
        "  parameter3: Param3,",
        "  parameter4: Param4",
        "): something | undefined {",
        "  const newVariable = parameter1.newExample?.trim();",
        "  if (!newVariable) {",
        "    return undefined;",
        "  }",
        "",
        "  return something;",
        "}",
        "",
        "function function2(param1: Param1, param2: Param2): boolean {",
        "  return anotherFunction(param1.thing, param2.anotherThing);",
        "}",
        ""
      ].join("\n")
    ).map(toMeasurement),
    [
      { ccn: 2, endLine: 16, name: "function1", nloc: 13, parameterCount: 4, startLine: 2 },
      { ccn: 1, endLine: 18, name: "function2", nloc: 3, parameterCount: 2, startLine: 16 }
    ]
  );
  assert.deepEqual(
    [...TypeScriptReader.generateTokens("output.push(`${`${n}: `.padStart(w)}${s}`);")],
    [
      "output",
      ".",
      "push",
      "(",
      "`",
      "${",
      "`${`",
      "$",
      "{",
      "n",
      "}",
      ":",
      " ",
      "`",
      "`.padStart(w)}`",
      "${",
      "s",
      "}",
      "`",
      ")",
      ";"
    ]
  );
  for (const { expectedNames, sourceCode } of [
    { expectedNames: [], sourceCode: "type Handler = (event: Event) => void;" },
    {
      expectedNames: ["createConfig"],
      sourceCode:
        'interface Config { host: string; } function createConfig(): Config { return {host: "x"}; }'
    },
    { expectedNames: ["fn"], sourceCode: "const fn = <T extends Foo>(x: T) => x;" },
    {
      expectedNames: ["handleClick", "render"],
      sourceCode:
        'class Btn { handleClick = () => { console.log("click"); }; render() { return null; } }'
    },
    {
      expectedNames: ["foo", "bar", "baz"],
      sourceCode: "export function foo(){} export const bar=()=>2; export default function baz(){}"
    },
    {
      expectedNames: ["f"],
      sourceCode: "const f = async (x:string): Promise<string> => { if (x) return x; return x; }"
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
  return analyzeSourceCode("source.ts", sourceCode, TypeScriptReader).functionList;
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
