import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { assertExternalConsumerCommandSucceeded } from "./external-consumer-command-result.ts";
import { PACKAGE_API_EXAMPLE_PROJECTIONS } from "../../docs/package-api/example-projections.ts";
import { renderPackageApiDocumentation } from "../../docs/package-api/render.ts";
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

/** Owns installed README and projected documentation-example acceptance. */
export function assertExternalConsumerDocumentation(material: ExternalConsumerMaterial): void {
  const documentation = renderPackageApiDocumentation({ repositoryRoot });
  assert.equal(
    readFileSync(join(material.installedPackageDirectory, "README.md"), "utf8"),
    documentation.readme.content
  );
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
