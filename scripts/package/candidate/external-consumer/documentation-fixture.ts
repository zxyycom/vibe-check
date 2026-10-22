import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  PACKAGE_API_EXAMPLE_PROJECTIONS,
  PACKAGE_API_EXAMPLE_SUPPORT_SOURCE_PATHS
} from "../../../docs/package-api/example-projections.ts";
import { collectPackageMachineMaterials } from "../../../docs/machine-artifacts/package-materials.ts";

/** Copies acceptance inputs without loading the documentation renderer or local builder. */
export function writeExternalConsumerDocumentationFixture(
  consumerDirectory: string,
  sourceRepositoryRoot: string
): void {
  for (const sourcePath of packageApiExampleSourcePaths()) {
    const destination = join(consumerDirectory, sourcePath);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(
      destination,
      readFileSync(join(sourceRepositoryRoot, sourcePath), "utf8"),
      "utf8"
    );
  }
  for (const material of collectPackageMachineMaterials(sourceRepositoryRoot)) {
    if (!material.sourcePath.startsWith("docs/examples/artifacts/mixed-outcomes/")) continue;
    const destination = join(consumerDirectory, material.sourcePath);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, material.content);
  }
}

function packageApiExampleSourcePaths(): readonly string[] {
  return Object.freeze(
    [
      ...new Set([
        ...PACKAGE_API_EXAMPLE_PROJECTIONS.map((projection) => projection.sourcePath),
        ...PACKAGE_API_EXAMPLE_SUPPORT_SOURCE_PATHS
      ])
    ].sort()
  );
}
