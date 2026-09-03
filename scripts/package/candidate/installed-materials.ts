import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { errorMessage } from "../../error-message.ts";
import {
  assertJSDocExamplePayloads,
  assertThirdPartyLicenseContent,
  assertPackageLicenseContent
} from "../package-material-audit.ts";
import type { PackageDocumentationFile } from "../../docs/package-api/check-guides.ts";
import type { PackageMachineMaterial } from "../../docs/machine-artifacts/package-materials.ts";
import {
  PACKAGE_LICENSE_PATH,
  PACKAGE_THIRD_PARTY_LICENSES,
  PACKAGE_TYPES_DIRECTORY
} from "../package-contract.ts";
import { collectFilePaths } from "../file-inventory.ts";

export function assertInstalledCandidateMaterials(input: {
  readonly packageDirectory: string;
  readonly expectedDocuments: readonly PackageDocumentationFile[];
  readonly expectedJSDocExamplePayloads: readonly string[];
  readonly expectedMachineMaterials: readonly PackageMachineMaterial[];
  readonly expectedReadme: string;
}): void {
  assertInstalledReadme(input.packageDirectory, input.expectedReadme);
  assertInstalledLegalMaterials(input.packageDirectory);
  assertInstalledDocumentation(input.packageDirectory, input.expectedDocuments);
  assertInstalledMachineMaterials(input.packageDirectory, input.expectedMachineMaterials);
  assertInstalledDeclarationPayloads(input.packageDirectory, input.expectedJSDocExamplePayloads);
}

function assertInstalledLegalMaterials(packageDirectory: string): void {
  try {
    assertPackageLicenseContent(readFileSync(join(packageDirectory, PACKAGE_LICENSE_PATH)));
    for (const license of PACKAGE_THIRD_PARTY_LICENSES) {
      assertThirdPartyLicenseContent(readFileSync(join(packageDirectory, license.path)), license);
    }
  } catch (error: unknown) {
    throw new Error(
      `installed candidate legal material validation failed: ${errorMessage(error)}`,
      {
        cause: error
      }
    );
  }
}

function assertInstalledReadme(packageDirectory: string, expectedReadme: string): void {
  const readmePath = join(packageDirectory, "README.md");
  if (!existsSync(readmePath))
    throw new Error(`installed candidate README is missing: ${readmePath}`);
  let readme: string;
  try {
    readme = readFileSync(readmePath, "utf8");
  } catch (error: unknown) {
    throw new Error(
      `could not read installed candidate README ${readmePath}: ${errorMessage(error)}`,
      { cause: error }
    );
  }
  if (readme !== expectedReadme)
    throw new Error(
      `installed candidate README differs from the expected package documentation: ${readmePath}`
    );
}

function assertInstalledDocumentation(
  packageDirectory: string,
  documents: readonly PackageDocumentationFile[]
): void {
  for (const document of documents) {
    const path = join(packageDirectory, document.packagePath);
    if (!existsSync(path) || readFileSync(path, "utf8") !== document.content)
      throw new Error(`installed candidate package documentation differs: ${path}`);
  }
}

function assertInstalledMachineMaterials(
  packageDirectory: string,
  materials: readonly PackageMachineMaterial[]
): void {
  for (const material of materials) {
    const path = join(packageDirectory, material.packagePath);
    if (!existsSync(path) || !readFileSync(path).equals(material.content))
      throw new Error(`installed candidate machine material differs: ${path}`);
  }
}

function assertInstalledDeclarationPayloads(
  packageDirectory: string,
  expectedPayloads: readonly string[]
): void {
  try {
    assertJSDocExamplePayloads({
      declarationSources: collectFilePaths(
        join(packageDirectory, PACKAGE_TYPES_DIRECTORY),
        (path) => path.endsWith(".d.ts")
      ).map((path) => readFileSync(path, "utf8")),
      description: "installed candidate declarations",
      expectedPayloads
    });
  } catch (error: unknown) {
    throw new Error(`installed candidate declaration validation failed: ${errorMessage(error)}`, {
      cause: error
    });
  }
}
