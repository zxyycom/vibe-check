import { expect } from "bun:test";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync
} from "node:fs";
import { resolve } from "node:path";

import { validateMachineArtifactSetV1 } from "../../machine-output.ts";

export function readValidatedMachineArtifacts(artifactDir: string) {
  const validation = validateMachineArtifactSetV1({
    metricsJson: readFileSync(resolve(artifactDir, "metrics.json")),
    warningsAllNdjson: readFileSync(
      resolve(artifactDir, "warnings-all.ndjson")
    ),
    warningsNdjson: readFileSync(resolve(artifactDir, "warnings.ndjson"))
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
    "metrics.json",
    "warnings.ndjson",
    "warnings-all.ndjson"
  ]) {
    expect(existsSync(resolve(artifactDir, fileName))).toBe(false);
    expect(stdout.some((line) => line.includes(`${fileName} →`))).toBe(false);
  }
  expect(
    readdirSync(artifactDir).some(
      (fileName) =>
        fileName.startsWith(".vibe-check-machine-") && fileName.endsWith(".tmp")
    )
  ).toBe(false);
}

export function seedPriorMachinePublication(artifactDir: string): void {
  mkdirSync(artifactDir, { recursive: true });
  for (const fileName of [
    "metrics.json",
    "warnings.ndjson",
    "warnings-all.ndjson",
    ".vibe-check-machine-prior-metrics.json.tmp"
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

export function gateOutput(lines: string[]): string[] {
  return lines.filter(
    (line) =>
      line.includes("Quality gate") ||
      line.startsWith("  Policy:") ||
      line.startsWith("  Status:") ||
      line.startsWith("  Evaluated channel:") ||
      line.startsWith("  Evaluated warnings:") ||
      line.startsWith("  Blocking warnings:")
  );
}

export function readNdjson(path: string): unknown[] {
  return readFileSync(path, "utf8")
    .trim()
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as unknown);
}
