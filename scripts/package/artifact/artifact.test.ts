import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { CURRENT_PUBLIC_CONTRACT } from "../../../src/contract/public-api.ts";
import { artifactDocumentation } from "./audit.ts";
import { buildCandidateArtifact } from "./build.ts";
import { createArtifactFingerprint } from "./fingerprint.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("package artifact", () => {
  it("builds and audits the approved package artifact", { timeout: 20_000 }, async () => {
    const stateDirectory = mkdtempSync(join(tmpdir(), "vibe-check-package-artifact-"));
    try {
      const documentation = artifactDocumentation(repositoryRoot);
      const inputFingerprint = createArtifactFingerprint(repositoryRoot);
      const artifact = await buildCandidateArtifact({
        artifactDirectory: join(stateDirectory, "artifacts"),
        candidateVersion: `0.0.0-local.${inputFingerprint.slice(0, 12)}`,
        documentation,
        inputFingerprint,
        repositoryRoot,
        stagingDirectory: join(stateDirectory, "staging"),
        stateDirectory
      });

      assert.equal(existsSync(artifact.artifactPath), true);
      assert.equal(artifact.files.includes("package/README.md"), true);
      assert.equal(artifact.files.includes("package/dist/esm/index.mjs"), true);
      assert.equal(artifact.files.includes("package/dist/esm/index.mjs.map"), true);
      assert.equal(artifact.files.includes("package/src/index.ts"), true);
      assert.equal(
        readFileSync(join(artifact.stagingDirectory, "README.md"), "utf8"),
        documentation.readme
      );
      assertEmittedPublicDocumentation(artifact.stagingDirectory);
      assertReadableRuntimeLayout(artifact.stagingDirectory);
      assert.equal(
        declaredRuntimeExports(join(artifact.stagingDirectory, "dist", "esm", "index.mjs")),
        '["defineCheck","defineConfig","duplicateDetection","fileMetrics","functionMetrics","inherit","jsonSchemaValidation","jsonValidation","maintenanceReminders","markdownLinkValidation","run"]'
      );
      assert.deepEqual(candidateDependencies(artifact.stagingDirectory), {
        "@humanwhocodes/momoa": "3.3.12",
        ajv: "8.20.0",
        "csv-parse": "7.0.1",
        execa: "9.6.1",
        "github-slugger": "2.0.0",
        jscpd: "5.0.11",
        "mdast-util-from-markdown": "2.0.3",
        "mdast-util-frontmatter": "2.0.1",
        "mdast-util-gfm": "3.1.0",
        "micromark-extension-frontmatter": "2.0.0",
        "micromark-extension-gfm": "3.0.0",
        minimatch: "10.2.5",
        neverthrow: "8.2.0",
        typebox: "1.3.9"
      });
    } finally {
      rmSync(stateDirectory, { force: true, recursive: true });
    }
  });
});

function assertEmittedPublicDocumentation(stagingDirectory: string): void {
  const declarationRoot = join(stagingDirectory, "types");
  const declarations = readDeclarationSources(declarationRoot);
  const publicRoots = [
    ...Object.values(CURRENT_PUBLIC_CONTRACT.operations),
    ...Object.values(CURRENT_PUBLIC_CONTRACT.values),
    ...Object.values(CURRENT_PUBLIC_CONTRACT.types)
  ];
  for (const publicRoot of publicRoots) {
    assert.equal(
      declarations.some((source) => hasAdjacentChineseJSDoc(source, publicRoot)),
      true,
      `emitted declaration is missing adjacent Chinese JSDoc for ${publicRoot}`
    );
  }

  const entrySource = readFileSync(join(declarationRoot, "index.d.ts"), "utf8");
  assert.match(entrySource, /@packageDocumentation/);
  assert.equal(
    declarations.some(
      (source) =>
        source.includes("@example 定义带 options、Records 与 messages 的自定义 Check") &&
        /export declare function defineCheck\b/.test(source)
    ),
    true,
    "emitted defineCheck declaration is missing its generated @example"
  );
}

function assertReadableRuntimeLayout(stagingDirectory: string): void {
  const facadePath = join(stagingDirectory, "index.mjs");
  assert.equal(readFileSync(facadePath, "utf8"), 'export * from "./dist/esm/index.mjs";\n');
  const runtimeDirectory = join(stagingDirectory, "dist", "esm");
  const runtimeFiles = readFilePaths(runtimeDirectory);
  assert.equal(
    runtimeFiles.some((path) => path.endsWith(".mjs")),
    true
  );
  assert.equal(
    runtimeFiles.some((path) => path.endsWith(".mjs.map")),
    true
  );
  assert.equal(
    runtimeFiles.some((path) => path.endsWith(".js")),
    false
  );
  const runtimeEntry = readFileSync(join(runtimeDirectory, "index.mjs"), "utf8");
  assert.match(runtimeEntry, /from "\.\/definition\/project-definition\.mjs"/);
  assert.match(runtimeEntry, /sourceMappingURL=index\.mjs\.map/);
  const sourceMap: unknown = JSON.parse(
    readFileSync(join(runtimeDirectory, "index.mjs.map"), "utf8")
  );
  if (
    !isRecord(sourceMap) ||
    sourceMap.file !== "index.mjs" ||
    !Array.isArray(sourceMap.sourcesContent) ||
    typeof sourceMap.sourcesContent[0] !== "string"
  ) {
    throw new TypeError("runtime source map must identify and embed its TypeScript entry source");
  }
  assert.equal(sourceMap.file, "index.mjs");
  assert.equal(
    sourceMap.sourcesContent[0],
    readFileSync(join(stagingDirectory, "src", "index.ts"), "utf8")
  );
}

function readDeclarationSources(root: string): readonly string[] {
  const sources: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile() && entry.name.endsWith(".d.ts")) {
        sources.push(readFileSync(path, "utf8"));
      }
    }
  };
  visit(root);
  return Object.freeze(sources);
}

function readFilePaths(root: string): readonly string[] {
  const paths: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile()) paths.push(path);
    }
  };
  visit(root);
  return Object.freeze(paths);
}

function hasAdjacentChineseJSDoc(source: string, declarationName: string): boolean {
  const escapedName = declarationName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `/\\*\\*(?:(?!\\*\\/)[\\s\\S])*?[\\u3400-\\u9fff](?:(?!\\*\\/)[\\s\\S])*?\\*\\/\\s*export(?:\\s+declare)?\\s+(?:const|function|interface|type)\\s+${escapedName}\\b`
  );
  return pattern.test(source);
}

function candidateDependencies(stagingDirectory: string): unknown {
  const manifest: unknown = JSON.parse(
    readFileSync(join(stagingDirectory, "package.json"), "utf8")
  );
  if (!isRecord(manifest)) throw new TypeError("candidate manifest must be an object");
  return manifest.dependencies;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function declaredRuntimeExports(entryPath: string): string {
  const source = readFileSync(entryPath, "utf8");
  const exports = [...source.matchAll(/export\s*\{([^}]+)\}\s*from\s*["']\.\//g)]
    .flatMap((match) =>
      match[1].split(",").map((name) =>
        name
          .trim()
          .split(/\s+as\s+/)
          .at(-1)
      )
    )
    .filter((name): name is string => name !== undefined)
    .sort((left, right) => left.localeCompare(right));
  return JSON.stringify(exports);
}
