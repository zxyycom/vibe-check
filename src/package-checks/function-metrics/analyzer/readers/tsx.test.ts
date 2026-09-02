import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { analyzeSourceCode, type FunctionInfo } from "../core.ts";
import { TSXReader } from "./tsx.ts";

const fixtureDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures/lizard-1.23.0/tsx"
);

test("TSX reader preserves every suffix, JSX nesting and attributes, typed component arrows, and ranges", () => {
  for (const fixtureName of ["normal.tsx", "normal.jsx", "edge.tsx"]) {
    assert.deepEqual(readFixture(fixtureName), [
      { ccn: 2, endLine: 1, name: "ReaderSample", nloc: 1, parameterCount: 1, startLine: 1 }
    ]);
  }

  const functions = analyze(`
    type Props = { active: boolean; onSelect: (id: string) => void };
    export const Widget = ({ active, onSelect }: Props) => (
      <section data-active={active} onClick={(event) => onSelect(event.currentTarget.id)}>
        {active ? <span>{"on"}</span> : <span>{"off"}</span>}
      </section>
    );
  `);
  assert.deepEqual(functions.map(toMeasurement), [
    { ccn: 2, endLine: 7, name: "Widget", nloc: 5, parameterCount: 2, startLine: 3 }
  ]);
  assert.deepEqual(
    [...TSXReader.generateTokens("<abc x={y}>a</abc><a></a>")],
    ["y", ";", "<abc x={>a</abc>", "<a>", "</a>"]
  );
  assert.deepEqual(
    analyze(
      "const Grid = () => (\n  <button onClick={(event) => handle(event)}>{[1].map((value) => <span>{value}</span>)}</button>\n);\n"
    ).map(toMeasurement),
    [
      { ccn: 1, endLine: 2, name: "(anonymous)", nloc: 1, parameterCount: 0, startLine: 2 },
      { ccn: 1, endLine: 2, name: "(anonymous)", nloc: 1, parameterCount: 0, startLine: 2 },
      { ccn: 1, endLine: 3, name: "Grid", nloc: 3, parameterCount: 0, startLine: 1 }
    ]
  );
  for (const { expectedNames, sourceCode } of [
    { expectedNames: ["(anonymous)"], sourceCode: "x=>x" },
    {
      expectedNames: ["MyComponent"],
      sourceCode: "const MyComponent: React.FC = () => { return <div>Hello</div>; }"
    },
    { expectedNames: ["(anonymous)"], sourceCode: "<StaticQuery render={data => ()} />" },
    {
      expectedNames: ["(anonymous)", "List"],
      sourceCode:
        "const List=({items})=><>{items.map((item,index)=><div key={index}>{item}</div>)}</>"
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
  return analyzeSourceCode("source.tsx", sourceCode, TSXReader).functionList;
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
