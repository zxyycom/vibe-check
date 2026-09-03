import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { after, describe, it } from "node:test";

import { CURRENT_PUBLIC_CONTRACT } from "../../package/public-api-inventory.ts";
import { RUNTIME_EXPORTS } from "../../package/package-contract.ts";
import {
  readGateArtifactAcceptanceInput,
  type ArtifactAcceptanceInput
} from "./acceptance-input.ts";
import { artifactDocumentation } from "./documentation-audit.ts";
import { buildCandidateArtifact } from "./build.ts";
import { createArtifactFingerprint } from "./fingerprint.ts";
import { auditStagingRuntime } from "./staging-audit.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("package artifact", { concurrency: false, timeout: 20_000 }, () => {
  let fixturePromise:
    | Promise<
        Readonly<{
          artifact: ArtifactAcceptanceInput;
          documentation: ReturnType<typeof artifactDocumentation>;
        }>
      >
    | undefined;
  let fixtureRoot: string | undefined;

  const fixture = () => {
    if (fixturePromise === undefined) {
      fixtureRoot = mkdtempSync(join(tmpdir(), "vibe-check-package-artifact-"));
      fixturePromise = (async () => {
        if (fixtureRoot === undefined) throw new Error("artifact fixture root must exist");
        const buildDirectory = join(fixtureRoot, "build");
        const stateDirectory = join(fixtureRoot, "state");
        const documentation = artifactDocumentation(repositoryRoot);
        const gateInput = readGateArtifactAcceptanceInput();
        if (gateInput !== undefined) {
          auditStagingRuntime({
            candidateVersion: gateInput.candidateVersion,
            expectedDocuments: documentation.documents,
            expectedJSDocExamplePayloads: documentation.expectedJSDocExamplePayloads,
            expectedMachineMaterials: documentation.machineMaterials,
            expectedReadme: documentation.readme,
            stagingDirectory: gateInput.stagingDirectory
          });
        }
        const artifact =
          gateInput ??
          (await buildDirectArtifactFixture({
            buildDirectory,
            documentation,
            repositoryRoot,
            stateDirectory
          }));
        return Object.freeze({ artifact, documentation });
      })();
    }
    return fixturePromise;
  };

  after(() => {
    if (fixtureRoot !== undefined) rmSync(fixtureRoot, { force: true, recursive: true });
  });

  it("packages approved docs and machine materials", { timeout: 20_000 }, async () => {
    const { artifact, documentation } = await fixture();
    assert.equal(existsSync(artifact.artifactPath), true);
    assert.equal(artifact.files.includes("package/README.md"), true);
    assert.equal(artifact.files.includes("package/docs/api-mechanics.md"), true);
    assert.equal(artifact.files.includes("package/docs/index.md"), false);
    assert.equal(artifact.files.includes("package/docs/checks/index.md"), false);
    for (const document of documentation.documents) {
      assert.equal(artifact.files.includes(`package/${document.packagePath}`), true);
      assert.equal(
        readFileSync(join(artifact.stagingDirectory, document.packagePath), "utf8"),
        document.content
      );
    }
    for (const material of documentation.machineMaterials) {
      assert.equal(artifact.files.includes(`package/${material.packagePath}`), true);
      assert.equal(
        readFileSync(join(artifact.stagingDirectory, material.packagePath)).equals(
          material.content
        ),
        true
      );
    }
    assert.equal(
      readFileSync(join(artifact.stagingDirectory, "README.md"), "utf8"),
      documentation.readme
    );
  });

  it("emits documented public declarations", { timeout: 20_000 }, async () => {
    const { artifact } = await fixture();
    assert.equal(artifact.files.includes("package/src/index.ts"), true);
    assertEmittedPublicDocumentation(artifact.stagingDirectory);
  });

  it("emits a readable ESM runtime layout and exact exports", { timeout: 20_000 }, async () => {
    const { artifact } = await fixture();
    assert.equal(artifact.files.includes("package/dist/esm/index.mjs"), true);
    assert.equal(artifact.files.includes("package/dist/esm/index.mjs.map"), true);
    assertReadableRuntimeLayout(artifact.stagingDirectory);
    assert.equal(
      declaredRuntimeExports(join(artifact.stagingDirectory, "dist", "esm", "index.mjs")),
      JSON.stringify(RUNTIME_EXPORTS)
    );
  });

  it("declares the audited production dependency set", { timeout: 20_000 }, async () => {
    const { artifact } = await fixture();
    assert.deepEqual(candidateDependencies(artifact.stagingDirectory), {
      "@humanwhocodes/momoa": "3.3.12",
      ajv: "8.20.0",
      "csv-parse": "7.0.1",
      execa: "9.6.1",
      "github-slugger": "2.0.0",
      immutable: "5.1.9",
      jscpd: "^5.1.1",
      "mdast-util-from-markdown": "2.0.3",
      "mdast-util-frontmatter": "2.0.1",
      "mdast-util-gfm": "3.1.0",
      "micromark-extension-frontmatter": "2.0.0",
      "micromark-extension-gfm": "3.0.0",
      minimatch: "10.2.5",
      neverthrow: "8.2.0",
      typebox: "1.3.9"
    });
  });

  it("declares the approved MIT, Bun host, repository, and public registry contract", async () => {
    const { artifact } = await fixture();
    const manifest = candidateManifest(artifact.stagingDirectory);
    assert.equal(manifest.name, "@zxyycom/vibe-check");
    assert.equal(artifact.files.includes("package/LICENSE"), true);
    assert.match(
      readFileSync(join(artifact.stagingDirectory, "LICENSE"), "utf8"),
      /^MIT License\n\nCopyright \(c\) 2026 zxyycom\n/u
    );
    assert.equal(manifest.license, "MIT");
    assert.deepEqual(manifest.engines, { bun: ">=1.3.14" });
    assert.deepEqual(manifest.repository, {
      type: "git",
      url: "git+https://github.com/zxyycom/vibe-check.git"
    });
    assert.deepEqual(manifest.publishConfig, {
      access: "public",
      registry: "https://registry.npmjs.org/"
    });
    assert.equal(Object.hasOwn(manifest, "private"), false);
    assert.equal(Object.hasOwn(manifest, "bin"), false);
    assert.equal(Object.hasOwn(manifest, "scripts"), false);
    assert.ok(isRecord(manifest.exports));
    assert.deepEqual(Object.keys(manifest.exports), ["."]);
  });
});

async function buildDirectArtifactFixture(input: {
  readonly buildDirectory: string;
  readonly documentation: ReturnType<typeof artifactDocumentation>;
  readonly repositoryRoot: string;
  readonly stateDirectory: string;
}) {
  const inputFingerprint = createArtifactFingerprint(input.repositoryRoot);
  return buildCandidateArtifact({
    artifactDirectory: join(input.buildDirectory, "artifacts"),
    candidateVersion: `0.0.0-local.${inputFingerprint.slice(0, 12)}`,
    documentation: input.documentation,
    inputFingerprint,
    repositoryRoot: input.repositoryRoot,
    stagingDirectory: join(input.buildDirectory, "package"),
    tsBuildInfoPath: join(input.stateDirectory, "candidate.tsbuildinfo")
  });
}

function assertEmittedPublicDocumentation(stagingDirectory: string): void {
  const declarationRoot = join(stagingDirectory, "types");
  const declarations = readDeclarationSources(declarationRoot);
  const publicRoots = [
    ...Object.values(CURRENT_PUBLIC_CONTRACT.defaults),
    ...Object.values(CURRENT_PUBLIC_CONTRACT.operations),
    ...Object.values(CURRENT_PUBLIC_CONTRACT.parsers),
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
  assert.match(runtimeEntry, /from "\.\/project-definition\/project-definition\.mjs"/);
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
  return candidateManifest(stagingDirectory).dependencies;
}

function candidateManifest(stagingDirectory: string): Readonly<Record<string, unknown>> {
  const manifest: unknown = JSON.parse(
    readFileSync(join(stagingDirectory, "package.json"), "utf8")
  );
  if (!isRecord(manifest)) throw new TypeError("candidate manifest must be an object");
  return manifest;
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
