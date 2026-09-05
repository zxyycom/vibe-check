/**
 * scc 文件级 code-line 指标 wrapper。
 *
 * 封装 adapter-owned CLI 调用，输出 exact-path code lines 与 decision-token count。
 */

import { errorMessage } from "../../host-environment/error-message.ts";
import { runProcessSync } from "../../host-environment/process.ts";
import type { ResolvedFileMetricsScannerOptions } from "../options.ts";
import { parseSccCSV, type SccScanResult } from "./parser.ts";

const SCC_BY_FILE_ARGUMENTS = Object.freeze(["--no-config", "--by-file", "--format", "csv"]);
const SCC_SCAN_TIMEOUT_MS = 300_000;

interface ScanWithSccOptions {
  readonly cwd: string;
  readonly includePaths: readonly string[];
  readonly scanner: ResolvedFileMetricsScannerOptions;
}

export function scanWithScc({ cwd, includePaths, scanner }: ScanWithSccOptions): SccScanResult {
  try {
    if (includePaths.length === 0) return { ok: true, measurements: [] };

    const scanArguments = buildSccArgs(includePaths);

    const commandResult = runProcessSync({
      args: scanArguments,
      command: scanner.executable,
      cwd,
      timeout: SCC_SCAN_TIMEOUT_MS
    });

    if (commandResult.error) {
      return {
        ok: false,
        error: `scc process error: ${commandResult.error.message}`,
        reason: "execution"
      };
    }

    if (commandResult.status !== 0) {
      const stderr = (commandResult.stderr || "").trim();
      const stdout = (commandResult.stdout || "").trim();
      const termination =
        commandResult.status === null
          ? `signal ${commandResult.signal ?? "unknown"}`
          : `exit ${commandResult.status}`;
      return {
        ok: false,
        error: `scc ${termination}: ${stderr || stdout || "no output"}`,
        reason: "execution"
      };
    }

    return parseSccCSV(commandResult.stdout || "", cwd);
  } catch (error: unknown) {
    return {
      ok: false,
      error: `scc adapter error: ${errorMessage(error)}`,
      reason: "execution"
    };
  }
}

function buildSccArgs(includePaths: readonly string[]): string[] {
  return [...SCC_BY_FILE_ARGUMENTS, ...includePaths];
}
