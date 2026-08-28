import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { collectPackageDocumentation } from "../../docs/package-api/check-guides.ts";
import { PACKAGE_API_EXAMPLE_PROJECTIONS } from "../../docs/package-api/example-projections.ts";
import { renderPackageApiDocumentation } from "../../docs/package-api/render.ts";
import { collectPackageMachineMaterials } from "../../docs/machine-artifacts/package-materials.ts";
import { assertExternalConsumerCommandSucceeded } from "./external-consumer-command-result.ts";
import type { ExternalConsumerMaterial } from "./isolated-consumer-material.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

/** Writes documentation examples contributed by documentation acceptance. */
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
}

/** Owns installed package documentation and projected example acceptance. */
export function assertExternalConsumerDocumentation(material: ExternalConsumerMaterial): void {
  const documentation = renderPackageApiDocumentation({ repositoryRoot });
  const supportingDocuments = collectPackageDocumentation(
    repositoryRoot,
    documentation.markdownDocuments
  );
  for (const document of [documentation.readme, ...supportingDocuments]) {
    assert.equal(
      readFileSync(join(material.installedPackageDirectory, document.packagePath), "utf8"),
      document.content
    );
  }
  for (const materialFile of collectPackageMachineMaterials(repositoryRoot)) {
    assert.equal(
      readFileSync(join(material.installedPackageDirectory, materialFile.packagePath)).equals(
        materialFile.content
      ),
      true,
      `installed package machine material differs: ${materialFile.packagePath}`
    );
  }
  runDocumentationExamples(material.consumerDirectory);
}

function packageApiExampleSourcePaths(): readonly string[] {
  return Object.freeze(
    [...new Set(PACKAGE_API_EXAMPLE_PROJECTIONS.map((projection) => projection.sourcePath))].sort()
  );
}

function runDocumentationExamples(consumerDirectory: string): void {
  const runtimeSourcePaths = new Set<string>(
    PACKAGE_API_EXAMPLE_PROJECTIONS.filter((projection) => projection.evidence === "runtime").map(
      (projection) => projection.sourcePath
    )
  );
  for (const sourcePath of packageApiExampleSourcePaths()) {
    if (!runtimeSourcePaths.has(sourcePath)) continue;
    const result = spawnSync(process.execPath, [sourcePath], {
      cwd: consumerDirectory,
      encoding: "utf8"
    });
    assertExternalConsumerCommandSucceeded(result, `isolated documentation example ${sourcePath}`);
  }
}
