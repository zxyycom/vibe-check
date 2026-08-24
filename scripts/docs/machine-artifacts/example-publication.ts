import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  MACHINE_EXAMPLE_ARTIFACT_FILES,
  MACHINE_EXAMPLE_OUTCOMES,
  MACHINE_EXAMPLES_ROOT,
  MACHINE_EXAMPLE_REGENERATE_COMMAND,
  type GeneratedMachineExampleFile
} from "./example-contract.ts";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const encoder = new TextEncoder();

export function publishMachineExampleFiles(files: readonly GeneratedMachineExampleFile[]): void {
  cleanCurrentExampleRoot();
  for (const file of files) {
    const absolutePath = resolvePublishedPath(file.relativePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, file.contents, "utf8");
  }
}

export function checkPublishedMachineExampleFiles(
  files: readonly GeneratedMachineExampleFile[]
): void {
  checkCurrentExampleInventory();
  for (const file of files) {
    const expected = encoder.encode(file.contents);
    let actual: Buffer;
    try {
      actual = fs.readFileSync(resolvePublishedPath(file.relativePath));
    } catch {
      throw new Error(
        `published machine example is missing: ${file.relativePath}; regenerate with ${MACHINE_EXAMPLE_REGENERATE_COMMAND}`
      );
    }
    if (!actual.equals(expected)) {
      throw new Error(
        `published machine example drift: ${file.relativePath}; regenerate with ${MACHINE_EXAMPLE_REGENERATE_COMMAND}`
      );
    }
  }
}

function resolvePublishedPath(relativePath: string): string {
  return path.join(workspaceRoot, relativePath);
}

function cleanCurrentExampleRoot(): void {
  fs.rmSync(resolveCurrentExampleRoot(), { force: true, recursive: true });
}

function checkCurrentExampleInventory(): void {
  const rootEntries = readPublishedDirectory(MACHINE_EXAMPLES_ROOT);
  const expectedOutcomes = new Set<string>(MACHINE_EXAMPLE_OUTCOMES);
  for (const entry of rootEntries) {
    if (!entry.isDirectory() || !expectedOutcomes.has(entry.name)) {
      throw inventoryDrift(`${MACHINE_EXAMPLES_ROOT}/${entry.name}`);
    }
  }

  const expectedFiles = new Set<string>(MACHINE_EXAMPLE_ARTIFACT_FILES);
  for (const outcome of MACHINE_EXAMPLE_OUTCOMES) {
    const outcomeEntry = rootEntries.find((entry) => entry.name === outcome);
    if (!outcomeEntry?.isDirectory()) {
      throw new Error(
        `published machine example is missing: ${MACHINE_EXAMPLES_ROOT}/${outcome}; regenerate with ${MACHINE_EXAMPLE_REGENERATE_COMMAND}`
      );
    }
    checkOutcomeInventory(outcome, expectedFiles);
  }
}

function checkOutcomeInventory(outcome: string, expectedFiles: ReadonlySet<string>): void {
  const outcomeRoot = `${MACHINE_EXAMPLES_ROOT}/${outcome}`;
  const entries = readPublishedDirectory(outcomeRoot);
  for (const entry of entries) {
    if (!entry.isFile() || !expectedFiles.has(entry.name)) {
      throw inventoryDrift(`${outcomeRoot}/${entry.name}`);
    }
  }
  for (const fileName of MACHINE_EXAMPLE_ARTIFACT_FILES) {
    if (!entries.some((entry) => entry.isFile() && entry.name === fileName)) {
      throw new Error(
        `published machine example is missing: ${outcomeRoot}/${fileName}; regenerate with ${MACHINE_EXAMPLE_REGENERATE_COMMAND}`
      );
    }
  }
}

function readPublishedDirectory(relativePath: string): fs.Dirent[] {
  try {
    return fs.readdirSync(resolvePublishedPath(relativePath), {
      withFileTypes: true
    });
  } catch {
    throw new Error(
      `published machine example directory is missing or unreadable: ${relativePath}; regenerate with ${MACHINE_EXAMPLE_REGENERATE_COMMAND}`
    );
  }
}

function inventoryDrift(relativePath: string): Error {
  return new Error(
    `published machine example inventory drift: unexpected ${relativePath}; expected exactly the generated v4 outcome directories with 3 files each; regenerate with ${MACHINE_EXAMPLE_REGENERATE_COMMAND}`
  );
}

function resolveCurrentExampleRoot(): string {
  const resolved = resolvePublishedPath(MACHINE_EXAMPLES_ROOT);
  const expected = path.join(workspaceRoot, "docs", "examples", "artifacts");
  if (resolved !== expected) {
    throw new Error(`refusing to clean unexpected machine example root: ${resolved}`);
  }
  return resolved;
}
