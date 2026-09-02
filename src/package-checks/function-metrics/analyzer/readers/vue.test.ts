import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { analyzeSourceCode, type FunctionInfo } from "../core.ts";
import { VueReader } from "./vue.ts";

const fixtureDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures/lizard-1.23.0/vue"
);

test("Vue reader preserves fixtures and script-only function boundaries, order, metrics, and ranges", () => {
  for (const fixtureName of ["normal.vue", "edge.vue"]) {
    assert.deepEqual(readFixture(fixtureName), [
      { ccn: 2, endLine: 1, name: "readerSample", nloc: 1, parameterCount: 1, startLine: 1 }
    ]);
  }

  const functions = analyze(
    [
      "",
      '    <template><button @click="ignored">ignored</button></template>',
      '    <script lang="ts">',
      "    export default {",
      "      methods: {",
      '        hello(name: string) { if (name) return `Hi ${name}`; return "Hi"; },',
      "        save: (value: number) => value + 1",
      "      }",
      "    }",
      "    </script>",
      "    <script>function ignored() { return 0; }</script>",
      "  "
    ].join("\n")
  );
  assert.deepEqual(functions.map(toMeasurement), [
    { ccn: 2, endLine: 4, name: "hello", nloc: 1, parameterCount: 1, startLine: 4 },
    { ccn: 1, endLine: 6, name: "save", nloc: 2, parameterCount: 1, startLine: 5 },
    { ccn: 1, endLine: 8, name: "ignored", nloc: 1, parameterCount: 0, startLine: 8 }
  ]);
});

function readFixture(name: string): readonly FunctionMeasurement[] {
  return analyze(readFileSync(resolve(fixtureDirectory, name), "utf8")).map(toMeasurement);
}

function analyze(sourceCode: string): readonly FunctionInfo[] {
  return analyzeSourceCode("source.vue", sourceCode, VueReader).functionList;
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
