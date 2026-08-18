import { runBun, runMain } from "./command.ts";

type TestScope = "foundation" | "product";

const testRoot: Readonly<Record<TestScope, string>> = {
  foundation: "scripts/tools/foundation/test",
  product: "src/product"
};

function isTestScope(value: string): value is TestScope {
  return Object.hasOwn(testRoot, value);
}

function parseTestScope(argv: readonly string[]): TestScope {
  if (argv.length === 0) return "product";
  const [scope] = argv;
  if (argv.length === 1 && scope && isTestScope(scope)) return scope;
  throw new Error("usage: bun scripts/development/test.ts [product|foundation]");
}

runMain(() => {
  runBun(["test", testRoot[parseTestScope(process.argv.slice(2))]]);
});
