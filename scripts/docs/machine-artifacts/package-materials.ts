import { existsSync, readFileSync } from "node:fs";
import { join, normalize, resolve } from "node:path";

import { isPathWithin } from "../../repository-files/paths.ts";

/** One repository-owned machine contract file copied into the package byte-for-byte. */
export interface PackageMachineMaterial {
  readonly content: Buffer;
  readonly packagePath: string;
  readonly sourcePath: string;
}

/** Exact current machine contract inventory published with the package. */
export const PACKAGE_MACHINE_MATERIAL_PATHS = Object.freeze([
  "docs/output.md",
  "docs/schemas/vibe-check-record.schema.json",
  "docs/schemas/vibe-check-run.schema.json",
  "docs/examples/artifacts/mixed-outcomes/definition.ts",
  "docs/examples/artifacts/mixed-outcomes/records.ndjson",
  "docs/examples/artifacts/mixed-outcomes/run.json"
] as const);

/** Reads the closed package machine-material registry without text normalization. */
export function collectPackageMachineMaterials(
  repositoryRoot: string
): readonly PackageMachineMaterial[] {
  const root = resolve(repositoryRoot);
  const packagePaths = new Set<string>();
  return Object.freeze(
    PACKAGE_MACHINE_MATERIAL_PATHS.map((sourcePath) => {
      const packagePath = normalize(sourcePath).replaceAll("\\", "/");
      const absolutePath = join(root, sourcePath);
      if (
        packagePath !== sourcePath ||
        packagePath.startsWith("../") ||
        !isPathWithin(root, absolutePath)
      ) {
        throw new Error(`invalid package machine material path: ${sourcePath}`);
      }
      if (packagePaths.has(packagePath)) {
        throw new Error(`duplicate package machine material path: ${packagePath}`);
      }
      packagePaths.add(packagePath);
      if (!existsSync(absolutePath)) {
        throw new Error(`package machine material is missing: ${sourcePath}`);
      }
      return Object.freeze({
        content: readFileSync(absolutePath),
        packagePath,
        sourcePath
      });
    })
  );
}
