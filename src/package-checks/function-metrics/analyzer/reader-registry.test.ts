/**
 * Derived from terryyin/lizard 1.23.0 tests.
 * Source: lizard_languages/__init__.py.
 * Upstream revision: 06284ec87c1966fee4ddbf3f068ccf89b987b0f8.
 * SPDX-License-Identifier: MIT
 * Modified: ordered reader registration and suffix dispatch parity coverage.
 */

import { strict as assert } from "node:assert";
import test from "node:test";

import { getReaderFor, languages } from "./reader-registry.ts";

test("reader registry retains the 27-reader Lizard source order", () => {
  assert.deepEqual(
    languages().map((reader) => reader.name),
    [
      "CLikeReader",
      "JavaReader",
      "CSharpReader",
      "JavaScriptReader",
      "PythonReader",
      "ObjCReader",
      "TTCNReader",
      "RubyReader",
      "PHPReader",
      "SwiftReader",
      "ScalaReader",
      "GDScriptReader",
      "GoReader",
      "LuaReader",
      "RustReader",
      "TypeScriptReader",
      "FortranReader",
      "KotlinReader",
      "SolidityReader",
      "ErlangReader",
      "ZigReader",
      "TSXReader",
      "VueReader",
      "PerlReader",
      "StReader",
      "RReader",
      "PLSQLReader"
    ]
  );
});

test("reader registry dispatches every canonical suffix case-insensitively and leaves unknown suffixes unsupported", () => {
  const canonicalDispatch = new Map<string, string>();
  for (const reader of languages()) {
    for (const suffix of reader.ext) canonicalDispatch.set(suffix.toLowerCase(), reader.name);
  }

  assert.deepEqual([...canonicalDispatch.entries()], expectedCanonicalDispatch);
  for (const [suffix, expectedReader] of expectedCanonicalDispatch) {
    assert.equal(getReaderFor(`source.${suffix}`)?.name, expectedReader);
    assert.equal(getReaderFor(`source.${suffix.toUpperCase()}`)?.name, expectedReader);
  }
  assert.equal(getReaderFor("source.unknown"), undefined);
  assert.equal(getReaderFor("source"), undefined);
});

test("reader registry merges R/r only at case-insensitive dispatch while retaining source reader metadata", () => {
  const rReader = languages().find((reader) => reader.name === "RReader");
  assert.deepEqual(rReader?.ext, ["r", "R"]);
  assert.equal(getReaderFor("source.r"), rReader);
  assert.equal(getReaderFor("source.R"), rReader);
});

const expectedCanonicalDispatch: readonly [string, string][] = [
  ["c", "CLikeReader"],
  ["cpp", "CLikeReader"],
  ["cc", "CLikeReader"],
  ["cxx", "CLikeReader"],
  ["h", "CLikeReader"],
  ["hpp", "CLikeReader"],
  ["java", "JavaReader"],
  ["cs", "CSharpReader"],
  ["js", "JavaScriptReader"],
  ["cjs", "JavaScriptReader"],
  ["mjs", "JavaScriptReader"],
  ["py", "PythonReader"],
  ["m", "ObjCReader"],
  ["mm", "ObjCReader"],
  ["ttcn", "TTCNReader"],
  ["ttcnpp", "TTCNReader"],
  ["rb", "RubyReader"],
  ["php", "PHPReader"],
  ["swift", "SwiftReader"],
  ["scala", "ScalaReader"],
  ["gd", "GDScriptReader"],
  ["go", "GoReader"],
  ["lua", "LuaReader"],
  ["rs", "RustReader"],
  ["ts", "TypeScriptReader"],
  ["f70", "FortranReader"],
  ["f90", "FortranReader"],
  ["f95", "FortranReader"],
  ["f03", "FortranReader"],
  ["f08", "FortranReader"],
  ["f", "FortranReader"],
  ["for", "FortranReader"],
  ["ftn", "FortranReader"],
  ["fpp", "FortranReader"],
  ["kt", "KotlinReader"],
  ["kts", "KotlinReader"],
  ["sol", "SolidityReader"],
  ["erl", "ErlangReader"],
  ["hrl", "ErlangReader"],
  ["es", "ErlangReader"],
  ["escript", "ErlangReader"],
  ["zig", "ZigReader"],
  ["tsx", "TSXReader"],
  ["jsx", "TSXReader"],
  ["vue", "VueReader"],
  ["pl", "PerlReader"],
  ["pm", "PerlReader"],
  ["st", "StReader"],
  ["r", "RReader"],
  ["sql", "PLSQLReader"],
  ["pks", "PLSQLReader"],
  ["pkb", "PLSQLReader"],
  ["pls", "PLSQLReader"],
  ["plb", "PLSQLReader"],
  ["pck", "PLSQLReader"]
];
