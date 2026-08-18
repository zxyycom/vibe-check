import { runBunPackage, runMain } from "./command.ts";

type TypecheckScope = "foundation" | "product" | "scripts";

const tsconfigPath: Readonly<Record<TypecheckScope, string>> = {
  foundation: "scripts/tools/foundation/tsconfig.json",
  product: "tsconfig.product.json",
  scripts: "tsconfig.json"
};

function isTypecheckScope(value: string): value is TypecheckScope {
  return Object.hasOwn(tsconfigPath, value);
}

function parseTypecheckScopes(argv: readonly string[]): readonly TypecheckScope[] {
  if (argv.length === 0) return ["product", "scripts"];
  const [scope] = argv;
  if (argv.length !== 1 || !scope || !isTypecheckScope(scope)) {
    throw new Error("usage: bun scripts/development/typecheck.ts [product|scripts|foundation]");
  }
  return [scope];
}

runMain(() => {
  for (const scope of parseTypecheckScopes(process.argv.slice(2))) {
    runBunPackage("tsgo", ["-p", tsconfigPath[scope]]);
  }
});
