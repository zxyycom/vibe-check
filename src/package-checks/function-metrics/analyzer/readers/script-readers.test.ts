import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { analyzeSourceCode, type FunctionInfo, type ReaderConstructor } from "../core.ts";
import { GDScriptReader } from "./gdscript.ts";
import { LuaReader } from "./lua.ts";
import { PerlReader } from "./perl.ts";
import { PythonReader } from "./python.ts";
import { RReader } from "./r.ts";
import { RubyReader } from "./ruby.ts";

const fixtureRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../fixtures/lizard-1.23.0");

test("script readers preserve every registered suffix and normal/edge oracle fixture", () => {
  for (const fixture of ["normal.py", "edge.py"])
    assert.deepEqual(readFixture("python", fixture, PythonReader), [py]);
  for (const fixture of ["normal.gd", "edge.gd"])
    assert.deepEqual(readFixture("gdscript", fixture, GDScriptReader), [py]);
  for (const fixture of ["normal.rb", "edge.rb"])
    assert.deepEqual(readFixture("ruby", fixture, RubyReader), [ruby]);
  for (const fixture of ["normal.lua", "edge.lua"])
    assert.deepEqual(readFixture("lua", fixture, LuaReader), [lua]);
  for (const fixture of ["normal.pl", "normal.pm", "edge.pl"])
    assert.deepEqual(readFixture("perl", fixture, PerlReader), [perl]);
  for (const fixture of ["normal.r", "normal.R", "edge.r"])
    assert.deepEqual(readFixture("r", fixture, RReader), [r]);
});

test("Python and GDScript keep decorators, nested functions, multiline parameters, and inner branches", () => {
  const python = analyze(
    "nested.py",
    "@decorator(\n  value=True,\n)\ndef outer(\n  alpha: list[str],\n  beta=2,\n):\n  def inner(gamma):\n    if gamma:\n      return gamma\n  return inner(alpha)\n",
    PythonReader
  );
  assert.deepEqual(measurements(python), [
    { ccn: 2, endLine: 10, name: "outer.inner", nloc: 3, parameterCount: 1, startLine: 8 },
    { ccn: 1, endLine: 11, name: "outer", nloc: 6, parameterCount: 2, startLine: 4 }
  ]);

  const gdscript = analyze(
    "nested.gd",
    "@export var speed: int\nfunc outer(value: int) -> int:\n  func inner(other: int) -> int:\n    if other > 0:\n      return other\n  return inner(value)\n",
    GDScriptReader
  );
  assert.deepEqual(measurements(gdscript), [
    { ccn: 2, endLine: 5, name: "outer.inner", nloc: 3, parameterCount: 1, startLine: 3 },
    { ccn: 1, endLine: 6, name: "outer", nloc: 3, parameterCount: 1, startLine: 2 }
  ]);
});

test("Ruby and Lua retain function block boundaries and branch complexity", () => {
  assert.deepEqual(
    measurements(
      analyze(
        "block.rb",
        "def outer(value)\n  if value > 0\n    value\n  else\n    0\n  end\nend\n",
        RubyReader
      )
    ),
    [{ ccn: 2, endLine: 7, name: "outer", nloc: 7, parameterCount: 1, startLine: 1 }]
  );
  assert.deepEqual(
    measurements(
      analyze(
        "block.lua",
        "function outer(value)\n  if value > 0 then\n    return value\n  end\nend\n",
        LuaReader
      )
    ),
    [{ ccn: 2, endLine: 5, name: "outer", nloc: 5, parameterCount: 1, startLine: 1 }]
  );
});

test("Ruby keeps percent literals, symbols, variables, and interpolation token boundaries", () => {
  assert.deepEqual(
    [...RubyReader.generateTokens('x = %q{hello}\n:class? $value @item "a#{b}c"')],
    [
      "x",
      " ",
      "=",
      " ",
      "%q{hello}",
      "\n",
      ":class?",
      " ",
      "$value",
      " ",
      "@item",
      " ",
      '"a"',
      "${",
      "b",
      "}",
      '"c"'
    ]
  );
});

test("Perl package-qualified named subroutines and R assigned functions retain source names", () => {
  assert.deepEqual(
    measurements(
      analyze(
        "named.pl",
        "package Example;\nsub named($) {\n  my $callback = sub { return 1; };\n  return $callback->();\n}\n",
        PerlReader
      )
    ),
    [{ ccn: 2, endLine: 5, name: "Example::named", nloc: 4, parameterCount: 0, startLine: 2 }]
  );
  assert.deepEqual(
    measurements(
      analyze(
        "assigned.r",
        "first <- second <- function(value) {\n  if (value > 0) value else 0\n}\n",
        RReader
      )
    ),
    [
      { ccn: 2, endLine: 3, name: "first", nloc: 3, parameterCount: 1, startLine: 1 },
      { ccn: 2, endLine: 3, name: "second", nloc: 1, parameterCount: 0, startLine: 1 }
    ]
  );
});

test("Python source groups preserve soft keywords, triple strings, indentation, and forgiveness", () => {
  assert.deepEqual(
    measurements(
      analyze(
        "soft-keywords.py",
        "def classify(value):\n    match value:\n        case (x, y) if x:\n            return x\n    case = 1\n    case(value)\n    case[0] = value\n",
        PythonReader
      )
    ),
    [{ ccn: 3, endLine: 7, name: "classify", nloc: 7, parameterCount: 1, startLine: 1 }]
  );
  assert.deepEqual(
    measurements(
      analyze(
        "triple-strings.py",
        'def strings():\n    """doc\n    string"""\n    """comment\n    string"""\n    value = """assigned\n    string"""\n    return value\n',
        PythonReader
      )
    ),
    [{ ccn: 1, endLine: 8, name: "strings", nloc: 4, parameterCount: 0, startLine: 1 }]
  );
  assert.deepEqual(
    measurements(
      analyze(
        "indent-and-forgive.py",
        "#lizard forgive\ndef omitted():\n    return 1\nclass C:\n    def method(value):\n        if value:\n            return value\n\ndef top():\n    return 1\n",
        PythonReader
      )
    ),
    [
      { ccn: 2, endLine: 7, name: "method", nloc: 3, parameterCount: 1, startLine: 5 },
      { ccn: 1, endLine: 10, name: "top", nloc: 2, parameterCount: 0, startLine: 9 }
    ]
  );
});

test("GDScript source group preserves func inheritance and elif complexity", () => {
  assert.deepEqual(
    measurements(
      analyze(
        "elif.gd",
        "func choose(value):\n    if value > 0:\n        return value\n    elif value < 0:\n        return -value\n    return 0\n",
        GDScriptReader
      )
    ),
    [{ ccn: 3, endLine: 6, name: "choose", nloc: 6, parameterCount: 1, startLine: 1 }]
  );
});

test("Ruby and Lua source groups preserve tokenizer offsets, nested blocks, and anonymous functions", () => {
  assert.deepEqual(
    [...RubyReader.generateTokens('"#{"/#{}"}"')],
    ['""', "${", '"/"', "${", "}", '""', "}", '""']
  );
  assert.deepEqual(
    measurements(
      analyze(
        "ruby-source.rb",
        "class Sample\n  def self.run(value, other = 1)\n    begin\n      value if value > other\n    end\n  end\nend\nit 'runs' do\n  value = %i[one two]\nend\n",
        RubyReader
      )
    ),
    [
      { ccn: 2, endLine: 6, name: "self.run", nloc: 5, parameterCount: 2, startLine: 2 },
      { ccn: 1, endLine: 10, name: "'runs'", nloc: 3, parameterCount: 0, startLine: 8 }
    ]
  );
  assert.deepEqual(
    [...LuaReader.generateTokens("a --this is a comment\n")],
    ["a", " ", "--this is a comment", "\n"]
  );
  assert.deepEqual(
    measurements(
      analyze(
        "nested.lua",
        "function addn(x)\n  function sum(y)\n    return x+y\n  end\n  return sum\nend\n",
        LuaReader
      )
    ),
    [
      { ccn: 1, endLine: 4, name: "sum", nloc: 3, parameterCount: 1, startLine: 2 },
      { ccn: 1, endLine: 6, name: "addn", nloc: 4, parameterCount: 1, startLine: 1 }
    ]
  );
});

test("Perl source groups preserve prototypes, attributes, nested calls, and anonymous declarations", () => {
  assert.deepEqual(
    measurements(
      analyze(
        "source.pl",
        "package Sample;\nsub declared : Attr($) {\n  my $callback = sub { return 1; };\n  return $callback ? 1 : 0;\n}\nsub forward;\n",
        PerlReader
      )
    ),
    [
      { ccn: 6, endLine: 5, name: "Sample::declared", nloc: 4, parameterCount: 0, startLine: 2 },
      { ccn: 1, endLine: 6, name: "Sample::forward", nloc: 1, parameterCount: 0, startLine: 6 }
    ]
  );
  assert.deepEqual(
    measurements(
      analyze(
        "calls.pl",
        "package Example;\nsub fetch($) { return 1; }\n$handler = sub { return 2; };\ncallback(sub { return 3; });\n",
        PerlReader
      )
    ),
    [
      { ccn: 1, endLine: 2, name: "Example::fetch", nloc: 1, parameterCount: 0, startLine: 2 },
      { ccn: 1, endLine: 3, name: "Example::$handler", nloc: 1, parameterCount: 0, startLine: 3 },
      { ccn: 1, endLine: 4, name: "Example::<anonymous>", nloc: 1, parameterCount: 0, startLine: 4 }
    ]
  );
});

test("R source groups preserve left and right assignment, aliases, nesting, and logical complexity", () => {
  assert.deepEqual(
    [...RReader.generateTokens("x <- y -> z %in% items ::: :: ...")],
    [
      "x",
      " ",
      "<-",
      " ",
      "y",
      " ",
      "->",
      " ",
      "z",
      " ",
      "%in%",
      " ",
      "items",
      " ",
      ":::",
      " ",
      "::",
      " ",
      "..."
    ]
  );
  assert.deepEqual(
    measurements(
      analyze(
        "assignments.r",
        "simple_func <- function(x, y = 5) {\n  if (x > 0 && y > 0 || x & y) x else y\n}\nfunction(x) { if (x) x } -> right_func\n",
        RReader
      )
    ),
    [
      { ccn: 5, endLine: 4, name: "simple_func", nloc: 4, parameterCount: 2, startLine: 1 },
      { ccn: 2, endLine: 4, name: "right_func", nloc: 1, parameterCount: 1, startLine: 4 }
    ]
  );
  assert.deepEqual(
    measurements(
      analyze(
        "nested-aliases.r",
        "a <- b <- function(value) {\n  inner <- function(other) { if (other) other else 0 }\n  for (item in value) item\n}\n",
        RReader
      )
    ),
    [
      { ccn: 1, endLine: 2, name: "a", nloc: 2, parameterCount: 1, startLine: 1 },
      { ccn: 3, endLine: 3, name: "inner", nloc: 2, parameterCount: 1, startLine: 2 }
    ]
  );
});

const py: FunctionMeasurement = {
  ccn: 2,
  endLine: 4,
  name: "reader_sample",
  nloc: 4,
  parameterCount: 1,
  startLine: 1
};
const ruby: FunctionMeasurement = {
  ccn: 2,
  endLine: 6,
  name: "reader_sample",
  nloc: 6,
  parameterCount: 1,
  startLine: 1
};
const lua: FunctionMeasurement = {
  ccn: 2,
  endLine: 4,
  name: "reader_sample",
  nloc: 4,
  parameterCount: 1,
  startLine: 1
};
const perl: FunctionMeasurement = {
  ccn: 2,
  endLine: 1,
  name: "reader_sample",
  nloc: 1,
  parameterCount: 0,
  startLine: 1
};
const r: FunctionMeasurement = {
  ccn: 2,
  endLine: 1,
  name: "reader_sample",
  nloc: 1,
  parameterCount: 1,
  startLine: 1
};

function readFixture<Reader extends ReaderConstructor>(
  directory: string,
  name: string,
  Reader: Reader
): readonly FunctionMeasurement[] {
  const path = resolve(fixtureRoot, directory, name);
  return measurements(analyze(path, readFileSync(path, "utf8"), Reader));
}

function analyze<Reader extends ReaderConstructor>(
  filename: string,
  sourceCode: string,
  Reader: Reader
): readonly FunctionInfo[] {
  return analyzeSourceCode(filename, sourceCode, Reader).functionList;
}

function measurements(functions: readonly FunctionInfo[]): readonly FunctionMeasurement[] {
  return functions.map((functionInfo) => ({
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
