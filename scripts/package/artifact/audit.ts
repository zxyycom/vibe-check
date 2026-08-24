import { existsSync, readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { basename, dirname, join, relative, resolve, sep } from "node:path";

import { errorMessage } from "../../foundation/errors.ts";
import { isPathWithin } from "../../foundation/path.ts";
import { isNonArrayRecord } from "../../foundation/type-guards.ts";
import { relativeEsmModuleSpecifiers } from "./esm-module-specifiers.ts";
import { collectFiles } from "./file-inventory.ts";
import {
  CANDIDATE_DEPENDENCIES,
  CANDIDATE_NAME,
  PACKAGE_ENTRY_PATH,
  PACKAGE_ENTRY_SOURCE,
  PACKAGE_README_PATH,
  PACKAGE_RUNTIME_DIRECTORY,
  PACKAGE_RUNTIME_ENTRY_PATH,
  PACKAGE_SOURCE_DIRECTORY,
  PACKAGE_TYPES_DIRECTORY,
  PACKAGE_TYPES_PATH,
  RUNTIME_EXPORTS
} from "./package-contract.ts";
import { sha256File } from "./pack.ts";
import { assertRuntimeSourceMapMatchesSource } from "./runtime-source-maps.ts";
import { PACKAGE_API_EXAMPLE_PROJECTIONS } from "../../docs/package-api/registry.ts";
import {
  renderPackageApiDocumentation,
  type RenderedPackageApiDocumentation
} from "../../docs/package-api/render.ts";

export interface ArtifactDocumentation {
  readonly expectedJSDocExamplePayloads: readonly string[];
  readonly readme: string;
  readonly rendered: RenderedPackageApiDocumentation;
}

interface TarEntry {
  readonly content: Buffer;
  readonly path: string;
}

/** Reads and validates checked-in package documentation before candidate use. */
export function artifactDocumentation(repositoryRoot: string): ArtifactDocumentation {
  const rendered = renderPackageApiDocumentation({ repositoryRoot });
  assertDocumentationMatchesSource(repositoryRoot, rendered);
  return Object.freeze({
    expectedJSDocExamplePayloads: jsdocExamplePayloads(rendered),
    readme: rendered.readme.content,
    rendered
  });
}

/** Audits a staged package against its approved runtime, declaration, and docs inventory. */
export function auditStagingRuntime(input: {
  readonly expectedJSDocExamplePayloads: readonly string[];
  readonly expectedReadme: string;
  readonly stagingDirectory: string;
}): void {
  const { expectedJSDocExamplePayloads, expectedReadme, stagingDirectory } = input;
  const entryPath = join(stagingDirectory, PACKAGE_ENTRY_PATH);
  const runtimeEntryPath = join(stagingDirectory, PACKAGE_RUNTIME_ENTRY_PATH);
  const typesPath = join(stagingDirectory, PACKAGE_TYPES_PATH);
  if (!existsSync(entryPath) || !existsSync(runtimeEntryPath) || !existsSync(typesPath)) {
    throw new Error("candidate staging is missing its public runtime entry or declarations entry");
  }
  if (readFileSync(entryPath, "utf8") !== PACKAGE_ENTRY_SOURCE) {
    throw new Error("candidate public facade does not match the approved runtime entry");
  }
  assertFileContentMatches({
    content: expectedReadme,
    path: join(stagingDirectory, PACKAGE_README_PATH)
  });
  assertJSDocExamplePayloads({
    declarationSources: collectFiles(join(stagingDirectory, PACKAGE_TYPES_DIRECTORY), (path) =>
      path.endsWith(".d.ts")
    ).map((path) => readFileSync(path, "utf8")),
    description: "candidate staging declarations",
    expectedPayloads: expectedJSDocExamplePayloads
  });
  const actualExports = declaredRuntimeExports(readFileSync(runtimeEntryPath, "utf8"));
  if (!sameStrings(actualExports, RUNTIME_EXPORTS)) {
    throw new Error(
      `candidate runtime exports must be ${RUNTIME_EXPORTS.join(", ")}; received ${actualExports.join(", ")}`
    );
  }
  const typesSource = readFileSync(typesPath, "utf8");
  if (typesSource.includes("export *")) {
    throw new Error("candidate declarations must not use wildcard public exports");
  }
  assertReadableRuntimeLayout(stagingDirectory);
  const unexpectedFiles = collectFiles(stagingDirectory, () => true)
    .map((filePath) => relative(stagingDirectory, filePath).split(sep).join("/"))
    .filter(
      (filePath) =>
        filePath !== "package.json" &&
        filePath !== PACKAGE_ENTRY_PATH &&
        filePath !== PACKAGE_README_PATH &&
        !(
          filePath.startsWith(`${PACKAGE_RUNTIME_DIRECTORY}/`) &&
          (filePath.endsWith(".mjs") || filePath.endsWith(".mjs.map"))
        ) &&
        !(filePath.startsWith(`${PACKAGE_TYPES_DIRECTORY}/`) && filePath.endsWith(".d.ts")) &&
        !(filePath.startsWith(`${PACKAGE_SOURCE_DIRECTORY}/`) && filePath.endsWith(".ts"))
    );
  if (unexpectedFiles.length > 0) {
    throw new Error(
      `candidate staging contains materials outside its allowlisted runtime and declaration inventory: ${unexpectedFiles.join(", ")}`
    );
  }
}

function assertReadableRuntimeLayout(stagingDirectory: string): void {
  const runtimeDirectory = join(stagingDirectory, PACKAGE_RUNTIME_DIRECTORY);
  const runtimeFiles = collectFiles(runtimeDirectory, () => true);
  const modules = runtimeFiles.filter((path) => path.endsWith(".mjs"));
  if (modules.length === 0) {
    throw new Error("candidate staging is missing its readable ESM module tree");
  }
  if (runtimeFiles.some((path) => path.endsWith(".js") || path.endsWith(".js.map"))) {
    throw new Error("candidate readable ESM module tree must not retain .js runtime artifacts");
  }
  for (const modulePath of modules) {
    const sourceMapPath = `${modulePath}.map`;
    if (!existsSync(sourceMapPath)) {
      throw new Error(`candidate ESM module is missing a source map: ${modulePath}`);
    }
    const moduleSource = readFileSync(modulePath, "utf8");
    const sourceMapFileName = `${basename(modulePath)}.map`;
    if (!moduleSource.includes(`sourceMappingURL=${sourceMapFileName}`)) {
      throw new Error(`candidate ESM module does not link its source map: ${modulePath}`);
    }
    assertRelativeModuleReferencesResolve({ modulePath, moduleSource });
    assertRuntimeSourceMapMatchesSource({ sourceMapPath, stagingDirectory });
  }
}

function declaredRuntimeExports(runtimeEntrySource: string): readonly string[] {
  const exports: string[] = [];
  const declaration = /export\s*\{([^}]+)\}\s*from\s*["']\.\//g;
  for (const match of runtimeEntrySource.matchAll(declaration)) {
    for (const exportedName of match[1].split(",")) {
      const name = exportedName
        .trim()
        .split(/\s+as\s+/)
        .at(-1);
      if (name !== undefined && name.length > 0) exports.push(name);
    }
  }
  return Object.freeze(exports.sort());
}

function assertRelativeModuleReferencesResolve(input: {
  readonly modulePath: string;
  readonly moduleSource: string;
}): void {
  for (const specifier of relativeEsmModuleSpecifiers({
    fileName: input.modulePath,
    source: input.moduleSource
  })) {
    if (!specifier.endsWith(".mjs")) {
      throw new Error(
        `candidate ESM module uses a non-.mjs relative specifier ${specifier}: ${input.modulePath}`
      );
    }
    const targetPath = resolve(dirname(input.modulePath), specifier);
    if (!existsSync(targetPath)) {
      throw new Error(
        `candidate ESM module reference does not resolve ${specifier}: ${input.modulePath}`
      );
    }
  }
}

/** Audits the packed bytes, tar inventory, manifest, and generated declarations. */
export function auditCandidateArtifact(input: {
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

export function assertJSDocExamplePayloads(input: {
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
    if (!isPathWithin(repositoryRoot, jsdocSource.path)) {
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
  if (!isNonArrayRecord(manifest)) throw new Error("candidate artifact manifest must be an object");
  if (
    manifest.name !== CANDIDATE_NAME ||
    manifest.version !== candidateVersion ||
    manifest.type !== "module"
  ) {
    throw new Error("candidate artifact manifest identity does not match the prepared candidate");
  }
  if (Object.hasOwn(manifest, "bin"))
    throw new Error("candidate artifact must not expose an executable bin");
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
  if (!isNonArrayRecord(value)) return false;
  const dependencies = Object.entries(CANDIDATE_DEPENDENCIES);
  return (
    Object.keys(value).sort().join("\0") === dependencies.map(([key]) => key).join("\0") &&
    dependencies.every(([key, version]) => value[key] === version)
  );
}

function hasPublicExports(value: unknown): boolean {
  if (
    !isNonArrayRecord(value) ||
    Object.keys(value).length !== 1 ||
    !isNonArrayRecord(value["."])
  ) {
    return false;
  }
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

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
