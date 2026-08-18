import { runBunPackage, runMain } from "./command.ts";
import { foundationFormatTargets, workspaceFormatTargets } from "./format-targets.ts";

type FormatAction = "check" | "write";
type FormatScope = "foundation" | "workspace";

function parseFormatInvocation(argv: readonly string[]): readonly [FormatScope, FormatAction] {
  if (argv.length === 0) return ["workspace", "write"];
  if (argv.length === 1 && argv[0] === "check") return ["workspace", "check"];
  if (argv.length === 1 && argv[0] === "foundation") return ["foundation", "write"];
  if (argv.length === 2 && argv[0] === "foundation" && argv[1] === "check") {
    return ["foundation", "check"];
  }
  throw new Error("usage: bun scripts/development/format.ts [foundation] [check]");
}

function formatTargets(scope: FormatScope): readonly string[] {
  return scope === "foundation" ? foundationFormatTargets : workspaceFormatTargets;
}

runMain(() => {
  const [scope, action] = parseFormatInvocation(process.argv.slice(2));
  runBunPackage("oxfmt", [action === "check" ? "--check" : "--write", ...formatTargets(scope)]);
});
