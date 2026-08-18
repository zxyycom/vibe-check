import { runBunPackage, runMain } from "./command.ts";

type LintScope = "foundation" | "product" | "scripts";

const lintPaths: Readonly<Record<LintScope, readonly string[]>> = {
  foundation: ["scripts/tools/foundation/src", "scripts/tools/foundation/test"],
  product: ["src/product"],
  scripts: ["scripts"]
};

function isLintScope(value: string): value is LintScope {
  return Object.hasOwn(lintPaths, value);
}

function parseLintScopes(argv: readonly string[]): readonly LintScope[] {
  if (argv.length === 0) return ["product", "scripts"];
  const [scope] = argv;
  if (argv.length !== 1 || !scope || !isLintScope(scope)) {
    throw new Error("usage: bun scripts/development/lint.ts [product|scripts|foundation]");
  }
  return [scope];
}

runMain(() => {
  for (const scope of parseLintScopes(process.argv.slice(2))) {
    runBunPackage("oxlint", ["--deny-warnings", ...lintPaths[scope]]);
  }
});
