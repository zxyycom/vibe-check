/**
 * Derived from terryyin/lizard 1.24.0 tests.
 * Sources: test/test_languages/testSt.py and lizard_languages/st.py.
 * Upstream revision: 308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec.
 * SPDX-License-Identifier: MIT
 * Modified: direct source-observation reader parity coverage.
 */

import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { analyzeSourceCode } from "../core.ts";
import { StReader } from "./st.ts";

const fixtureDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures/lizard-1.24.0/st"
);

test("Structured Text reader preserves fixtures and upstream function-block/function/action boundaries", () => {
  for (const fixture of ["normal.st", "edge.st"]) {
    assert.deepEqual(readFixture(fixture), [
      { ccn: 1, endLine: 2, name: "reader_sample", nloc: 2, parameterCount: 0, startLine: 1 }
    ]);
  }

  assert.deepEqual(
    describe(
      analyzeSourceCode(
        "blocks.st",
        "FUNCTION_BLOCK Controller\nEND_FUNCTION_BLOCK\nFUNCTION Compute : INT\nEND_FUNCTION\nACTION Cycle\nEND_ACTION\n",
        StReader
      )
    ),
    [
      { ccn: 1, endLine: 2, name: "Controller", nloc: 2, parameterCount: 0, startLine: 1 },
      { ccn: 1, endLine: 4, name: "Compute", nloc: 2, parameterCount: 0, startLine: 3 },
      { ccn: 1, endLine: 6, name: "Cycle", nloc: 2, parameterCount: 0, startLine: 5 }
    ]
  );

  for (const sourceCase of ST_DIRECT_SOURCE_CASES) {
    const { source: _source, ...expected } = sourceCase;
    assert.deepEqual(
      sourceObservation(analyzeSourceCode("a.st", sourceCase.source, StReader)),
      expected
    );
  }
});

function readFixture(name: string): readonly FunctionMeasurement[] {
  const path = resolve(fixtureDirectory, name);
  return describe(analyzeSourceCode(path, readFileSync(path, "utf8"), StReader));
}

function describe(file: ReturnType<typeof analyzeSourceCode>): readonly FunctionMeasurement[] {
  return file.functionList.map((functionInfo) => ({
    ccn: functionInfo.cyclomaticComplexity,
    endLine: functionInfo.endLine,
    name: functionInfo.name,
    nloc: functionInfo.nloc,
    parameterCount: functionInfo.parameterCount,
    startLine: functionInfo.startLine
  }));
}

type FunctionMeasurement = Readonly<{
  readonly ccn: number;
  readonly endLine: number;
  readonly name: string;
  readonly nloc: number;
  readonly parameterCount: number;
  readonly startLine: number;
}>;

type SourceObservation = Readonly<{
  readonly source: string;
  readonly file_nloc: number;
  readonly functions: readonly SourceFunctionObservation[];
}>;

type SourceFunctionObservation = Readonly<{
  readonly name: string;
  readonly long_name: string;
  readonly ccn: number;
  readonly nloc: number;
  readonly start_line: number;
  readonly end_line: number;
  readonly parameter_count: number;
  readonly parameters: readonly string[];
  readonly top_nesting_level: number;
  readonly max_nesting_depth: number;
}>;

function sourceObservation(
  file: ReturnType<typeof analyzeSourceCode>
): Omit<SourceObservation, "source"> {
  return {
    file_nloc: file.nloc,
    functions: file.functionList.map((functionInfo) => ({
      name: functionInfo.name,
      long_name: functionInfo.longName,
      ccn: functionInfo.cyclomaticComplexity,
      nloc: functionInfo.nloc,
      start_line: functionInfo.startLine,
      end_line: functionInfo.endLine,
      parameter_count: functionInfo.parameterCount,
      parameters: functionInfo.parameters,
      top_nesting_level: functionInfo.topNestingLevel,
      max_nesting_depth: functionInfo.maxNestingDepth
    }))
  };
}

const ST_DIRECT_SOURCE_CASES: readonly SourceObservation[] = [
  {
    source:
      "\n            ACTION ac1:\n                a := 200;\n                CASE a OF\n                    b1:\n                        c := 1;\n                    b2:\n                        c := 2;\n                END_CASE\n            END_ACTION\n            ",
    file_nloc: 9,
    functions: [
      {
        name: "ac1",
        long_name: "ac1",
        ccn: 2,
        nloc: 9,
        start_line: 2,
        end_line: 10,
        parameter_count: 0,
        parameters: [],
        top_nesting_level: 0,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source:
      "\n            ACTION ac1:\n                a := 200;\n                CASE a OF\n                    b1:\n                        c := 1;\n                    b2:\n                        c := 2;\n                    else:\n                        c := 3;\n                END_CASE\n            END_ACTION\n            ",
    file_nloc: 11,
    functions: [
      {
        name: "ac1",
        long_name: "ac1",
        ccn: 2,
        nloc: 11,
        start_line: 2,
        end_line: 12,
        parameter_count: 0,
        parameters: [],
        top_nesting_level: 0,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source:
      "\n            ACTION ac1:\n                a := 10;\n                FOR b := 1 TO a DO\n                    c := c + b;\n                END_FOR\n            END_ACTION\n            ",
    file_nloc: 6,
    functions: [
      {
        name: "ac1",
        long_name: "ac1",
        ccn: 2,
        nloc: 6,
        start_line: 2,
        end_line: 7,
        parameter_count: 0,
        parameters: [],
        top_nesting_level: 0,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source:
      "\n            ACTION ac1:\n                a := 200;\n                IF b THEN\n                    c := 1;\n                END_IF\n            END_ACTION\n            ",
    file_nloc: 6,
    functions: [
      {
        name: "ac1",
        long_name: "ac1",
        ccn: 2,
        nloc: 6,
        start_line: 2,
        end_line: 7,
        parameter_count: 0,
        parameters: [],
        top_nesting_level: 0,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source:
      "\n            ACTION ac1:\n                a := 200;\n                IF b THEN\n                    c := 1;\n                ELSE:\n                    c := 2;\n                END_IF\n            END_ACTION\n            ",
    file_nloc: 8,
    functions: [
      {
        name: "ac1",
        long_name: "ac1",
        ccn: 2,
        nloc: 8,
        start_line: 2,
        end_line: 9,
        parameter_count: 0,
        parameters: [],
        top_nesting_level: 0,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source:
      "\n            ACTION ac1:\n                REPEAT\n                    c := c + b;\n                    b := b + 1;\n                    UNTIL b < a\n                END_REPEAT\n            END_ACTION\n            ",
    file_nloc: 7,
    functions: [
      {
        name: "ac1",
        long_name: "ac1",
        ccn: 2,
        nloc: 7,
        start_line: 2,
        end_line: 8,
        parameter_count: 0,
        parameters: [],
        top_nesting_level: 0,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source:
      "\n            ACTION ac1:\n                a := 10;\n                WHILE b < a DO\n                    c := c + b;\n                    b := b + 1;\n                END_WHILE\n            END_ACTION\n            ",
    file_nloc: 7,
    functions: [
      {
        name: "ac1",
        long_name: "ac1",
        ccn: 2,
        nloc: 7,
        start_line: 2,
        end_line: 8,
        parameter_count: 0,
        parameters: [],
        top_nesting_level: 0,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source:
      "\n            ACTION test_logic:\n                IF (a > 0) AND (b > 0) OR (c > 0) THEN\n                    x := 1;\n                END_IF\n                \n                IF (d > 0) AND (e > 0) THEN\n                    y := 2;\n                END_IF\n            END_ACTION\n            ",
    file_nloc: 8,
    functions: [
      {
        name: "test_logic",
        long_name: "test_logic",
        ccn: 6,
        nloc: 8,
        start_line: 2,
        end_line: 10,
        parameter_count: 0,
        parameters: [],
        top_nesting_level: 0,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source: "(* Comment1 *)\nint fun(){}\n(* Comment2 *)",
    file_nloc: 1,
    functions: []
  },
  {
    source: "",
    file_nloc: 0,
    functions: []
  },
  {
    source:
      "\n            ACTION ac1:\n                // Comment\n                action := bar;\n                bar := ACTION;\n                function := bar;\n                bar := FUNCTION;\n            END_ACTION\n            ",
    file_nloc: 6,
    functions: [
      {
        name: "ac1",
        long_name: "ac1",
        ccn: 1,
        nloc: 6,
        start_line: 2,
        end_line: 8,
        parameter_count: 0,
        parameters: [],
        top_nesting_level: 0,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source: "(* Comment1 *)\n",
    file_nloc: 0,
    functions: []
  },
  {
    source: "(* Comment *)\nACTION ac1:\n// Comment\nfoo := bar;\nEND_ACTION\n",
    file_nloc: 3,
    functions: [
      {
        name: "ac1",
        long_name: "ac1",
        ccn: 1,
        nloc: 3,
        start_line: 2,
        end_line: 5,
        parameter_count: 0,
        parameters: [],
        top_nesting_level: 0,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source: "(* Comment *)\nFUNCTION fun:\n// Comment\nfoo := bar;\nEND_FUNCTION\n",
    file_nloc: 3,
    functions: [
      {
        name: "fun",
        long_name: "fun",
        ccn: 1,
        nloc: 3,
        start_line: 2,
        end_line: 5,
        parameter_count: 0,
        parameters: [],
        top_nesting_level: 0,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source:
      "ACTION ac1:\n// Comment\nfoo := bar;\nEND_ACTION\n(* Comment *)\nACTION ac2:\n// Comment\nfoo := bar;\nEND_ACTION\n",
    file_nloc: 6,
    functions: [
      {
        name: "ac1",
        long_name: "ac1",
        ccn: 1,
        nloc: 3,
        start_line: 1,
        end_line: 4,
        parameter_count: 0,
        parameters: [],
        top_nesting_level: 0,
        max_nesting_depth: 0
      },
      {
        name: "ac2",
        long_name: "ac2",
        ccn: 1,
        nloc: 3,
        start_line: 6,
        end_line: 9,
        parameter_count: 0,
        parameters: [],
        top_nesting_level: 0,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source:
      "FUNCTION fun1:\n// Comment\nfoo := bar;\nEND_FUNCTION\n(* Comment *)\nFUNCTION fun2:\n// Comment\nfoo := bar;\nEND_FUNCTION\n",
    file_nloc: 6,
    functions: [
      {
        name: "fun1",
        long_name: "fun1",
        ccn: 1,
        nloc: 3,
        start_line: 1,
        end_line: 4,
        parameter_count: 0,
        parameters: [],
        top_nesting_level: 0,
        max_nesting_depth: 0
      },
      {
        name: "fun2",
        long_name: "fun2",
        ccn: 1,
        nloc: 3,
        start_line: 6,
        end_line: 9,
        parameter_count: 0,
        parameters: [],
        top_nesting_level: 0,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source:
      "\n                #ifdef A\n                #elif (defined E)\n                #endif\n                ",
    file_nloc: 0,
    functions: []
  }
];
