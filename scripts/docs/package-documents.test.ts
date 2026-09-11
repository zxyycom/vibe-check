import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { createArtifactFingerprint } from "../package/artifact/fingerprint.ts";
import { collectPackageMachineMaterials } from "./machine-artifacts/package-materials.ts";
import { collectPackageDocumentation } from "./package-api/check-guides.ts";
import { renderPackageApiDocumentation } from "./package-api/render.ts";
import { createPackageApiDocumentationFixture } from "./package-api/test-support.ts";
import { isNonArrayRecord } from "../value-guards.ts";
import { loadPackageDocuments, PACKAGE_DOCUMENTS_CONFIG_PATH } from "./package-documents.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

describe("package document mappings", () => {
  it("reads the calling repository mapping and applies distinct source and package paths", () => {
    const fixtureRoot = createPackageApiDocumentationFixture();
    try {
      const config = readConfig(fixtureRoot);
      config.markdownDocuments.push({
        id: "fixture-document",
        packagePath: "docs/published/fixture.md",
        sourcePath: "docs/fixture-source.md"
      });
      config.machineMaterials = [
        { packagePath: "docs/output.md", sourcePath: "docs/output.md" },
        {
          packagePath: "docs/schemas/renamed-run.schema.json",
          sourcePath: "docs/schemas/vibe-check-run.schema.json"
        }
      ];
      writeFileSync(join(fixtureRoot, "docs/fixture-source.md"), "# fixture\n", "utf8");
      writeFileSync(
        join(fixtureRoot, "docs/output.md"),
        "[Run schema](./schemas/vibe-check-run.schema.json)\n",
        "utf8"
      );
      mkdirSync(join(fixtureRoot, "docs/schemas"), { recursive: true });
      writeFileSync(join(fixtureRoot, "docs/schemas/vibe-check-run.schema.json"), "{}\n", "utf8");
      const readmePath = join(fixtureRoot, "README.md");
      writeFileSync(
        readmePath,
        readFileSync(readmePath, "utf8").replace(
          "\n",
          "\n[Fixture](./docs/published/fixture.md)\n"
        ),
        "utf8"
      );
      writeConfig(fixtureRoot, config);

      const mapping = loadPackageDocuments(fixtureRoot);
      assert.equal(mapping.markdownDocuments.at(-1)?.sourcePath, "docs/fixture-source.md");
      assert.equal(mapping.markdownDocuments.at(-1)?.packagePath, "docs/published/fixture.md");
      const rendered = renderPackageApiDocumentation({ repositoryRoot: fixtureRoot });
      const published = rendered.markdownDocuments.find(
        (document) => document.documentId === "fixture-document"
      );
      assert.ok(published);
      assert.equal(published.packagePath, "docs/published/fixture.md");
      assert.equal(published.content, "# fixture\n");
      assert.throws(
        () => collectPackageDocumentation(fixtureRoot, rendered.markdownDocuments),
        /package documentation link does not resolve: docs\/output\.md -> \.\/schemas\/vibe-check-run\.schema\.json/
      );
      writeFileSync(
        join(fixtureRoot, "docs/output.md"),
        "[Run schema](./schemas/renamed-run.schema.json)\n",
        "utf8"
      );
      assert.equal(
        collectPackageDocumentation(fixtureRoot, rendered.markdownDocuments).some(
          (document) => document.packagePath === "docs/published/fixture.md"
        ),
        true
      );
      assert.deepEqual(
        collectPackageMachineMaterials(fixtureRoot).map((material) => [
          material.sourcePath,
          material.packagePath,
          material.content.toString("utf8")
        ]),
        [
          ["docs/output.md", "docs/output.md", "[Run schema](./schemas/renamed-run.schema.json)\n"],
          [
            "docs/schemas/vibe-check-run.schema.json",
            "docs/schemas/renamed-run.schema.json",
            "{}\n"
          ]
        ]
      );
    } finally {
      rmSync(fixtureRoot, { force: true, recursive: true });
    }
  });

  it("rejects unknown fields, unsafe paths, and conflicting package targets", () => {
    const fixtureRoot = createPackageApiDocumentationFixture();
    const configPath = join(fixtureRoot, PACKAGE_DOCUMENTS_CONFIG_PATH);
    const baseline = readFileSync(configPath, "utf8");
    try {
      for (const invalidMapping of invalidMappings()) {
        writeFileSync(configPath, baseline, "utf8");
        const config = readConfig(fixtureRoot);
        invalidMapping.mutate(config);
        writeConfig(fixtureRoot, config);
        assert.throws(() => loadPackageDocuments(fixtureRoot), invalidMapping.diagnostic);
      }
    } finally {
      rmSync(fixtureRoot, { force: true, recursive: true });
    }
  });

  it("includes raw mapping bytes in the artifact fingerprint", () => {
    const temporaryRoot = mkdtempSync(join(tmpdir(), "vibe-check-package-document-fingerprint-"));
    const root = join(temporaryRoot, "repository");
    try {
      cpSync(repositoryRoot, root, {
        dereference: false,
        recursive: true,
        filter: (path) =>
          ![".cache", ".codegraph", ".git", ".log", "build", "node_modules"].includes(
            path.split("/").at(-1) ?? ""
          )
      });
      const before = createArtifactFingerprint(root);
      const configPath = join(root, PACKAGE_DOCUMENTS_CONFIG_PATH);
      writeFileSync(configPath, `${readFileSync(configPath, "utf8")}\n`, "utf8");
      assert.notEqual(createArtifactFingerprint(root), before);
    } finally {
      rmSync(temporaryRoot, { force: true, recursive: true });
    }
  });
});

type MutableConfig = {
  checkGuides: Record<string, unknown>[];
  machineMaterials: Record<string, unknown>[];
  markdownDocuments: Record<string, unknown>[];
  [key: string]: unknown;
};

function invalidMappings(): readonly Readonly<{
  readonly diagnostic: RegExp;
  readonly mutate: (config: MutableConfig) => void;
}>[] {
  return [
    {
      diagnostic: /expected only markdownDocuments, checkGuides, machineMaterials/,
      mutate: (config) => Object.assign(config, { unexpected: true })
    },
    {
      diagnostic: /invalid package Markdown document mapping/,
      mutate: (config) =>
        Object.assign(requiredEntry(config.markdownDocuments, 0), { unexpected: true })
    },
    {
      diagnostic: /must map README\.md from README\.md/,
      mutate: (config) =>
        Object.assign(requiredEntry(config.markdownDocuments, 0), { sourcePath: "docs/readme.md" })
    },
    {
      diagnostic: /conflicting package document target: README\.md/,
      mutate: (config) =>
        config.markdownDocuments.push({
          id: "duplicate-target",
          packagePath: "README.md",
          sourcePath: "docs/api-mechanics.md"
        })
    },
    {
      diagnostic: /invalid package machine material mapping/,
      mutate: (config) =>
        Object.assign(requiredEntry(config.machineMaterials, 0), { sourcePath: "../outside.md" })
    },
    {
      diagnostic: /invalid package machine material mapping/,
      mutate: (config) =>
        Object.assign(requiredEntry(config.machineMaterials, 0), { sourcePath: "docs/output.md/" })
    },
    {
      diagnostic: /invalid package machine material mapping/,
      mutate: (config) =>
        Object.assign(requiredEntry(config.machineMaterials, 0), {
          sourcePath: "docs\u0000output.md"
        })
    },
    {
      diagnostic: /invalid package machine material mapping/,
      mutate: (config) =>
        Object.assign(requiredEntry(config.machineMaterials, 0), { packagePath: "package.json" })
    },
    {
      diagnostic: /conflicting package document target: docs\/output\.md\/child\.json/,
      mutate: (config) =>
        config.machineMaterials.push({
          packagePath: "docs/output.md/child.json",
          sourcePath: "docs/output.md"
        })
    }
  ];
}

function readConfig(root: string): MutableConfig {
  const parsed: unknown = JSON.parse(
    readFileSync(join(root, PACKAGE_DOCUMENTS_CONFIG_PATH), "utf8")
  );
  if (!isNonArrayRecord(parsed))
    throw new TypeError("fixture package document configuration is invalid");
  return {
    ...parsed,
    checkGuides: mutableEntries(parsed.checkGuides),
    machineMaterials: mutableEntries(parsed.machineMaterials),
    markdownDocuments: mutableEntries(parsed.markdownDocuments)
  };
}

function mutableEntries(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    throw new TypeError("fixture package document configuration entries are invalid");
  }
  const entries: Record<string, unknown>[] = [];
  for (const item of value) {
    const entry: unknown = item;
    if (!isNonArrayRecord(entry)) {
      throw new TypeError("fixture package document configuration entries are invalid");
    }
    entries.push({ ...entry });
  }
  return entries;
}

function requiredEntry(
  entries: readonly Record<string, unknown>[],
  index: number
): Record<string, unknown> {
  const entry = entries[index];
  if (entry === undefined)
    throw new Error(`missing package document fixture entry at index ${index}`);
  return entry;
}

function writeConfig(root: string, config: MutableConfig): void {
  writeFileSync(join(root, PACKAGE_DOCUMENTS_CONFIG_PATH), JSON.stringify(config), "utf8");
}
