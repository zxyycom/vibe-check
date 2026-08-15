/**
 * scc 仓库/文件级指标 wrapper。
 *
 * 封装 scc 调用，统一输出仓库体量、语言占比、文件总行数/代码行数、文件级 decision-token count、
 * 路径和排序。
 */

import { runProcessSync } from "../../../foundation/index.ts";
import type { FileScannerDependency } from "../../../scanner-dependencies/index.ts";
import { parseSccCSV, type SccScanResult } from "./scc/parser.ts";

export { SCC_VERSION, SCC_VERSION_OUTPUT, SCC_BY_FILE_CSV_HEADER, parseSccCSV } from "./scc/parser.ts";

interface ScanWithSccOptions {
  cwd: string;
  dependency: FileScannerDependency;
  excludeDirs: readonly string[];
  includePaths: readonly string[];
}

export function scanWithScc({ cwd, dependency, includePaths, excludeDirs }: ScanWithSccOptions): SccScanResult {
  if (includePaths.length === 0) {
    return { ok: true, measurements: [], aggregates: { byLanguage: [] } };
  }

  const argv = buildSccArgs({ includePaths, excludeDirs, dependencyArgs: dependency.args });

  const child = runProcessSync(dependency.executable, argv, {
    cwd,
    timeout: 300_000
  });

  if (child.error) {
    return {
      ok: false,
      error: `scc process error: ${child.error.message}`,
      reason: "execution"
    };
  }

  if (child.status !== 0 && child.status !== null) {
    const stderr = (child.stderr || "").trim();
    const stdout = (child.stdout || "").trim();
    return {
      ok: false,
      error: `scc exit ${child.status}: ${stderr || stdout || "no output"}`,
      reason: "execution"
    };
  }

  const output = child.stdout || "";
  return parseSccCSV(output, cwd);
}

export function buildSccArgs({
  includePaths,
  excludeDirs,
  dependencyArgs
}: {
  dependencyArgs: readonly string[];
  excludeDirs: readonly string[];
  includePaths: readonly string[];
}): string[] {
  const excludeArgs = excludeDirs.flatMap((d) => ["--exclude-dir", d]);
  return [...dependencyArgs, "--by-file", "--format", "csv", ...excludeArgs, ...includePaths];
}
