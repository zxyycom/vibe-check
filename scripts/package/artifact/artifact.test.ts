import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  renameSync
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { after, describe, it } from "node:test";

import { CURRENT_PUBLIC_CONTRACT } from "../../package/public-api-inventory.ts";
import {
  PACKAGE_FUNCTION_METRICS_WORKER_PARENT_RUNTIME_PATH,
  PACKAGE_FUNCTION_METRICS_WORKER_RUNTIME_PATH,
  PACKAGE_MARKDOWN_LINK_WORKER_PARENT_RUNTIME_PATH,
  PACKAGE_MARKDOWN_LINK_WORKER_RUNTIME_PATH,
  PACKAGE_LIZARD_APACHE_LICENSE_PATH,
  PACKAGE_LIZARD_MIT_LICENSE_PATH,
  PACKAGE_PYGMENTS_LICENSE_PATH,
  PACKAGE_THIRD_PARTY_NOTICES_PATH,
  PACKAGE_TRANSLATED_ANALYZER_PROVENANCE_PATH
} from "../../package/package-contract.ts";
import {
  prepareArtifactAcceptanceInput,
  type ArtifactAcceptanceInput
} from "./acceptance-input.ts";
import {
  artifactDocumentation,
  type PackageDocumentationExpectation
} from "./documentation-audit.ts";
import { createWorkerMaterialFixture } from "./worker-material.test-support.ts";
import { buildCandidateArtifact } from "./build.ts";
import { createArtifactFingerprint } from "./fingerprint.ts";
import { publicRootExportNames } from "../public-exports.test-support.ts";
import { assertReadableStagingRuntimeLayout } from "./staging-runtime-layout.ts";
import { assertInstalledPrivateWorkerMaterials } from "./packed-tar-audit.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("package artifact", { concurrency: false, timeout: 20_000 }, () => {
  let fixturePromise:
    | Promise<
        Readonly<{
          artifact: ArtifactAcceptanceInput;
          documentation: PackageDocumentationExpectation;
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
        return prepareArtifactAcceptanceInput({
          repositoryRoot,
          buildDirect: (documentation) =>
            buildDirectArtifactFixture({
              buildDirectory,
              documentation,
              repositoryRoot,
              stateDirectory
            })
        });
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

  it("indexes adjacent Chinese JSDoc for each exported declaration", () => {
    const documentedNames = documentedDeclarationNames([
      "/** 中文说明 */\nexport declare const Constant: number;",
      "/** @remarks 中文说明 */\nexport declare function Function<T>(): T;",
      "/** 中文说明 */\texport interface Interface {}",
      "/** 中文说明 */ export type Type = string;",
      "/** 中文说明 */ export declare function Repeated(value: string): string;\n/** 中文说明 */ export declare function Repeated(value: number): number;",
      "/** 中文说明 */ const internal = 0;\nexport type Detached = string;",
      "/** 中文说明 */\n/** English only */\nexport type English = string;",
      "/* 中文普通注释 */\nexport type OrdinaryComment = string;",
      "/** 中文未闭合 export type Unclosed = string;",
      "/** 中文说明 */ export type TypeSuffix = string;"
    ]);
    assert.deepEqual([...documentedNames].sort(), [
      "Constant",
      "Function",
      "Interface",
      "Repeated",
      "Type",
      "TypeSuffix"
    ]);
    assert.equal(
      documentedDeclarationNames(["/** English only */ export type Type = string;"]).has("Type"),
      false
    );
  });

  it("emits a readable ESM runtime layout and exact exports", { timeout: 20_000 }, async () => {
    const { artifact } = await fixture();
    assert.equal(artifact.files.includes("package/dist/esm/index.mjs"), true);
    assert.equal(artifact.files.includes("package/dist/esm/index.mjs.map"), true);
    assert.equal(
      artifact.files.includes(`package/${PACKAGE_FUNCTION_METRICS_WORKER_RUNTIME_PATH}`),
      true
    );
    assertReadableRuntimeLayout(artifact.stagingDirectory);
    const workerParent = readFileSync(
      join(artifact.stagingDirectory, PACKAGE_FUNCTION_METRICS_WORKER_PARENT_RUNTIME_PATH),
      "utf8"
    );
    assert.equal(
      workerParent.split('new URL("./analyzer-worker.mjs", import.meta.url)').length - 1,
      1
    );
    assert.equal(
      artifact.files.includes(`package/${PACKAGE_MARKDOWN_LINK_WORKER_RUNTIME_PATH}`),
      true
    );
    const linkWorkerParent = readFileSync(
      join(artifact.stagingDirectory, PACKAGE_MARKDOWN_LINK_WORKER_PARENT_RUNTIME_PATH),
      "utf8"
    );
    assert.equal(
      linkWorkerParent.split('new URL("./io-worker.mjs", import.meta.url)').length - 1,
      1
    );
    assert.deepEqual(
      publicRootExportNames(join(artifact.stagingDirectory, "types", "index.d.ts")).types,
      Object.values(CURRENT_PUBLIC_CONTRACT.types).sort()
    );
  });

  it("rejects missing or malformed private Markdown Link Worker material", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-worker-material-"));
    try {
      const artifact = createWorkerMaterialFixture(root);
      const workerPath = join(artifact.stagingDirectory, PACKAGE_MARKDOWN_LINK_WORKER_RUNTIME_PATH);
      const parentPath = join(
        artifact.stagingDirectory,
        PACKAGE_MARKDOWN_LINK_WORKER_PARENT_RUNTIME_PATH
      );
      const parentSource = readFileSync(parentPath, "utf8");
      assertReadableStagingRuntimeLayout(artifact.stagingDirectory);
      assertInstalledPrivateWorkerMaterials({
        artifactPath: artifact.artifactPath,
        packageDirectory: artifact.stagingDirectory
      });
      renameSync(workerPath, `${workerPath}.missing`);
      try {
        assert.throws(() => {
          assertReadableStagingRuntimeLayout(artifact.stagingDirectory);
        }, /missing the emitted markdown-link Worker entry/u);
      } finally {
        renameSync(`${workerPath}.missing`, workerPath);
      }
      for (const malformed of [
        parentSource.replace("./io-worker.mjs", "../../../outside-worker.mjs"),
        `${parentSource}\nnew URL("./io-worker.mjs", import.meta.url);\n`
      ]) {
        try {
          writeFileSync(parentPath, malformed);
          assert.throws(() => {
            assertInstalledPrivateWorkerMaterials({
              artifactPath: artifact.artifactPath,
              packageDirectory: artifact.stagingDirectory
            });
          }, /installed private Worker material differs from the exact artifact/u);
          assert.throws(() => {
            assertReadableStagingRuntimeLayout(artifact.stagingDirectory);
          }, /must resolve exactly one emitted Worker URL/u);
        } finally {
          writeFileSync(parentPath, parentSource);
        }
      }
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("packages approved legal materials and excludes analyzer fixtures", async () => {
    const { artifact } = await fixture();
    assert.equal(artifact.files.includes("package/LICENSE"), true);
    assert.match(
      readFileSync(join(artifact.stagingDirectory, "LICENSE"), "utf8"),
      /^MIT License\n\nCopyright \(c\) 2026 zxyycom\n/u
    );
    for (const path of [
      PACKAGE_THIRD_PARTY_NOTICES_PATH,
      PACKAGE_LIZARD_MIT_LICENSE_PATH,
      PACKAGE_LIZARD_APACHE_LICENSE_PATH,
      PACKAGE_PYGMENTS_LICENSE_PATH,
      PACKAGE_TRANSLATED_ANALYZER_PROVENANCE_PATH
    ]) {
      assert.equal(artifact.files.includes(`package/${path}`), true);
    }
    assert.equal(artifact.files.includes("package/THIRD_PARTY_NOTICES.md"), false);
    assert.equal(
      artifact.files.some((path) => path.startsWith("package/third-party-licenses/")),
      false
    );
    assert.equal(
      readFileSync(join(artifact.stagingDirectory, PACKAGE_THIRD_PARTY_NOTICES_PATH), "utf8"),
      readFileSync(join(repositoryRoot, PACKAGE_THIRD_PARTY_NOTICES_PATH), "utf8")
    );
    assert.equal(
      artifact.files.some((path) => path.includes("/analyzer/fixtures/")),
      false
    );
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
    ...Object.values(CURRENT_PUBLIC_CONTRACT.checks),
    ...Object.values(CURRENT_PUBLIC_CONTRACT.parsers),
    ...Object.values(CURRENT_PUBLIC_CONTRACT.types)
  ];
  const documentedNames = documentedDeclarationNames(declarations);
  for (const publicRoot of publicRoots) {
    assert.equal(
      documentedNames.has(publicRoot),
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

/** Scans each emitted declaration once; only the immediately preceding JSDoc supplies its language. */
function documentedDeclarationNames(sources: readonly string[]): ReadonlySet<string> {
  const names = new Set<string>();
  const declarationPattern =
    /\s*export(?:\s+declare)?\s+(?:const|function|interface|type)\s+([A-Za-z_$][\w$]*)/y;
  for (const source of sources) {
    for (const comment of source.matchAll(/\/\*\*[\s\S]*?\*\//gu)) {
      if (!/[\u3400-\u9fff]/u.test(comment[0])) continue;
      declarationPattern.lastIndex = comment.index + comment[0].length;
      const declarationName = declarationPattern.exec(source)?.[1];
      if (declarationName !== undefined) names.add(declarationName);
    }
  }
  return names;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
