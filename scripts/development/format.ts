import {
  bunPackageInvocation,
  reportProcessOutput,
  runProcessInvocationSync,
  runMain,
  type ProcessInvocation
} from "../process-execution/command.ts";
import { workspaceFormatTargets } from "./format-targets.ts";

export type FormatAction = "check" | "list-different" | "write";

export function workspaceFormatInvocation(action: FormatAction): ProcessInvocation {
  return bunPackageInvocation("oxfmt", [formatCommandOption(action), ...workspaceFormatTargets]);
}

function formatCommandOption(action: FormatAction): "--check" | "--list-different" | "--write" {
  if (action === "check") return "--check";
  if (action === "list-different") return "--list-different";
  return "--write";
}

function parseFormatInvocation(argv: readonly string[]): FormatAction {
  if (argv.length === 0) return "write";
  if (argv.length === 1 && argv[0] === "check") return "check";
  throw new Error("usage: bun scripts/development/format.ts [check]");
}

if (import.meta.main) {
  runMain(() =>
    runProcessInvocationSync(
      workspaceFormatInvocation(parseFormatInvocation(process.argv.slice(2))),
      {
        report: reportProcessOutput
      }
    )
  );
}
