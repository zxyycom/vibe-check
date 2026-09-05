/**
 * jscpd duplicate-code detection wrapper.
 *
 * Runs the Check-owned jscpd CLI, writes a temporary config for the
 * approved exact-scope file list, and normalizes the JSON report behind the
 * repository-owned DuplicateCodeFragment model.
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { errorMessage } from "../../host-environment/error-message.ts";
import { runProcess, runProcessSync, type ProcessResult } from "../../host-environment/process.ts";
import type { ResolvedDuplicateDetectionScannerOptions } from "../options.ts";
import { resolveJscpdCommand, type JscpdCommand } from "./command-resolution.ts";
import { parseJscpdJsonReport } from "./json-report.ts";
import type { JscpdScanResult } from "./scanner-contract.ts";

export type { JscpdScanResult } from "./scanner-contract.ts";
export { parseJscpdJsonReport } from "./json-report.ts";

const JSCPD_REPORT_FILE = "jscpd-report.json";
const JSCPD_PROCESS_MAX_BUFFER = 1024 * 1024 * 64;
const JSCPD_PROCESS_TIMEOUT_MS = 600_000;

export function parseJscpdVersionOutput(output: string): string | null {
  const match = output.trim().match(/(?:jscpd|cpd)\s+([^\s]+)/i);
  return match?.[1] ?? null;
}

interface ScanWithJscpdOptions {
  readonly cwd: string;
  readonly dependency: ResolvedDuplicateDetectionScannerOptions;
  readonly files: readonly string[];
  readonly minimumLines: number;
  readonly minimumTokens: number;
}

type PreparedJscpdInvocation = Readonly<{
  readonly argv: readonly string[];
  readonly configPath: string;
  readonly outputDir: string;
  readonly tempDir: string;
}>;

type PreparedJscpdScan =
  | Readonly<{
      readonly cwd: string;
      readonly dependency: JscpdCommand;
      readonly invocation: PreparedJscpdInvocation;
      readonly ok: true;
    }>
  | Readonly<{ readonly ok: false; readonly result: JscpdScanResult }>;

export function scanWithJscpd(options: ScanWithJscpdOptions): JscpdScanResult {
  try {
    const scan = prepareJscpdScan(options);
    if (!scan.ok) return scan.result;

    try {
      const child = runProcessSync({
        args: scan.invocation.argv,
        command: scan.dependency.executable,
        cwd: scan.cwd,
        encoding: "utf8",
        windowsHide: true,
        maxBuffer: JSCPD_PROCESS_MAX_BUFFER,
        timeout: JSCPD_PROCESS_TIMEOUT_MS
      });

      return handleJscpdProcessResult({ child, cwd: scan.cwd, invocation: scan.invocation });
    } finally {
      cleanupTempDir(scan.invocation.tempDir);
    }
  } catch (error: unknown) {
    return jscpdAdapterError(error);
  }
}

export async function scanWithJscpdAsync(options: ScanWithJscpdOptions): Promise<JscpdScanResult> {
  try {
    const scan = prepareJscpdScan(options);
    if (!scan.ok) return scan.result;

    try {
      const child = await runProcess({
        args: scan.invocation.argv,
        command: scan.dependency.executable,
        cwd: scan.cwd,
        label: "jscpd",
        maxBuffer: JSCPD_PROCESS_MAX_BUFFER,
        timeout: JSCPD_PROCESS_TIMEOUT_MS,
        windowsHide: true
      });

      return handleJscpdProcessResult({ child, cwd: scan.cwd, invocation: scan.invocation });
    } finally {
      cleanupTempDir(scan.invocation.tempDir);
    }
  } catch (error: unknown) {
    return jscpdAdapterError(error);
  }
}

function prepareJscpdScan(options: ScanWithJscpdOptions): PreparedJscpdScan {
  const { files, cwd, dependency, minimumLines, minimumTokens } = options;

  if (files.length < 2) {
    return { ok: false, result: { ok: true, measurements: [] } };
  }

  const resolved = resolveJscpdCommand(dependency.command);
  if (resolved.kind === "unavailable") {
    return {
      ok: false,
      result: {
        error: resolved.error,
        ok: false,
        reason: "jscpd-execution-error"
      }
    };
  }

  return {
    ok: true,
    cwd,
    dependency: resolved.command,
    invocation: prepareJscpdInvocation({
      cwd,
      scanPrefixArguments: resolved.command.scanPrefixArguments,
      files,
      minimumLines,
      minimumTokens
    })
  };
}

function prepareJscpdInvocation({
  cwd,
  scanPrefixArguments,
  files,
  minimumLines,
  minimumTokens
}: {
  readonly cwd: string;
  readonly scanPrefixArguments: readonly string[];
  readonly files: readonly string[];
  readonly minimumLines: number;
  readonly minimumTokens: number;
}): PreparedJscpdInvocation {
  const tempDir = mkdtempSync(join(tmpdir(), "quality-jscpd-"));
  const outputDir = join(tempDir, "report");
  const configPath = join(tempDir, ".jscpd.json");
  const config = {
    path: files.map((path) => resolve(cwd, path)),
    reporters: ["json"],
    minTokens: minimumTokens,
    minLines: minimumLines,
    absolute: true,
    silent: true,
    noTips: true
  };

  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  return {
    tempDir,
    outputDir,
    configPath,
    argv: [...scanPrefixArguments, "--config", configPath, "--output", outputDir]
  };
}

function handleJscpdProcessResult({
  child,
  cwd,
  invocation
}: {
  readonly child: ProcessResult;
  readonly cwd: string;
  readonly invocation: PreparedJscpdInvocation;
}): JscpdScanResult {
  if (child.error) {
    return jscpdProcessError(child.error);
  }

  if (child.status !== 0) {
    return jscpdExecutionFailure(
      child.status,
      child.signal,
      trimmedProcessOutput(child.stderr, child.stdout)
    );
  }

  return parseJscpdReportFile(join(invocation.outputDir, JSCPD_REPORT_FILE), cwd);
}

function parseJscpdReportFile(reportPath: string, cwd: string): JscpdScanResult {
  let json: string;
  try {
    json = readFileSync(reportPath, "utf8");
  } catch (error: unknown) {
    return {
      ok: false,
      error: `jscpd JSON report missing: ${errorMessage(error)}`,
      reason: "jscpd-report-failure"
    };
  }

  if (!json.trim()) {
    return {
      ok: false,
      error: "jscpd JSON report is empty",
      reason: "jscpd-report-failure"
    };
  }

  return parseJscpdJsonReport(json, cwd);
}

function jscpdProcessError(error: Error): JscpdScanResult {
  return {
    ok: false,
    error: `jscpd process error: ${error.message}`,
    reason: "jscpd-execution-error"
  };
}

function jscpdAdapterError(error: unknown): JscpdScanResult {
  return {
    ok: false,
    error: `jscpd adapter error: ${errorMessage(error)}`,
    reason: "jscpd-execution-error"
  };
}

function jscpdExecutionFailure(
  status: number | null,
  signal: NodeJS.Signals | null,
  output: string
): JscpdScanResult {
  const termination = status === null ? `signal ${signal ?? "unknown"}` : `exit ${status}`;
  return {
    ok: false,
    error: `jscpd ${termination}: ${output}`,
    reason: "jscpd-execution-error"
  };
}

function trimmedProcessOutput(stderr: string, stdout: string): string {
  return stderr.trim() || stdout.trim() || "no output";
}

function cleanupTempDir(path: string): void {
  rmSync(path, { recursive: true, force: true });
}
