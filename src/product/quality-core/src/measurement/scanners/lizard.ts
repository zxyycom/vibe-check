/**
 * Lizard 函数级指标 wrapper。
 *
 * 封装 Lizard 调用，统一输出函数名称、所属文件、函数行数、参数数量、
 * 圈复杂度、路径和排序。
 */

import { runProcessSync } from "../../../../foundation/src/index.ts";
import type { FunctionScannerDependency } from "../../../../scanner-dependencies.ts";
import { parseLizardCSV, type LizardScanResult } from "./lizard/parser.ts";

export { parseLizardCSV } from "./lizard/parser.ts";

interface ScanWithLizardOptions {
  cwd: string;
  dependency: FunctionScannerDependency;
  files: readonly string[];
}

export function scanWithLizard({ files, cwd, dependency }: ScanWithLizardOptions): LizardScanResult {
  if (files.length === 0) {
    return { ok: true, measurements: [] };
  }

  const argv = [...dependency.args, ...files, "--csv"];

  const child = runProcessSync(dependency.executable, argv, {
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

  if (child.status !== 0 && child.status !== null) {
    const stderr = (child.stderr || "").trim();
    return {
      ok: false,
      error: `lizard exit ${child.status}: ${stderr || "command succeeded but returned non-zero"}`,
      reason: "execution"
    };
  }

  const output = child.stdout || "";
  return parseLizardCSV(output, cwd);
}
