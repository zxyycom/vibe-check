import {
  bunPackageInvocation,
  reportProcessOutput,
  runProcessInvocationSync,
  runMain,
  type ProcessInvocation
} from "../process-execution/command.ts";

export type TypecheckScope = "product" | "scripts";

const tsconfigPath: Readonly<Record<TypecheckScope, string>> = {
  product: "tsconfig.product.json",
  scripts: "tsconfig.json"
};

export function typecheckInvocation(scope: TypecheckScope): ProcessInvocation {
  return bunPackageInvocation("tsgo", ["-p", tsconfigPath[scope]]);
}

function isTypecheckScope(value: string): value is TypecheckScope {
  return Object.hasOwn(tsconfigPath, value);
}

function parseTypecheckScopes(argv: readonly string[]): readonly TypecheckScope[] {
  if (argv.length === 0) return ["product", "scripts"];
  const [scope] = argv;
  if (argv.length !== 1 || !scope || !isTypecheckScope(scope)) {
    throw new Error("usage: bun scripts/development/typecheck.ts [product|scripts]");
  }
  return [scope];
}

if (import.meta.main) {
  runMain(() => {
    for (const scope of parseTypecheckScopes(process.argv.slice(2))) {
      runProcessInvocationSync(typecheckInvocation(scope), { report: reportProcessOutput });
    }
  });
}
