/**
 * Derived from terryyin/lizard 1.23.0 tests.
 * Source: lizard_languages/js_style_regex_expression.py.
 * Upstream revision: 06284ec87c1966fee4ddbf3f068ccf89b987b0f8.
 * SPDX-License-Identifier: MIT
 * Modified: direct tokenizer-wrapper regression coverage.
 */

import { strict as assert } from "node:assert";
import test from "node:test";

import { js_style_regex_expression } from "./js-style-regex.ts";

test("JavaScript-style regex joining only accepts a match anchored at the combined token start", () => {
  const generateTokens = js_style_regex_expression(function* (): Generator<string> {
    yield "/";
    yield " ";
    yield "/foo/";
    yield "tail";
  });

  assert.deepEqual([...generateTokens("")], ["/", " ", "/foo/"]);
});
