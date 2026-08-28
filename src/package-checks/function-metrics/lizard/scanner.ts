/**
 * Lizard 函数级指标 wrapper。
 *
 * 封装 Lizard 调用，统一输出函数名称、所属文件、函数行数、参数数量、
 * 圈复杂度、路径和排序。
 */

import { errorMessage } from "../../host-environment/error-message.ts";
import { runProcessSync } from "../../host-environment/process/command.ts";
import type { ResolvedFunctionMetricsScannerOptions } from "../options.ts";
import { parseLizardCSV, type LizardScanResult } from "./parser.ts";

export { parseLizardCSV } from "./parser.ts";

interface ScanWithLizardOptions {
  readonly cwd: string;
  readonly dependency: ResolvedFunctionMetricsScannerOptions;
  readonly files: readonly string[];
}

export function scanWithLizard({
  files,
  cwd,
  dependency
}: ScanWithLizardOptions): LizardScanResult {
  try {
    if (files.length === 0) return { ok: true, measurements: [] };

    const child = runProcessSync({
      args: [...files, "--csv"],
      command: dependency.executable,
      cwd,
      timeout: 300_000
    });

    if (child.error) {
      return {
        ok: false,
        error: `lizard process error: ${child.error.message}`,
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
        error: `lizard ${termination}: ${stderr || stdout || "no output"}`,
        reason: "execution"
      };
    }

    return parseLizardCSV(child.stdout || "", cwd);
  } catch (error: unknown) {
    return {
      ok: false,
      error: `lizard adapter error: ${errorMessage(error)}`,
      reason: "execution"
    };
  }
}
