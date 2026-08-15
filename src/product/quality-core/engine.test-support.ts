import { expect } from "bun:test";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync
} from "node:fs";
import { resolve } from "node:path";

import {
  validateMachinePublicationSetV2,
  type MachinePublicationV2
} from "./output/publication-v2/index.ts";

export function readValidatedMachineArtifacts(
  artifactDir: string
): MachinePublicationV2 {
  const validation = validateMachinePublicationSetV2({
    recordsNdjson: readFileSync(resolve(artifactDir, "records.ndjson")),
    runJson: readFileSync(resolve(artifactDir, "run.json"))
  });
  if (!validation.ok) {
    throw new Error(
      `published machine artifact set did not validate: ${JSON.stringify(validation.diagnostic)}`
    );
  }
  return validation.value;
}

export function assertNoMachinePublication(
  artifactDir: string,
  stdout: readonly string[]
): void {
  for (const fileName of [
    "run.json",
    "records.ndjson",
    "report.md",
    "metrics.json",
    "warnings.ndjson",
    "warnings-all.ndjson"
  ]) {
    expect(existsSync(resolve(artifactDir, fileName))).toBe(false);
    expect(stdout.some((line) => line.includes(`${fileName} →`))).toBe(false);
  }
  if (!existsSync(artifactDir) || !statSync(artifactDir).isDirectory()) return;
  expect(
    readdirSync(artifactDir).some((fileName) =>
      fileName.startsWith(".vibe-check-publication-")
    )
  ).toBe(false);
}

export function seedPriorMachinePublication(artifactDir: string): void {
  mkdirSync(artifactDir, { recursive: true });
  for (const fileName of [
    "run.json",
    "records.ndjson",
    "report.md",
    "metrics.json",
    "warnings.ndjson",
    "warnings-all.ndjson",
    ".vibe-check-publication-prior-run.json.tmp"
  ]) {
    writeFileSync(resolve(artifactDir, fileName), "stale", "utf8");
  }
}

export async function captureConsole<T>(run: () => Promise<T>): Promise<{
  result: T;
  stderr: string[];
  stdout: string[];
}> {
  const stderr: string[] = [];
  const stdout: string[] = [];
  const originalError = console.error;
  const originalLog = console.log;
  console.error = (...values: unknown[]) => {
    stderr.push(values.map(String).join(" "));
  };
  console.log = (...values: unknown[]) => {
    stdout.push(values.map(String).join(" "));
  };

  try {
    const result = await run();
    return { result, stderr, stdout };
  } finally {
    console.error = originalError;
    console.log = originalLog;
  }
}

export function gateOutput(lines: readonly string[]): string[] {
  return lines.filter((line) =>
    line.includes("Quality gate") ||
    line.startsWith("  Policy:") ||
    line.startsWith("  Status:") ||
    line.startsWith("  Blocking records:")
  );
}
