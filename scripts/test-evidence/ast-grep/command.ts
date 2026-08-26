import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runProcess, type ProcessResult } from "../../process-execution/execution.ts";

export const AST_GREP_PACKAGE = "@ast-grep/cli";
export const AST_GREP_VERSION = "0.45.0";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

export type RunAstGrepOptions = {
  cancelSignal?: AbortSignal;
  cwd?: string;
  workspaceRoot?: string;
};

export type AstGrepInvocation = {
  readonly args: readonly string[];
  readonly command: string;
  readonly cwd: string;
  readonly label: string;
};

export function resolveAstGrepExecutable(root = workspaceRoot): string {
  const binaryName = process.platform === "win32" ? "ast-grep.exe" : "ast-grep";
  return path.join(root, "node_modules", AST_GREP_PACKAGE, binaryName);
}

export function astGrepInvocation(
  args: readonly string[],
  options: Omit<RunAstGrepOptions, "cancelSignal"> = {}
): AstGrepInvocation {
  const root = options.workspaceRoot ?? workspaceRoot;
  const executable = resolveAstGrepExecutable(root);
  if (!fs.existsSync(executable)) {
    throw new Error(
      `missing ${AST_GREP_PACKAGE}@${AST_GREP_VERSION}; run the repository dependency bootstrap`
    );
  }
  return {
    args,
    command: executable,
    cwd: options.cwd ?? root,
    label: `ast-grep ${args.join(" ")}`
  };
}

export function runAstGrep(
  args: readonly string[],
  options: RunAstGrepOptions = {}
): Promise<ProcessResult> {
  const invocation = astGrepInvocation(args, options);
  return runProcess({ ...invocation, cancelSignal: options.cancelSignal });
}

export function expectedAstGrepVersionLine(): string {
  return `ast-grep ${AST_GREP_VERSION}`;
}
