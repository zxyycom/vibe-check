import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  MACHINE_EXAMPLE_FILES,
  MACHINE_EXAMPLE_GENERATED_FILES,
  MACHINE_EXAMPLE_NAME,
  MACHINE_EXAMPLE_ROOT,
  MACHINE_EXAMPLES_ROOT,
  MACHINE_EXAMPLE_REGENERATE_COMMAND,
  type GeneratedMachineExampleFile
} from "./contract.ts";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const encoder = new TextEncoder();

/** A safe, provider-owned reason that docs validation may project without reading error text. */
export class MachineExamplePublicationFailure extends Error {
  public readonly kind: string;
  public readonly path: string;

  public constructor(kind: string, repositoryPath: string) {
    super(
      `${repositoryPath}: ${kind.replaceAll("-", " ")}; regenerate with ${MACHINE_EXAMPLE_REGENERATE_COMMAND}.`
    );
    this.kind = kind;
    this.name = "MachineExamplePublicationFailure";
    this.path = repositoryPath;
  }
}

export function publishMachineExampleFiles(files: readonly GeneratedMachineExampleFile[]): void {
  cleanRetiredExampleDirectories();
  for (const file of files) {
    const absolutePath = resolvePublishedPath(file.relativePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, file.contents, "utf8");
  }
}

export function checkPublishedMachineExampleFiles(
  files: readonly GeneratedMachineExampleFile[],
  { materialRoot = workspaceRoot }: Readonly<{ materialRoot?: string }> = {}
): void {
  checkCurrentExampleInventory(materialRoot);
  for (const file of files) {
    const expected = encoder.encode(file.contents);
    let actual: Buffer;
    try {
      actual = fs.readFileSync(path.join(materialRoot, file.relativePath));
    } catch (error: unknown) {
      if (!isMissingFile(error)) throw error;
      throw machineExampleFailure("published-machine-example-missing", file.relativePath);
    }
    if (!actual.equals(expected)) {
      throw machineExampleFailure("published-machine-example-drift", file.relativePath);
    }
  }
}

function resolvePublishedPath(relativePath: string): string {
  return path.join(workspaceRoot, relativePath);
}

function cleanRetiredExampleDirectories(): void {
  const root = resolveCurrentExampleRoot();
  fs.mkdirSync(root, { recursive: true });
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.name !== MACHINE_EXAMPLE_NAME) {
      fs.rmSync(path.join(root, entry.name), { force: true, recursive: true });
    }
  }
  const exampleRoot = resolvePublishedPath(MACHINE_EXAMPLE_ROOT);
  fs.mkdirSync(exampleRoot, { recursive: true });
  for (const fileName of MACHINE_EXAMPLE_GENERATED_FILES) {
    fs.rmSync(path.join(exampleRoot, fileName), { force: true });
  }
}

function checkCurrentExampleInventory(materialRoot: string): void {
  const rootEntries = readPublishedDirectory({ relativePath: MACHINE_EXAMPLES_ROOT, materialRoot });
  for (const entry of rootEntries) {
    if (!entry.isDirectory() || entry.name !== MACHINE_EXAMPLE_NAME) {
      throw inventoryDrift(`${MACHINE_EXAMPLES_ROOT}/${entry.name}`);
    }
  }
  const example = rootEntries.find((entry) => entry.name === MACHINE_EXAMPLE_NAME);
  if (example?.isDirectory() !== true) {
    throw machineExampleFailure("published-machine-example-missing", MACHINE_EXAMPLE_ROOT);
  }
  checkExampleInventory(new Set<string>(MACHINE_EXAMPLE_FILES), materialRoot);
}

function checkExampleInventory(expectedFiles: ReadonlySet<string>, materialRoot: string): void {
  const entries = readPublishedDirectory({ relativePath: MACHINE_EXAMPLE_ROOT, materialRoot });
  for (const entry of entries) {
    if (!entry.isFile() || !expectedFiles.has(entry.name)) {
      throw inventoryDrift(`${MACHINE_EXAMPLE_ROOT}/${entry.name}`);
    }
  }
  for (const fileName of MACHINE_EXAMPLE_FILES) {
    if (!entries.some((entry) => entry.isFile() && entry.name === fileName)) {
      throw machineExampleFailure(
        "published-machine-example-missing",
        `${MACHINE_EXAMPLE_ROOT}/${fileName}`
      );
    }
  }
}

function readPublishedDirectory({
  relativePath,
  materialRoot
}: Readonly<{ relativePath: string; materialRoot: string }>): fs.Dirent[] {
  try {
    return fs.readdirSync(path.join(materialRoot, relativePath), {
      withFileTypes: true
    });
  } catch (error: unknown) {
    if (!isMissingFile(error)) throw error;
    throw machineExampleFailure("published-machine-example-directory-missing", relativePath);
  }
}

function inventoryDrift(relativePath: string): Error {
  return machineExampleFailure("published-machine-example-inventory-drift", relativePath);
}

function machineExampleFailure(
  kind: string,
  relativePath: string
): MachineExamplePublicationFailure {
  return new MachineExamplePublicationFailure(kind, relativePath);
}

function isMissingFile(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as Readonly<{ readonly code?: unknown }>).code === "ENOENT"
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
