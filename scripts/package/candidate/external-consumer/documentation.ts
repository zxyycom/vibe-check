import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { collectPackageDocumentation } from "../../../docs/package-api/check-guides.ts";
import { PACKAGE_API_EXAMPLE_PROJECTIONS } from "../../../docs/package-api/example-projections.ts";
import { renderPackageApiDocumentation } from "../../../docs/package-api/render.ts";
import { collectPackageMachineMaterials } from "../../../docs/machine-artifacts/package-materials.ts";
import { CURRENT_PUBLIC_CONTRACT } from "../../public-api-inventory.ts";
import { assertExternalConsumerCommandSucceeded } from "./command-result.ts";
import type { ExternalConsumerMaterial } from "./material.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

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
  runDocumentationAcceptance(material);
}

function packageApiExampleSourcePaths(): readonly string[] {
  return Object.freeze(
    [...new Set(PACKAGE_API_EXAMPLE_PROJECTIONS.map((projection) => projection.sourcePath))].sort()
  );
}

function runtimeDocumentationExampleSourcePaths(): readonly string[] {
  return Object.freeze(
    [
      ...new Set(
        PACKAGE_API_EXAMPLE_PROJECTIONS.filter(
          (projection) => projection.evidence === "runtime"
        ).map((projection) => projection.sourcePath)
      )
    ].sort()
  );
}

function runDocumentationAcceptance(material: ExternalConsumerMaterial): void {
  const definitionPath = join(
    material.installedPackageDirectory,
    "docs/examples/artifacts/mixed-outcomes/definition.ts"
  );
  const result = spawnSync(
    process.execPath,
    [
      "-e",
      documentationAcceptanceRunnerSource(),
      JSON.stringify(runtimeDocumentationExampleSourcePaths()),
      definitionPath
    ],
    { cwd: material.consumerDirectory, encoding: "utf8" }
  );
  assertExternalConsumerCommandSucceeded(
    result,
    "batched documentation examples and machine Definition"
  );
}

function documentationAcceptanceRunnerSource(): string {
  return `import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { run } from "${CURRENT_PUBLIC_CONTRACT.packageImport}";

const runtimeSourcePaths = JSON.parse(process.argv[1] ?? "null");
if (
  !Array.isArray(runtimeSourcePaths) ||
  runtimeSourcePaths.some((sourcePath) => typeof sourcePath !== "string" || sourcePath.length === 0)
) {
  throw new TypeError("Documentation acceptance requires a JSON array of source paths");
}
for (const sourcePath of runtimeSourcePaths) {
  try {
    await import(pathToFileURL(resolve(sourcePath)).href);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(\`Documentation example failed (\${sourcePath}): \${detail}\`);
  }
}

const definitionPath = process.argv[2];
if (typeof definitionPath !== "string" || definitionPath.length === 0) {
  throw new TypeError("Documentation acceptance requires a machine Definition path");
}
let definition;
try {
  definition = (await import(pathToFileURL(definitionPath).href)).default;
} catch (error) {
  const detail = error instanceof Error ? error.message : String(error);
  throw new Error(\`Machine Definition import failed (\${definitionPath}): \${detail}\`);
}
const result = await run(definition);
if (result.kind !== "completed") throw new Error(\`Machine Definition did not complete: \${result.kind}\`);
if (result.outputs.machinePublication.status !== "succeeded") {
  throw new Error("Machine Definition did not publish its configured output");
}
assert.deepEqual(
  result.checkMessages.map(({ checkId, code, level }) => ({ checkId, code, level })),
  [
    {
      checkId: "example-external-review",
      code: "review-service-unconfigured",
      level: "error"
    },
    {
      checkId: "example-release-inputs",
      code: "default-release-input",
      level: "warning"
    },
    {
      checkId: "example-release-policy",
      code: "release-policy-failed",
      level: "error"
    }
  ]
);
const exampleRoot = dirname(definitionPath);
const documentedRun = JSON.parse(readFileSync(join(exampleRoot, "run.json"), "utf8"));
const recordsSource = readFileSync(join(exampleRoot, "records.ndjson"), "utf8");
const documentedRecords = recordsSource.trimEnd().split("\\n").filter(Boolean).map((line) => {
  const { schemaVersion: _schemaVersion, ...record } = JSON.parse(line);
  return record;
});
assert.deepEqual(result.snapshot.checks, documentedRun.checks);
assert.deepEqual(result.snapshot.records, documentedRecords);
`;
}
