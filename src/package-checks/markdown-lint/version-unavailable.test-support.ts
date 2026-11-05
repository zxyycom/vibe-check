import { isAbsolute } from "node:path";

const [mode, cacheDirectory] = process.argv.slice(2);
if (
  process.argv.length !== 4 ||
  (mode !== "throws" && mode !== "empty") ||
  cacheDirectory === undefined ||
  !isAbsolute(cacheDirectory)
) {
  throw new Error("usage: version-unavailable.test-support.ts <throws|empty> <absolute-cache>");
}

// Isolate the process-wide backend version observation from all other tests.
const bunTest = await import("bun:test");
const mock: unknown = Reflect.get(bunTest, "mock");
if (typeof mock !== "function") throw new Error("Bun mock unavailable");
const mockModule: unknown = Reflect.get(mock, "module");
if (typeof mockModule !== "function") throw new Error("Bun module mock unavailable");
Reflect.apply(mockModule, mock, [
  "markdownlint",
  () => ({
    getVersion: () => {
      if (mode === "throws") throw new Error("version unavailable");
      return "";
    }
  })
]);

const { lintMarkdownWithCache } = await import("./findings-cache.ts");
const input = {
  sourcePath: "source.md",
  sourceText: "#missing\n",
  rules: ["no-missing-space-atx"] as const,
  cache: { enabled: true, directory: cacheDirectory } as const,
  signal: new AbortController().signal
};
const first = await lintMarkdownWithCache(input);
const second = await lintMarkdownWithCache(input);
process.stdout.write(JSON.stringify({ first, second }));
