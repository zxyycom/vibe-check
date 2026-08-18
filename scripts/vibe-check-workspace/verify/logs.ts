import fs from "node:fs";
import path from "node:path";

import type { CheckResult } from "../results.ts";
import { formatDurationMs } from "../results.ts";
import { logDir, root } from "./paths.ts";

export function createLogPaths(): string[] {
  const timestamp = new Date().toISOString().replace(/[:]/g, "-");
  return [path.join(logDir, "latest.log"), path.join(logDir, `${timestamp}.log`)];
}

export function initializeLogs({
  leafChecks,
  logPaths,
  profile,
  totalChecks
}: {
  readonly leafChecks: number;
  readonly logPaths: readonly string[];
  readonly profile: string;
  readonly totalChecks: number;
}): void {
  fs.mkdirSync(logDir, { recursive: true });
  for (const logPath of logPaths) {
    fs.writeFileSync(
      logPath,
      [
        "vibe-check workspace verification",
        `started: ${new Date().toISOString()}`,
        `cwd: ${root}`,
        `profile: ${profile}`,
        `checks: ${totalChecks}`,
        `leaf checks: ${leafChecks}`,
        ""
      ].join("\n"),
      "utf8"
    );
  }
}

export function appendLog(logPaths: readonly string[], result: CheckResult): void {
  const section = [
    `## ${result.check.label}`,
    `$ ${formatCommandLine({ args: result.check.args, command: result.check.command })}`,
    `exit: ${result.exitCode}`,
    `duration: ${formatDurationMs(result.durationMs)}`,
    result.error ? `process_error: ${result.error.message}` : null,
    "",
    result.combinedOutput || "(no output)",
    "",
    ""
  ]
    .filter((line) => line !== null)
    .join("\n");

  for (const logPath of logPaths) {
    fs.appendFileSync(logPath, section, "utf8");
  }
}

export function finalizeLogs(logPaths: readonly string[], totalDurationMs: number): void {
  for (const logPath of logPaths) {
    fs.appendFileSync(logPath, `completed: ${new Date().toISOString()}\n`, "utf8");
    fs.appendFileSync(logPath, `duration: ${formatDurationMs(totalDurationMs)}\n`, "utf8");
  }
}

function formatCommandLine({
  args,
  command
}: {
  readonly args: readonly string[];
  readonly command: string;
}): string {
  return [command, ...args].map(quoteCommandArg).join(" ");
}

function quoteCommandArg(value: string): string {
  if (/^[A-Za-z0-9_./:=@+%\\-]+$/.test(value)) {
    return value;
  }
  return `"${value.replace(/"/g, '\\"')}"`;
}
