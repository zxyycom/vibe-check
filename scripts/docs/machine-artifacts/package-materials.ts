import { existsSync, readFileSync } from "node:fs";

import { loadPackageDocuments, repositoryPath } from "../package-documents.ts";

/** One repository-owned machine contract file copied into the package byte-for-byte. */
export interface PackageMachineMaterial {
  readonly content: Buffer;
  readonly packagePath: string;
  readonly sourcePath: string;
}

/** Reads the closed package machine-material registry without text normalization. */
export function collectPackageMachineMaterials(
  repositoryRoot: string
): readonly PackageMachineMaterial[] {
  return Object.freeze(
    loadPackageDocuments(repositoryRoot).machineMaterials.map((material) => {
      const absolutePath = repositoryPath(
        repositoryRoot,
        material.sourcePath,
        "package machine material source path"
      );
      if (!existsSync(absolutePath)) {
        throw new Error(`package machine material is missing: ${material.sourcePath}`);
      }
      return Object.freeze({
        content: readFileSync(absolutePath),
        packagePath: material.packagePath,
        sourcePath: material.sourcePath
      });
    })
  );
}
