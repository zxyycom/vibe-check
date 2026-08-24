import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
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
      assert.equal(
        readFileSync(join(artifact.stagingDirectory, "README.md"), "utf8"),
        documentation.readme
      );
      assertEmittedPublicDocumentation(artifact.stagingDirectory);
      assert.equal(
        runtimeExports(join(artifact.stagingDirectory, "index.mjs")),
        '["defineCheck","defineConfig","duplicateDetection","fileMetrics","functionMetrics","inherit","run"]'
      );
      assert.deepEqual(candidateDependencies(artifact.stagingDirectory), {
        jscpd: "5.0.11",
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

function runtimeExports(entryPath: string): string {
  const result = spawnSync(
    process.execPath,
    [
      "-e",
      "import(process.argv[1]).then((module) => process.stdout.write(JSON.stringify(Object.keys(module).sort())))",
      pathToFileURL(entryPath).href
    ],
    { encoding: "utf8" }
  );
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}
