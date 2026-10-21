import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import { isAbsolute, join } from "node:path";

// Reproduce the observed mixed-core graph's public response without altering shared dependencies.
// The mock is isolated in this child, never installed in the parent test runner.
const [root, cacheDirectory] = process.argv.slice(2);
if (
  process.argv.length !== 4 ||
  root === undefined ||
  cacheDirectory === undefined ||
  !isAbsolute(root) ||
  !isAbsolute(cacheDirectory)
) {
  throw new Error("usage: reference-capability.test-support.ts <absolute-root> <absolute-cache>");
}
for (const directory of [root, cacheDirectory]) {
  assert.equal(
    statSync(directory).isDirectory(),
    true,
    `fixture path is not a directory: ${directory}`
  );
}
const bunTest = await import("bun:test");
// The project uses Node test declarations; validate Bun's runtime-only module-mock seam explicitly.
const mock: unknown = Reflect.get(bunTest, "mock");
if (typeof mock !== "function") throw new Error("Bun mock unavailable");
const mockModule: unknown = Reflect.get(mock, "module");
if (typeof mockModule !== "function") throw new Error("Bun module mock unavailable");
let calls = 0;
Reflect.apply(mockModule, mock, [
  "markdownlint/promise",
  () => ({
    lint: async (options: unknown) => {
      if (typeof options !== "object" || options === null || !("strings" in options)) {
        throw new TypeError("mock lint expected strings options");
      }
      const { strings } = options;
      if (typeof strings !== "object" || strings === null || Array.isArray(strings)) {
        throw new TypeError("mock lint expected a strings record");
      }
      assert.equal(
        Object.values(strings).every((source) => typeof source === "string"),
        true
      );
      calls++;
      return Object.fromEntries(Object.keys(strings).map((path) => [path, []]));
    }
  })
]);

const { lintMarkdownString } = await import("./adapter.ts");
const { lintMarkdownWithCache } = await import("./findings-cache.ts");
const { executeMarkdownLint } = await import("./execution.ts");
const { markdownLint } = await import("./constructor.ts");
const { executeMarkdownLintCheck } = await import("./markdown-lint.test-support.ts");
const rules = ["reference-links-images"] as const;
const sourceText = "[full][missing-full]\n[collapsed][]\n![image][missing-image]\n";

assert.deepEqual(await lintMarkdownString("plain.md", "# Good\n", ["no-missing-space-atx"]), []);
assert.equal(calls, 1, "non-reference rules must not trigger the capability probe");
assert.deepEqual(
  await Promise.all([
    lintMarkdownString("references.md", sourceText, rules),
    lintMarkdownString("again.md", sourceText, rules)
  ]),
  ["backend-failed", "backend-failed"]
);
assert.deepEqual(
  await lintMarkdownString("still-plain.md", "# Good\n", ["no-missing-space-atx"]),
  []
);
const input = {
  sourcePath: "references.md",
  sourceText,
  rules,
  signal: new AbortController().signal
};
assert.equal(
  await lintMarkdownWithCache({
    ...input,
    cache: { enabled: true, directory: cacheDirectory }
  }),
  "backend-failed",
  "a valid warm cache must not bypass the current backend capability"
);
const coldDirectory = join(root, "cold-reference-cache");
assert.equal(
  await lintMarkdownWithCache({
    ...input,
    cache: { enabled: true, directory: coldDirectory }
  }),
  "backend-failed"
);
assert.equal(existsSync(coldDirectory), false);
const result = await executeMarkdownLintCheck(
  executeMarkdownLint,
  markdownLint({ rules, cache: { enabled: true, directory: cacheDirectory } }).options,
  root
);
assert.equal(result.result.status, "unavailable");
assert.deepEqual(result.result.reason, { code: "backend-failed" });
assert.deepEqual(result.records, []);
assert.equal(calls, 3, "two non-reference calls and one shared capability probe are sufficient");
console.log(JSON.stringify({ calls }));
