import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  reportProcessOutput,
  runProcessInvocationSync,
  runMain,
  type ProcessInvocation
} from "../process-execution/command.ts";
import { nativeTypeScriptBinPath } from "../package/compiler-toolchain.ts";

export type TypecheckScope = "product" | "scripts";

const tsconfigPath: Readonly<Record<TypecheckScope, string>> = {
  product: "tsconfig.product.json",
  scripts: "tsconfig.json"
};

export function typecheckInvocation(scope: TypecheckScope): ProcessInvocation {
  return {
    command: process.execPath,
    args: [nativeTypeScriptBinPath(), "-p", tsconfigPath[scope]],
    cwd: resolve(dirname(fileURLToPath(import.meta.url)), "../..")
  };
}

function isTypecheckScope(value: string): value is TypecheckScope {
  return Object.hasOwn(tsconfigPath, value);
}

function parseTypecheckScopes(argv: readonly string[]): readonly TypecheckScope[] {
  if (argv.length === 0) return ["product", "scripts"];
  const [scope] = argv;
  if (argv.length !== 1 || scope === undefined || scope === "" || !isTypecheckScope(scope)) {
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
