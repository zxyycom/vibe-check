/** 对 approved exact paths 执行 adapter-owned Lizard CSV 协议。 */

import { errorMessage } from "../../host-environment/error-message.ts";
import { runProcessSync } from "../../host-environment/process/command.ts";
import type { ResolvedFunctionMetricsScannerOptions } from "../options.ts";
import { parseLizardCSV, type LizardParseResult } from "./parser.ts";

export type LizardScanResult =
  | LizardParseResult
  | Readonly<{
      error: string;
      ok: false;
      reason: "execution";
    }>;

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

    if (child.signal !== null) {
      return failedLizardScan(
        `lizard signal ${child.signal}: ${(child.stderr || child.stdout || "no output").trim()}`
      );
    }
    if (child.error) {
      return failedLizardScan(`lizard process error: ${child.error.message}`);
    }

    if (child.status !== 0) {
      const stderr = (child.stderr || "").trim();
      const stdout = (child.stdout || "").trim();
      return failedLizardScan(
        `lizard ${child.status === null ? "invalid process state" : `exit ${child.status}`}: ${stderr || stdout || "no output"}`
      );
    }

    return parseLizardCSV(child.stdout || "", cwd);
  } catch (error: unknown) {
    return failedLizardScan(`lizard adapter error: ${errorMessage(error)}`);
  }
}

function failedLizardScan(error: string): LizardScanResult {
  return Object.freeze({ error, ok: false, reason: "execution" });
}
