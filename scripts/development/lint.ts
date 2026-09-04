import {
  bunPackageInvocation,
  reportProcessOutput,
  runProcessInvocationSync,
  runMain,
  type ProcessInvocation
} from "../process-execution/command.ts";
import { GENERATED_FUNCTION_METRICS_ANALYZER_FIXTURES } from "./format-targets.ts";

export type LintScope = "product" | "scripts";
export type LintOutputFormat = "default" | "json";

const lintPaths: Readonly<Record<LintScope, readonly string[]>> = {
  product: ["src"],
  scripts: ["scripts"]
};

export function lintInvocation(
  scope: LintScope,
  outputFormat: LintOutputFormat = "default"
): ProcessInvocation {
  const exclusions =
    scope === "product" ? [`--ignore-pattern=${GENERATED_FUNCTION_METRICS_ANALYZER_FIXTURES}`] : [];
  return bunPackageInvocation("oxlint", [
    "--deny-warnings",
    ...(outputFormat === "json" ? ["--format=json"] : []),
    ...exclusions,
    ...lintPaths[scope]
  ]);
}

function isLintScope(value: string): value is LintScope {
  return Object.hasOwn(lintPaths, value);
}

function parseLintScopes(argv: readonly string[]): readonly LintScope[] {
  if (argv.length === 0) return ["product", "scripts"];
  const [scope] = argv;
  if (argv.length !== 1 || !scope || !isLintScope(scope)) {
    throw new Error("usage: bun scripts/development/lint.ts [product|scripts]");
  }
  return [scope];
}

if (import.meta.main) {
  runMain(() => {
    for (const scope of parseLintScopes(process.argv.slice(2))) {
      runProcessInvocationSync(lintInvocation(scope), { report: reportProcessOutput });
    }
  });
}
