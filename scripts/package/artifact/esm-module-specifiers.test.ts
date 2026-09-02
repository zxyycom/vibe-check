import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  relativeEsmModuleSpecifiers,
  rewriteFunctionMetricsWorkerUrl,
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

    const workerSource = [
      'const worker = new URL("./analyzer-worker.ts", import.meta.url).href;',
      'const unrelatedUrl = new URL("./not-a-worker.ts", import.meta.url).href;',
      'const ordinaryWorkerPath = "./analyzer-worker.ts";'
    ].join("\n");
    const rewrittenWorker = rewriteFunctionMetricsWorkerUrl({
      fileName: "measurement.js",
      source: workerSource
    });
    assert.match(rewrittenWorker, /new URL\("\.\/analyzer-worker\.mjs", import\.meta\.url\)\.href/);
    assert.match(rewrittenWorker, /new URL\("\.\/not-a-worker\.ts", import\.meta\.url\)\.href/);
    assert.match(rewrittenWorker, /ordinaryWorkerPath = "\.\/analyzer-worker\.ts"/);
    assert.throws(
      () => rewriteFunctionMetricsWorkerUrl({ fileName: "measurement.js", source: "export {};" }),
      /must occur exactly once.*received 0/u
    );
    assert.throws(
      () =>
        rewriteFunctionMetricsWorkerUrl({
          fileName: "measurement.js",
          source: `${workerSource}\n${workerSource}`
        }),
      /must occur exactly once.*received 2/u
    );
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
