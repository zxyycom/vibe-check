import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { CURRENT_PUBLIC_CONTRACT } from "../../src/product/public-contract/current.ts";
import {
  renderPackageApiDocumentation,
  type RenderedPackageApiDocumentation
} from "../docs/package-api-docs/render.ts";
import { PACKAGE_API_EXAMPLE_PROJECTIONS } from "../docs/package-api-docs/registry.ts";

const CANDIDATE_NAME = "vibe-check";
const JSCPD_BIN_NAME = "jscpd";
const JSCPD_PACKAGE_NAME = "jscpd";
const RECEIPT_SCHEMA_VERSION = 1;
const CANDIDATE_DEPENDENCIES = Object.freeze({
  jscpd: "5.0.11",
  neverthrow: "8.2.0",
  typebox: "1.3.9"
});
const RUNTIME_EXPORTS = Object.freeze(
  [
    ...Object.values(CURRENT_PUBLIC_CONTRACT.operations),
    ...Object.values(CURRENT_PUBLIC_CONTRACT.values)
  ].sort()
);
const PACKAGE_ENTRY_PATH = "index.mjs";
const PACKAGE_TYPES_PATH = "types/scripts/package-candidate/entry.d.ts";
const PACKAGE_README_PATH = "README.md";
const DOCUMENTATION_INPUT_PATHS = Object.freeze([
  "docs/package-readme.template.md",
  "scripts/docs/package-api-docs/registry.ts",
  "scripts/docs/package-api-docs/render.ts"
]);
const DOCUMENTATION_EXAMPLES_DIRECTORY = "docs/examples/package-api";

export interface CandidateArtifact {
  readonly artifactPath: string;
  readonly candidateVersion: string;
  readonly files: readonly string[];
  readonly inputFingerprint: string;
  readonly sha256: string;
  readonly stagingDirectory: string;
}

export interface PreparedPackageCandidate extends CandidateArtifact {
  readonly consumerDirectory: string;
  readonly installedPackageDirectory: string;
  readonly resolvedEntryPath: string;
  /** True only when no build, pack, or local install was needed. */
  readonly reused: boolean;
}

export interface PreparePackageCandidateOptions {
  /** Defaults to this checkout's repository root. */
  readonly repositoryRoot?: string;
  /** Defaults to `<repositoryRoot>/scripts/quality`. */
  readonly consumerDirectory?: string;
  /** Defaults to the ignored candidate state directory in this checkout. */
  readonly stateDirectory?: string;
}

interface CandidateReceipt {
  readonly schemaVersion: 1;
  readonly artifact: Readonly<{
    readonly path: string;
    readonly sha256: string;
  }>;
  readonly candidateVersion: string;
  readonly consumer: Readonly<{
    readonly directory: string;
    readonly installedPackageDirectory: string;
    readonly resolvedEntryPath: string;
    readonly resolvedEntrySha256: string;
  }>;
  readonly files: readonly string[];
  readonly inputFingerprint: string;
}

interface CandidatePaths {
  readonly artifactDirectory: string;
  readonly receiptPath: string;
  readonly stagingDirectory: string;
  readonly stateDirectory: string;
}

interface ReusableCandidateArtifact {
  readonly artifact: CandidateArtifact;
  readonly receipt: CandidateReceipt;
}

interface TarEntry {
  readonly content: Buffer;
  readonly path: string;
}

/**
 * Creates or safely reuses the one local package candidate consumed by
 * repository scripts. It never falls back to a candidate whose receipt,
 * tarball, installed package, or resolved entry no longer matches current
 * inputs.
 */
export async function preparePackageCandidate(
  options: PreparePackageCandidateOptions = {}
): Promise<PreparedPackageCandidate> {
  const repositoryRoot = resolve(options.repositoryRoot ?? repositoryRootFromModule());
  const consumerDirectory = resolve(
    options.consumerDirectory ?? join(repositoryRoot, "scripts/quality")
  );
  const paths = candidatePaths(repositoryRoot, options.stateDirectory);
  const documentation = renderPackageApiDocumentation({ repositoryRoot });
  assertDocumentationMatchesSource(repositoryRoot, documentation);
  const expectedJSDocExamplePayloads = jsdocExamplePayloads(documentation);
  const inputFingerprint = createInputFingerprint(repositoryRoot);
  const candidateVersion = `0.0.0-local.${inputFingerprint.slice(0, 12)}`;

  const reusable = readReusableArtifact({
    candidateVersion,
    expectedJSDocExamplePayloads,
    expectedReadme: documentation.readme.content,
    inputFingerprint,
    paths
  });
  if (reusable !== undefined) {
    const installation = inspectInstallation({
      candidateVersion,
      consumerDirectory,
      expectedJSDocExamplePayloads,
      expectedReadme: documentation.readme.content
    });
    if (
      installation !== undefined &&
      receiptMatchesInstallation(reusable.receipt, consumerDirectory, installation)
    ) {
      return preparedCandidate({
        artifact: reusable.artifact,
        consumerDirectory,
        installation,
        reused: true
      });
    }
    const installationAfterInstall = installCandidate({
      artifactPath: reusable.artifact.artifactPath,
      candidateVersion,
      consumerDirectory,
      expectedJSDocExamplePayloads,
      expectedReadme: documentation.readme.content
    });
    const receipt = receiptFor({
      artifact: reusable.artifact,
      consumerDirectory,
      installation: installationAfterInstall
    });
    writeReceipt(paths.receiptPath, receipt);
    return preparedCandidate({
      artifact: reusable.artifact,
      consumerDirectory,
      installation: installationAfterInstall,
      reused: false
    });
  }

  clearCandidateState(paths);
  const artifact = await buildCandidateArtifact({
    candidateVersion,
    documentation,
    expectedJSDocExamplePayloads,
    inputFingerprint,
    paths,
    repositoryRoot
  });
  const installation = installCandidate({
    artifactPath: artifact.artifactPath,
    candidateVersion,
    consumerDirectory,
    expectedJSDocExamplePayloads,
    expectedReadme: documentation.readme.content
  });
  writeReceipt(paths.receiptPath, receiptFor({ artifact, consumerDirectory, installation }));
  return preparedCandidate({ artifact, consumerDirectory, installation, reused: false });
}

function repositoryRootFromModule(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "../..");
}

function candidatePaths(
  repositoryRoot: string,
  stateDirectory: string | undefined
): CandidatePaths {
  const root = resolve(
    stateDirectory ?? join(repositoryRoot, ".cache/vibe-check/package-candidate")
  );
  return Object.freeze({
    artifactDirectory: join(root, "artifacts"),
    receiptPath: join(root, "preparation-receipt.json"),
    stagingDirectory: join(root, "staging"),
    stateDirectory: root
  });
}

function createInputFingerprint(repositoryRoot: string): string {
  const hash = createHash("sha256");
  hash.update(`bun=${bunVersion()}\0`);
  hash.update(`candidate-dependencies=${JSON.stringify(CANDIDATE_DEPENDENCIES)}\0`);

  const inputFiles = [
    ...collectRuntimeSourceFiles(join(repositoryRoot, "src/product")),
    ...documentationInputFiles(repositoryRoot),
    join(repositoryRoot, "scripts/package-candidate/entry.ts"),
    join(repositoryRoot, "scripts/package-candidate/index.ts")
  ].sort();
  for (const filePath of inputFiles) {
    const relativePath = relative(repositoryRoot, filePath).split(sep).join("/");
    hash.update(relativePath);
    hash.update("\0");
    hash.update(readFileSync(filePath));
    hash.update("\0");
  }
  return hash.digest("hex");
}

function documentationInputFiles(repositoryRoot: string): readonly string[] {
  return Object.freeze([
    ...DOCUMENTATION_INPUT_PATHS.map((path) => join(repositoryRoot, path)),
    ...collectFiles(join(repositoryRoot, DOCUMENTATION_EXAMPLES_DIRECTORY), (path) =>
      path.endsWith(".ts")
    )
  ]);
}

function assertDocumentationMatchesSource(
  repositoryRoot: string,
  documentation: RenderedPackageApiDocumentation
): void {
  const expectedReadmePath = join(repositoryRoot, PACKAGE_README_PATH);
  if (resolve(documentation.readme.path) !== expectedReadmePath) {
    throw new Error(
      `documentation operation must render ${expectedReadmePath}; received ${documentation.readme.path}`
    );
  }
  assertFileContentMatches(documentation.readme);
  for (const jsdocSource of documentation.jsdocSources) {
    if (!isWithin(repositoryRoot, jsdocSource.path)) {
      throw new Error(
        `documentation operation returned a JSDoc source outside the repository: ${jsdocSource.path}`
      );
    }
    assertFileContentMatches(jsdocSource);
  }
}

function assertFileContentMatches(
  expected: Readonly<{ readonly content: string; readonly path: string }>
): void {
  if (!existsSync(expected.path)) {
    throw new Error(`checked-in documentation projection is missing: ${expected.path}`);
  }
  if (readFileSync(expected.path, "utf8") !== expected.content) {
    throw new Error(`checked-in documentation projection is stale: ${expected.path}`);
  }
}

function jsdocExamplePayloads(documentation: RenderedPackageApiDocumentation): readonly string[] {
  const payloads = documentation.jsdocSources.flatMap(({ content }) =>
    [...content.matchAll(/@example[^\n]*\n \* ```ts\n([\s\S]*?)\n \* ```/g)].map((match) =>
      match[1]
        .split("\n")
        .map((line) => line.replace(/^ \* ?/, ""))
        .join("\n")
    )
  );
  const expectedPayloadCount = PACKAGE_API_EXAMPLE_PROJECTIONS.reduce(
    (count, projection) =>
      count + projection.targets.filter((target) => target.kind === "jsdoc").length,
    0
  );
  if (payloads.length !== expectedPayloadCount) {
    throw new Error(
      "documentation operation did not provide every registry-managed JSDoc example payload"
    );
  }
  return Object.freeze(payloads);
}

function collectRuntimeSourceFiles(sourceRoot: string): readonly string[] {
  return collectFiles(
    sourceRoot,
    (relativePath) =>
      relativePath.endsWith(".ts") &&
      !relativePath.endsWith(".test.ts") &&
      !relativePath.endsWith(".test-support.ts") &&
      !relativePath.endsWith("bun-test.d.ts")
  );
}

function collectFiles(root: string, include: (relativePath: string) => boolean): readonly string[] {
  const files: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const filePath = join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(filePath);
      } else if (entry.isFile()) {
        const relativePath = relative(root, filePath).split(sep).join("/");
        if (include(relativePath)) files.push(filePath);
      }
    }
  };
  visit(root);
  return Object.freeze(files.sort());
}

function readReusableArtifact(input: {
  readonly candidateVersion: string;
  readonly expectedJSDocExamplePayloads: readonly string[];
  readonly expectedReadme: string;
  readonly inputFingerprint: string;
  readonly paths: CandidatePaths;
}): ReusableCandidateArtifact | undefined {
  const receipt = readReceipt(input.paths.receiptPath);
  if (
    receipt === undefined ||
    receipt.inputFingerprint !== input.inputFingerprint ||
    receipt.candidateVersion !== input.candidateVersion
  ) {
    return undefined;
  }
  const artifact = artifactFromReceipt(receipt, input.paths);
  if (artifact === undefined) return undefined;
  try {
    auditStagingRuntime({
      expectedJSDocExamplePayloads: input.expectedJSDocExamplePayloads,
      expectedReadme: input.expectedReadme,
      stagingDirectory: artifact.stagingDirectory
    });
    auditCandidateArtifact({
      artifactPath: artifact.artifactPath,
      candidateVersion: artifact.candidateVersion,
      expectedFiles: artifact.files,
      expectedJSDocExamplePayloads: input.expectedJSDocExamplePayloads,
      expectedReadme: input.expectedReadme,
      expectedSha256: artifact.sha256
    });
  } catch {
    return undefined;
  }
  return Object.freeze({ artifact, receipt });
}

function readReceipt(receiptPath: string): CandidateReceipt | undefined {
  if (!existsSync(receiptPath)) return undefined;
  try {
    const value: unknown = JSON.parse(readFileSync(receiptPath, "utf8"));
    return isCandidateReceipt(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

function isCandidateReceipt(value: unknown): value is CandidateReceipt {
  if (!isRecord(value) || value.schemaVersion !== RECEIPT_SCHEMA_VERSION) return false;
  if (
    typeof value.inputFingerprint !== "string" ||
    typeof value.candidateVersion !== "string" ||
    !isRecord(value.artifact) ||
    typeof value.artifact.path !== "string" ||
    typeof value.artifact.sha256 !== "string" ||
    !isRecord(value.consumer) ||
    typeof value.consumer.directory !== "string" ||
    typeof value.consumer.installedPackageDirectory !== "string" ||
    typeof value.consumer.resolvedEntryPath !== "string" ||
    typeof value.consumer.resolvedEntrySha256 !== "string" ||
    !Array.isArray(value.files) ||
    !value.files.every((file) => typeof file === "string")
  ) {
    return false;
  }
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function artifactFromReceipt(
  receipt: CandidateReceipt,
  paths: CandidatePaths
): CandidateArtifact | undefined {
  const artifactPath = resolve(receipt.artifact.path);
  if (!isWithin(paths.stateDirectory, artifactPath) || !existsSync(artifactPath)) return undefined;
  return Object.freeze({
    artifactPath,
    candidateVersion: receipt.candidateVersion,
    files: Object.freeze([...receipt.files]),
    inputFingerprint: receipt.inputFingerprint,
    sha256: receipt.artifact.sha256,
    stagingDirectory: paths.stagingDirectory
  });
}

function clearCandidateState(paths: CandidatePaths): void {
  rmSync(paths.stagingDirectory, { force: true, recursive: true });
  rmSync(paths.artifactDirectory, { force: true, recursive: true });
  rmSync(paths.receiptPath, { force: true });
  rmSync(join(paths.stateDirectory, "candidate.tsbuildinfo"), { force: true });
  mkdirSync(paths.stateDirectory, { recursive: true });
}

async function buildCandidateArtifact(input: {
  readonly candidateVersion: string;
  readonly documentation: RenderedPackageApiDocumentation;
  readonly expectedJSDocExamplePayloads: readonly string[];
  readonly inputFingerprint: string;
  readonly paths: CandidatePaths;
  readonly repositoryRoot: string;
}): Promise<CandidateArtifact> {
  const {
    candidateVersion,
    documentation,
    expectedJSDocExamplePayloads,
    inputFingerprint,
    paths,
    repositoryRoot
  } = input;
  mkdirSync(paths.stagingDirectory, { recursive: true });
  writeCandidateManifest(join(paths.stagingDirectory, "package.json"), candidateVersion);
  writeFileSync(
    join(paths.stagingDirectory, PACKAGE_README_PATH),
    documentation.readme.content,
    "utf8"
  );

  runBun({
    args: [
      "build",
      join(repositoryRoot, "scripts/package-candidate/entry.ts"),
      "--target=bun",
      "--format=esm",
      "--packages=bundle",
      "--sourcemap=none",
      `--outfile=${join(paths.stagingDirectory, PACKAGE_ENTRY_PATH)}`
    ],
    cwd: repositoryRoot,
    phase: "build runtime"
  });
  runBun({
    args: [
      "x",
      "--no-install",
      "tsgo",
      "--ignoreConfig",
      "--allowImportingTsExtensions",
      "--erasableSyntaxOnly",
      "--incremental",
      "--module",
      "nodenext",
      "--moduleResolution",
      "nodenext",
      "--strict",
      "--target",
      "esnext",
      "--types",
      "node",
      "--verbatimModuleSyntax",
      "--rewriteRelativeImportExtensions",
      "--declaration",
      "--emitDeclarationOnly",
      "--outDir",
      join(paths.stagingDirectory, "types"),
      "--rootDir",
      repositoryRoot,
      "--tsBuildInfoFile",
      join(paths.stateDirectory, "candidate.tsbuildinfo"),
      join(repositoryRoot, "scripts/package-candidate/entry.ts")
    ],
    cwd: repositoryRoot,
    phase: "emit declarations"
  });

  auditStagingRuntime({
    expectedJSDocExamplePayloads,
    expectedReadme: documentation.readme.content,
    stagingDirectory: paths.stagingDirectory
  });
  const expectedFiles = collectFiles(paths.stagingDirectory, () => true).map(
    (filePath) => `package/${relative(paths.stagingDirectory, filePath).split(sep).join("/")}`
  );
  const artifactPath = join(paths.artifactDirectory, `${CANDIDATE_NAME}-${candidateVersion}.tgz`);
  mkdirSync(paths.artifactDirectory, { recursive: true });
  runBun({
    args: ["pm", "pack", `--destination=${paths.artifactDirectory}`, "--ignore-scripts", "--quiet"],
    cwd: paths.stagingDirectory,
    phase: "pack candidate"
  });
  if (!existsSync(artifactPath)) {
    throw new Error(`candidate pack did not produce expected artifact ${artifactPath}`);
  }
  const sha256 = sha256File(artifactPath);
  auditCandidateArtifact({
    artifactPath,
    candidateVersion,
    expectedFiles,
    expectedJSDocExamplePayloads,
    expectedReadme: documentation.readme.content,
    expectedSha256: sha256
  });
  return Object.freeze({
    artifactPath,
    candidateVersion,
    files: Object.freeze(expectedFiles),
    inputFingerprint,
    sha256,
    stagingDirectory: paths.stagingDirectory
  });
}

function writeCandidateManifest(manifestPath: string, version: string): void {
  const manifest = {
    name: CANDIDATE_NAME,
    version,
    type: "module",
    exports: {
      ".": {
        types: `./${PACKAGE_TYPES_PATH}`,
        import: `./${PACKAGE_ENTRY_PATH}`
      }
    },
    files: [PACKAGE_ENTRY_PATH, PACKAGE_README_PATH, "types"],
    dependencies: CANDIDATE_DEPENDENCIES
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function auditStagingRuntime(input: {
  readonly expectedJSDocExamplePayloads: readonly string[];
  readonly expectedReadme: string;
  readonly stagingDirectory: string;
}): void {
  const { expectedJSDocExamplePayloads, expectedReadme, stagingDirectory } = input;
  const entryPath = join(stagingDirectory, PACKAGE_ENTRY_PATH);
  const typesPath = join(stagingDirectory, PACKAGE_TYPES_PATH);
  if (!existsSync(entryPath) || !existsSync(typesPath)) {
    throw new Error("candidate staging is missing its public runtime entry or declarations entry");
  }
  assertFileContentMatches({
    content: expectedReadme,
    path: join(stagingDirectory, PACKAGE_README_PATH)
  });
  assertJSDocExamplePayloads({
    declarationSources: collectFiles(join(stagingDirectory, "types"), (path) =>
      path.endsWith(".d.ts")
    ).map((path) => readFileSync(path, "utf8")),
    description: "candidate staging declarations",
    expectedPayloads: expectedJSDocExamplePayloads
  });
  const actualExports = [
    ...parseStringArray(
      runBun({
        args: [
          "-e",
          "import(process.argv[1]).then((module) => process.stdout.write(JSON.stringify(Object.keys(module).sort())))",
          pathToFileURL(entryPath).href
        ],
        cwd: stagingDirectory,
        phase: "audit runtime exports"
      }),
      "candidate runtime export list"
    )
  ].sort();
  if (!sameStrings(actualExports, RUNTIME_EXPORTS)) {
    throw new Error(
      `candidate runtime exports must be ${RUNTIME_EXPORTS.join(", ")}; received ${actualExports.join(", ")}`
    );
  }
  const typesSource = readFileSync(typesPath, "utf8");
  if (typesSource.includes("export *")) {
    throw new Error("candidate declarations must not use wildcard public exports");
  }
  const unexpectedFiles = collectFiles(stagingDirectory, () => true)
    .map((filePath) => relative(stagingDirectory, filePath).split(sep).join("/"))
    .filter(
      (filePath) =>
        filePath !== "package.json" &&
        filePath !== PACKAGE_ENTRY_PATH &&
        filePath !== PACKAGE_README_PATH &&
        !(filePath.startsWith("types/") && filePath.endsWith(".d.ts"))
    );
  if (unexpectedFiles.length > 0) {
    throw new Error(
      `candidate staging contains materials outside its allowlisted runtime and declaration inventory: ${unexpectedFiles.join(", ")}`
    );
  }
}

function auditCandidateArtifact(input: {
  readonly artifactPath: string;
  readonly candidateVersion: string;
  readonly expectedFiles: readonly string[];
  readonly expectedJSDocExamplePayloads: readonly string[];
  readonly expectedReadme: string;
  readonly expectedSha256: string;
}): void {
  const actualSha256 = sha256File(input.artifactPath);
  if (actualSha256 !== input.expectedSha256) {
    throw new Error(`candidate artifact digest changed for ${input.artifactPath}`);
  }
  const entries = readTarEntries(input.artifactPath);
  const files = entries.map((entry) => entry.path).sort();
  if (!sameStrings(files, input.expectedFiles)) {
    throw new Error(
      `candidate artifact files differ from the staging allowlist: expected ${input.expectedFiles.join(", ")}; received ${files.join(", ")}`
    );
  }
  const manifestEntry = entries.find((entry) => entry.path === "package/package.json");
  if (manifestEntry === undefined)
    throw new Error("candidate artifact is missing package/package.json");
  const readmeEntry = entries.find((entry) => entry.path === `package/${PACKAGE_README_PATH}`);
  if (readmeEntry === undefined)
    throw new Error(`candidate artifact is missing package/${PACKAGE_README_PATH}`);
  if (!readmeEntry.content.equals(Buffer.from(input.expectedReadme, "utf8"))) {
    throw new Error("candidate artifact README does not match the documentation projection");
  }
  assertJSDocExamplePayloads({
    declarationSources: entries
      .filter((entry) => entry.path.startsWith("package/types/") && entry.path.endsWith(".d.ts"))
      .map((entry) => entry.content.toString("utf8")),
    description: "candidate artifact declarations",
    expectedPayloads: input.expectedJSDocExamplePayloads
  });
  auditManifest(manifestEntry.content, input.candidateVersion, entries);
}

function assertJSDocExamplePayloads(input: {
  readonly declarationSources: readonly string[];
  readonly description: string;
  readonly expectedPayloads: readonly string[];
}): void {
  const { declarationSources, description, expectedPayloads } = input;
  for (const payload of expectedPayloads) {
    const expectedCommentPayload = payload
      .split("\n")
      .map((line) => (line.length === 0 ? " *" : ` * ${line}`))
      .join("\n");
    if (!declarationSources.some((source) => source.includes(expectedCommentPayload))) {
      throw new Error(`${description} is missing a generated JSDoc example payload`);
    }
  }
}

function auditManifest(
  source: Buffer,
  candidateVersion: string,
  entries: readonly TarEntry[]
): void {
  let manifest: unknown;
  try {
    manifest = JSON.parse(source.toString("utf8"));
  } catch (error: unknown) {
    throw new Error(`candidate artifact manifest is invalid JSON: ${errorMessage(error)}`, {
      cause: error
    });
  }
  if (!isRecord(manifest)) throw new Error("candidate artifact manifest must be an object");
  if (
    manifest.name !== CANDIDATE_NAME ||
    manifest.version !== candidateVersion ||
    manifest.type !== "module"
  ) {
    throw new Error("candidate artifact manifest identity does not match the prepared candidate");
  }
  if (Object.hasOwn(manifest, "bin")) {
    throw new Error("candidate artifact must not expose an executable bin");
  }
  if (!sameDependencies(manifest.dependencies)) {
    throw new Error(
      "candidate artifact production dependencies do not match the candidate dependency contract"
    );
  }
  if (!hasPublicExports(manifest.exports)) {
    throw new Error(
      "candidate artifact must expose only its approved import and declarations entries"
    );
  }
  if (
    !entries.some((entry) => entry.path === `package/${PACKAGE_ENTRY_PATH}`) ||
    !entries.some((entry) => entry.path === `package/${PACKAGE_TYPES_PATH}`) ||
    !entries.some((entry) => entry.path === `package/${PACKAGE_README_PATH}`)
  ) {
    throw new Error(
      "candidate artifact is missing its approved runtime, declarations, or README entry"
    );
  }
}

function sameDependencies(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const dependencies = Object.entries(CANDIDATE_DEPENDENCIES);
  return (
    Object.keys(value).sort().join("\0") === dependencies.map(([key]) => key).join("\0") &&
    dependencies.every(([key, version]) => value[key] === version)
  );
}

function hasPublicExports(value: unknown): boolean {
  if (!isRecord(value) || Object.keys(value).length !== 1 || !isRecord(value["."])) return false;
  const root = value["."];
  return (
    Object.keys(root).sort().join("\0") === "import\0types" &&
    root.import === `./${PACKAGE_ENTRY_PATH}` &&
    root.types === `./${PACKAGE_TYPES_PATH}`
  );
}

function readTarEntries(artifactPath: string): readonly TarEntry[] {
  let archive: Buffer;
  try {
    archive = gunzipSync(readFileSync(artifactPath));
  } catch (error: unknown) {
    throw new Error(`could not read candidate artifact ${artifactPath}: ${errorMessage(error)}`, {
      cause: error
    });
  }
  const entries: TarEntry[] = [];
  let offset = 0;
  while (offset + 512 <= archive.length) {
    const header = archive.subarray(offset, offset + 512);
    if (header.every((value) => value === 0)) break;
    const size = parseTarSize(header.subarray(124, 136));
    const type = header[156];
    const path = tarPath(header);
    const contentStart = offset + 512;
    const contentEnd = contentStart + size;
    if (contentEnd > archive.length)
      throw new Error(`candidate artifact ${artifactPath} has a truncated tar entry`);
    const isDirectory = type === 53;
    const isRegularFile = type === 0 || type === 48;
    if (!isDirectory && !isRegularFile) {
      throw new Error(`candidate artifact contains unsupported tar entry type for ${path}`);
    }
    if (!isDirectory)
      entries.push(Object.freeze({ content: archive.subarray(contentStart, contentEnd), path }));
    offset = contentStart + Math.ceil(size / 512) * 512;
  }
  return Object.freeze(entries.sort((left, right) => left.path.localeCompare(right.path)));
}

function parseTarSize(source: Buffer): number {
  const text = source.toString("utf8").replace(/\0/g, "").trim();
  if (!/^[0-7]*$/.test(text))
    throw new Error("candidate artifact contains an invalid tar entry size");
  return text === "" ? 0 : Number.parseInt(text, 8);
}

function tarPath(header: Buffer): string {
  const name = tarString(header.subarray(0, 100));
  const prefix = tarString(header.subarray(345, 500));
  const path = prefix ? `${prefix}/${name}` : name;
  if (path.length === 0 || path.startsWith("/") || path.includes("../")) {
    throw new Error("candidate artifact contains an unsafe tar path");
  }
  return path;
}

function tarString(source: Buffer): string {
  const terminator = source.indexOf(0);
  return source.subarray(0, terminator === -1 ? source.length : terminator).toString("utf8");
}

function installCandidate(input: {
  readonly artifactPath: string;
  readonly candidateVersion: string;
  readonly consumerDirectory: string;
  readonly expectedJSDocExamplePayloads: readonly string[];
  readonly expectedReadme: string;
}): InstalledCandidate {
  const {
    artifactPath,
    candidateVersion,
    consumerDirectory,
    expectedJSDocExamplePayloads,
    expectedReadme
  } = input;
  if (!isPrivateCandidateConsumer(consumerDirectory)) {
    throw new Error(
      `candidate consumer ${consumerDirectory} must provide a package.json with private: true before local installation`
    );
  }
  // This directory is a dedicated private candidate consumer. Replacing its whole
  // install prevents Bun from satisfying a missing candidate dependency through
  // an ancestor node_modules directory.
  rmSync(join(consumerDirectory, "node_modules"), { force: true, recursive: true });
  runBun({
    args: ["install", "--no-save", "--ignore-scripts", artifactPath],
    cwd: consumerDirectory,
    phase: `install candidate in ${consumerDirectory}`
  });
  const installation = inspectInstallation({
    candidateVersion,
    consumerDirectory,
    expectedJSDocExamplePayloads,
    expectedReadme
  });
  if (installation === undefined) {
    throw new Error(
      `candidate installation did not resolve ${CANDIDATE_NAME} with its declared ${JSCPD_PACKAGE_NAME} dependency from ${consumerDirectory}`
    );
  }
  return installation;
}

function isPrivateCandidateConsumer(consumerDirectory: string): boolean {
  const manifestPath = join(consumerDirectory, "package.json");
  if (!existsSync(manifestPath)) return false;
  try {
    const manifest: unknown = JSON.parse(readFileSync(manifestPath, "utf8"));
    return isRecord(manifest) && manifest.private === true;
  } catch {
    return false;
  }
}

interface InstalledCandidate {
  readonly installedPackageDirectory: string;
  readonly resolvedEntryPath: string;
  readonly resolvedEntrySha256: string;
}

function inspectInstallation(input: {
  readonly candidateVersion: string;
  readonly consumerDirectory: string;
  readonly expectedJSDocExamplePayloads: readonly string[];
  readonly expectedReadme: string;
}): InstalledCandidate | undefined {
  const { candidateVersion, consumerDirectory, expectedJSDocExamplePayloads, expectedReadme } =
    input;
  const packageDirectory = join(consumerDirectory, "node_modules", CANDIDATE_NAME);
  const manifestPath = join(packageDirectory, "package.json");
  if (!existsSync(manifestPath)) return undefined;
  let manifest: unknown;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    return undefined;
  }
  if (
    !isRecord(manifest) ||
    manifest.name !== CANDIDATE_NAME ||
    manifest.version !== candidateVersion
  ) {
    return undefined;
  }
  let resolvedEntryPath: string;
  try {
    const resolvedUrl = runBun({
      args: ["-e", "process.stdout.write(import.meta.resolve(process.argv[1]))", CANDIDATE_NAME],
      cwd: consumerDirectory,
      phase: `resolve candidate in ${consumerDirectory}`
    }).trim();
    resolvedEntryPath = fileURLToPath(resolvedUrl);
  } catch {
    return undefined;
  }
  if (!existsSync(resolvedEntryPath) || !isWithin(packageDirectory, resolvedEntryPath))
    return undefined;
  const readmePath = join(packageDirectory, PACKAGE_README_PATH);
  if (!existsSync(readmePath) || readFileSync(readmePath, "utf8") !== expectedReadme)
    return undefined;
  try {
    assertJSDocExamplePayloads({
      declarationSources: collectFiles(join(packageDirectory, "types"), (path) =>
        path.endsWith(".d.ts")
      ).map((path) => readFileSync(path, "utf8")),
      description: "installed candidate declarations",
      expectedPayloads: expectedJSDocExamplePayloads
    });
  } catch {
    return undefined;
  }
  if (!hasCandidateJscpdDependency(consumerDirectory, resolvedEntryPath)) return undefined;
  return Object.freeze({
    installedPackageDirectory: packageDirectory,
    resolvedEntryPath,
    resolvedEntrySha256: sha256File(resolvedEntryPath)
  });
}

function hasCandidateJscpdDependency(
  consumerDirectory: string,
  candidateEntryPath: string
): boolean {
  let packageManifestPath: string;
  try {
    packageManifestPath = runBun({
      args: [
        "-e",
        "import { createRequire } from 'node:module'; process.stdout.write(createRequire(process.argv[1]).resolve('jscpd/package.json'))",
        candidateEntryPath
      ],
      cwd: consumerDirectory,
      phase: `resolve declared ${JSCPD_PACKAGE_NAME} dependency in ${consumerDirectory}`
    }).trim();
  } catch {
    return false;
  }
  if (!isWithin(join(consumerDirectory, "node_modules"), packageManifestPath)) return false;

  let manifest: unknown;
  try {
    manifest = JSON.parse(readFileSync(packageManifestPath, "utf8"));
  } catch {
    return false;
  }
  if (
    !isRecord(manifest) ||
    manifest.name !== JSCPD_PACKAGE_NAME ||
    manifest.version !== CANDIDATE_DEPENDENCIES.jscpd
  ) {
    return false;
  }

  const binTarget = declaredJscpdBinTarget(manifest.bin);
  if (binTarget === undefined) return false;
  const packageDirectory = dirname(packageManifestPath);
  const binPath = resolve(packageDirectory, binTarget);
  return isWithin(packageDirectory, binPath) && existsSync(binPath);
}

function declaredJscpdBinTarget(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (!isRecord(value)) return undefined;
  const target = value[JSCPD_BIN_NAME];
  return typeof target === "string" ? target : undefined;
}

function receiptMatchesInstallation(
  receipt: CandidateReceipt,
  consumerDirectory: string,
  installation: InstalledCandidate
): boolean {
  return (
    receipt.consumer.directory === consumerDirectory &&
    receipt.consumer.installedPackageDirectory === installation.installedPackageDirectory &&
    receipt.consumer.resolvedEntryPath === installation.resolvedEntryPath &&
    receipt.consumer.resolvedEntrySha256 === installation.resolvedEntrySha256
  );
}

function receiptFor(input: {
  readonly artifact: CandidateArtifact;
  readonly consumerDirectory: string;
  readonly installation: InstalledCandidate;
}): CandidateReceipt {
  return Object.freeze({
    schemaVersion: RECEIPT_SCHEMA_VERSION,
    artifact: Object.freeze({ path: input.artifact.artifactPath, sha256: input.artifact.sha256 }),
    candidateVersion: input.artifact.candidateVersion,
    consumer: Object.freeze({
      directory: input.consumerDirectory,
      installedPackageDirectory: input.installation.installedPackageDirectory,
      resolvedEntryPath: input.installation.resolvedEntryPath,
      resolvedEntrySha256: input.installation.resolvedEntrySha256
    }),
    files: input.artifact.files,
    inputFingerprint: input.artifact.inputFingerprint
  });
}

function writeReceipt(receiptPath: string, receipt: CandidateReceipt): void {
  writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
}

function preparedCandidate(input: {
  readonly artifact: CandidateArtifact;
  readonly consumerDirectory: string;
  readonly installation: InstalledCandidate;
  readonly reused: boolean;
}): PreparedPackageCandidate {
  return Object.freeze({
    ...input.artifact,
    consumerDirectory: input.consumerDirectory,
    installedPackageDirectory: input.installation.installedPackageDirectory,
    resolvedEntryPath: input.installation.resolvedEntryPath,
    reused: input.reused
  });
}

function runBun(input: {
  readonly args: readonly string[];
  readonly cwd: string;
  readonly phase: string;
}): string {
  const result = spawnSync(process.execPath, input.args, {
    cwd: input.cwd,
    encoding: "utf8",
    env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" }
  });
  if (result.error !== undefined) {
    throw new Error(`candidate ${input.phase} could not start: ${errorMessage(result.error)}`, {
      cause: result.error
    });
  }
  if (result.status !== 0) {
    const output = [result.stdout, result.stderr]
      .filter((value) => value.trim().length > 0)
      .join("\n");
    throw new Error(
      `candidate ${input.phase} failed with exit ${String(result.status)}: bun ${input.args.join(" ")}${
        output ? `\n${output}` : ""
      }`
    );
  }
  return result.stdout;
}

function sha256File(filePath: string): string {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function isWithin(parent: string, child: string): boolean {
  const relativePath = relative(resolve(parent), resolve(child));
  return relativePath.length > 0 && !relativePath.startsWith(`..${sep}`) && relativePath !== "..";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function bunVersion(): string {
  const version = process.versions.bun;
  if (typeof version !== "string" || version.length === 0) {
    throw new Error("candidate preparation requires a Bun runtime with a reported version");
  }
  return version;
}

function parseStringArray(source: string, description: string): readonly string[] {
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch (error: unknown) {
    throw new Error(`${description} is not valid JSON: ${errorMessage(error)}`, { cause: error });
  }
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error(`${description} must be a JSON string array`);
  }
  return Object.freeze([...value]);
}
