import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  relativeEsmModuleSpecifiers,
  rewriteRelativeEsmModuleExtensions
} from "./esm-module-specifiers.ts";

describe("emitted ESM module specifiers", () => {
  it("rewrites relative module references without changing ordinary path strings", () => {
    const source = [
      'const ordinaryPath = "./ordinary.js";',
      'import "./side-effect.js";',
      'export { value } from "../re-export.js";',
      'const loaded = import("./dynamic.js");'
    ].join("\n");
    const rewritten = rewriteRelativeEsmModuleExtensions({ fileName: "fixture.mjs", source });

    assert.match(rewritten, /ordinaryPath = "\.\/ordinary\.js"/);
    assert.match(rewritten, /import "\.\/side-effect\.mjs"/);
    assert.match(rewritten, /from "\.\.\/re-export\.mjs"/);
    assert.match(rewritten, /import\("\.\/dynamic\.mjs"\)/);
    assert.deepEqual(relativeEsmModuleSpecifiers({ fileName: "fixture.mjs", source: rewritten }), [
      "./side-effect.mjs",
      "../re-export.mjs",
      "./dynamic.mjs"
    ]);
  });

  it("rejects malformed emitted JavaScript before artifact normalization", () => {
    assert.throws(
      () =>
        relativeEsmModuleSpecifiers({
          fileName: "malformed.mjs",
          source: 'import "./unfinished.js'
        }),
      /could not parse emitted ESM module malformed\.mjs/
    );
  });
});
