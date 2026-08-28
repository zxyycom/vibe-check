/**
 * scc 文件级 code-line 指标 wrapper。
 *
 * 封装 adapter-owned CLI 调用，输出 exact-path code lines 与 decision-token count。
 */

import { errorMessage } from "../../host-environment/error-message.ts";
import { runProcessSync } from "../../host-environment/process/command.ts";
import type { ResolvedFileMetricsScannerOptions } from "../options.ts";
import { parseSccCSV, type SccScanResult } from "./parser.ts";

export { SCC_VERSION, SCC_VERSION_OUTPUT, SCC_BY_FILE_CSV_HEADER, parseSccCSV } from "./parser.ts";

interface ScanWithSccOptions {
  readonly cwd: string;
  readonly dependency: ResolvedFileMetricsScannerOptions;
  readonly includePaths: readonly string[];
}

export function scanWithScc({ cwd, dependency, includePaths }: ScanWithSccOptions): SccScanResult {
  try {
    if (includePaths.length === 0) return { ok: true, measurements: [] };

    const argv = buildSccArgs(includePaths);

    const child = runProcessSync({
      args: argv,
      command: dependency.executable,
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

    if (child.status !== 0) {
      const stderr = (child.stderr || "").trim();
      const stdout = (child.stdout || "").trim();
      const termination =
        child.status === null ? `signal ${child.signal ?? "unknown"}` : `exit ${child.status}`;
      return {
        ok: false,
        error: `scc ${termination}: ${stderr || stdout || "no output"}`,
        reason: "execution"
      };
    }

    return parseSccCSV(child.stdout || "", cwd);
  } catch (error: unknown) {
    return {
      ok: false,
      error: `scc adapter error: ${errorMessage(error)}`,
      reason: "execution"
    };
  }
}

export function buildSccArgs(includePaths: readonly string[]): string[] {
  return ["--by-file", "--format", "csv", ...includePaths];
}
