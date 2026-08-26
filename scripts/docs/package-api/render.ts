import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

import {
  PACKAGE_API_EXAMPLE_PROJECTIONS,
  type PackageApiExampleProjection,
  type PackageApiExampleTarget
} from "./registry.ts";

const EXAMPLE_DIRECTORY = "docs/examples/package-api";
const README_PATH = "README.md";
const README_TEMPLATE_PATH = "docs/package-readme.template.md";
const PACKAGE_CHECK_GUIDE_INDEX_MARKER = "<!-- package-check-guide-index -->";
const PACKAGE_CHECK_GUIDE_INDEX_LINK = "[包内 Check 指南](./docs/checks/index.md)";

export interface RenderedPackageApiDocumentation {
  readonly jsdocSources: readonly Readonly<{ readonly content: string; readonly path: string }>[];
  readonly readme: Readonly<{ readonly content: string; readonly path: string }>;
}

interface ExamplePayload {
  readonly content: string;
  readonly sourcePath: string;
}

interface JSDocProjection {
  readonly declarationName: string;
  readonly payload: ExamplePayload;
  readonly sourcePath: string;
  readonly title: string;
}

interface JSDocReplacement {
  readonly content: string;
  readonly end: number;
  readonly start: number;
}

interface JSDocTarget {
  readonly declarationName: string;
  readonly sourcePath: string;
}

/**
 * Computes the generated package guide and JSDoc example blocks without writing
 * files. The CLI and candidate preparation own their respective side effects.
 */
export function renderPackageApiDocumentation(
  input: Readonly<{
    readonly projections?: readonly PackageApiExampleProjection[];
    readonly repositoryRoot: string;
  }>
): RenderedPackageApiDocumentation {
  const repositoryRoot = resolve(input.repositoryRoot);
  const projections = input.projections ?? PACKAGE_API_EXAMPLE_PROJECTIONS;
  const payloads = collectExamplePayloads(repositoryRoot, projections);
  const readme = renderReadme(repositoryRoot, projections, payloads);
  const jsdocSources = renderJSDocSources(repositoryRoot, projections, payloads);
  return Object.freeze({ jsdocSources, readme });
}

function collectExamplePayloads(
  repositoryRoot: string,
  projections: readonly PackageApiExampleProjection[]
): ReadonlyMap<string, ExamplePayload> {
  const sourcePaths = collectExampleSourcePaths(repositoryRoot);
  const sourcePathSet = new Set(
    sourcePaths.map((sourcePath) => toRepositoryPath(repositoryRoot, sourcePath))
  );
  const regionIds = new Set<string>();
  const regions = new Map<string, ExamplePayload>();
  for (const sourcePath of sourcePaths) {
    const content = readText(sourcePath);
    assertSourceText(sourcePath, content);
    const repositoryPath = toRepositoryPath(repositoryRoot, sourcePath);
    for (const [regionId, regionContent] of readExampleRegions(repositoryPath, content)) {
      if (regionIds.has(regionId)) {
        throw new Error(`duplicate package API example region id: ${regionId}`);
      }
      regionIds.add(regionId);
      const key = regionKey(repositoryPath, regionId);
      if (regions.has(key)) throw new Error(`duplicate package API example region: ${key}`);
      regions.set(key, Object.freeze({ content: regionContent, sourcePath: repositoryPath }));
    }
  }

  const projectionIds = new Set<string>();
  const projectionRegions = new Set<string>();
  const usedReadmePlaceholders = new Set<string>();
  const payloads = new Map<string, ExamplePayload>();
  for (const projection of projections) {
    assertProjection(projection);
    if (projectionIds.has(projection.id)) {
      throw new Error(`duplicate package API example projection id: ${projection.id}`);
    }
    projectionIds.add(projection.id);
    if (!sourcePathSet.has(projection.sourcePath)) {
      throw new Error(`unknown package API example source: ${projection.sourcePath}`);
    }
    const payload = payloadForProjection(projection, repositoryRoot, regions);
    const key =
      projection.regionId === undefined
        ? projection.sourcePath
        : regionKey(projection.sourcePath, projection.regionId);
    if (projectionRegions.has(key)) {
      throw new Error(`duplicate package API example projection source or region: ${key}`);
    }
    projectionRegions.add(key);
    for (const target of projection.targets) {
      assertTarget(target, projection.id);
      if (target.kind === "readme" && usedReadmePlaceholders.has(target.placeholderId)) {
        throw new Error(`duplicate package API README placeholder target: ${target.placeholderId}`);
      }
      if (target.kind === "readme") usedReadmePlaceholders.add(target.placeholderId);
    }
    payloads.set(projection.id, payload);
  }

  const usedSourcePaths = new Set(projections.map((projection) => projection.sourcePath));
  for (const sourcePath of sourcePaths) {
    const repositoryPath = toRepositoryPath(repositoryRoot, sourcePath);
    if (!usedSourcePaths.has(repositoryPath)) {
      throw new Error(`unused package API example source: ${repositoryPath}`);
    }
  }
  for (const [key] of regions) {
    if (!projectionRegions.has(key)) throw new Error(`unused package API example region: ${key}`);
  }
  return payloads;
}

function collectExampleSourcePaths(repositoryRoot: string): readonly string[] {
  const exampleRoot = repositoryFilePath(repositoryRoot, EXAMPLE_DIRECTORY);
  const sourcePaths: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(path);
      } else if (entry.isFile()) {
        if (!entry.name.endsWith(".ts")) {
          throw new Error(
            `package API example source must be TypeScript: ${toRepositoryPath(repositoryRoot, path)}`
          );
        }
        sourcePaths.push(path);
      }
    }
  };
  visit(exampleRoot);
  if (sourcePaths.length === 0) throw new Error("package API examples are missing");
  return Object.freeze(sourcePaths.sort());
}

function assertSourceText(sourcePath: string, content: string): void {
  if (content.includes("\r")) throw new Error(`package API example must use LF: ${sourcePath}`);
  if (!content.endsWith("\n") || content.endsWith("\n\n")) {
    throw new Error(`package API example must have exactly one trailing LF: ${sourcePath}`);
  }
}

function readExampleRegions(sourcePath: string, content: string): ReadonlyMap<string, string> {
  const regionBounds = new Map<
    string,
    Readonly<{ readonly endLineIndex: number; readonly startLineIndex: number }>
  >();
  const lines = content.split("\n");
  const openRegions: { id: string; lineIndex: number }[] = [];
  for (const [lineIndex, line] of lines.entries()) {
    const start = /^\/\/ #region package-api-example:([a-z][a-z0-9-]*)$/.exec(line);
    const end = /^\/\/ #endregion package-api-example:([a-z][a-z0-9-]*)$/.exec(line);
    if (line.includes("package-api-example:") && !start && !end) {
      throw new Error(`malformed package API example marker in ${sourcePath}:${lineIndex + 1}`);
    }
    if (start) {
      if (regionBounds.has(start[1]) || openRegions.some((region) => region.id === start[1])) {
        throw new Error(`duplicate package API example region ${start[1]} in ${sourcePath}`);
      }
      openRegions.push({ id: start[1], lineIndex });
      continue;
    }
    if (!end) continue;
    const open = openRegions.pop();
    if (open === undefined || open.id !== end[1]) {
      throw new Error(
        `unclosed package API example region ${end[1]} in ${sourcePath}:${lineIndex + 1}`
      );
    }
    regionBounds.set(
      open.id,
      Object.freeze({ endLineIndex: lineIndex, startLineIndex: open.lineIndex })
    );
  }
  const open = openRegions.at(-1);
  if (open !== undefined)
    throw new Error(`unclosed package API example region ${open.id} in ${sourcePath}`);
  const regions = new Map<string, string>();
  for (const [regionId, bounds] of regionBounds) {
    const regionContent = `${lines
      .slice(bounds.startLineIndex + 1, bounds.endLineIndex)
      .filter((line) => !isExampleRegionMarker(line))
      .join("\n")}\n`;
    if (regionContent === "\n")
      throw new Error(`empty package API example region ${regionId} in ${sourcePath}`);
    regions.set(regionId, regionContent);
  }
  return regions;
}

function isExampleRegionMarker(line: string): boolean {
  return /^\/\/ #(?:end)?region package-api-example:[a-z][a-z0-9-]*$/.test(line);
}

function assertProjection(projection: PackageApiExampleProjection): void {
  if (!validIdentifier(projection.id)) {
    throw new Error(`invalid package API example projection id: ${projection.id}`);
  }
  if (projection.evidence !== "runtime" && projection.evidence !== "typecheck") {
    throw new Error(`missing package API example evidence: ${projection.id}`);
  }
  if (
    !projection.sourcePath.startsWith(`${EXAMPLE_DIRECTORY}/`) ||
    !projection.sourcePath.endsWith(".ts")
  ) {
    throw new Error(`invalid package API example source path: ${projection.sourcePath}`);
  }
  if (projection.regionId !== undefined && !validIdentifier(projection.regionId)) {
    throw new Error(`invalid package API example region id: ${projection.regionId}`);
  }
  if (projection.title.trim().length === 0) {
    throw new Error(`missing package API example title: ${projection.id}`);
  }
  if (projection.targets.length === 0) {
    throw new Error(`missing package API example target: ${projection.id}`);
  }
  const targetKeys = new Set<string>();
  for (const target of projection.targets) {
    assertTarget(target, projection.id);
    const targetKey = projectionTargetKey(target);
    if (targetKeys.has(targetKey)) {
      throw new Error(`duplicate package API example target: ${projection.id}`);
    }
    targetKeys.add(targetKey);
  }
}

function assertTarget(target: PackageApiExampleTarget, projectionId: string): void {
  if (target.kind === "readme") {
    if (!validIdentifier(target.placeholderId)) {
      throw new Error(`invalid package API README placeholder target: ${projectionId}`);
    }
    return;
  }
  if (
    !target.sourcePath.startsWith("src/") ||
    !target.sourcePath.endsWith(".ts") ||
    !validTypeScriptIdentifier(target.declarationName)
  ) {
    throw new Error(`invalid package API JSDoc target: ${projectionId}`);
  }
}

function payloadForProjection(
  projection: PackageApiExampleProjection,
  repositoryRoot: string,
  regions: ReadonlyMap<string, ExamplePayload>
): ExamplePayload {
  if (projection.regionId !== undefined) {
    const payload = regions.get(regionKey(projection.sourcePath, projection.regionId));
    if (payload === undefined) {
      throw new Error(
        `missing package API example region ${projection.regionId} in ${projection.sourcePath}`
      );
    }
    return payload;
  }
  const content = readText(repositoryFilePath(repositoryRoot, projection.sourcePath));
  if (content.includes("package-api-example:")) {
    throw new Error(
      `full-file package API example cannot contain regions: ${projection.sourcePath}`
    );
  }
  return Object.freeze({ content, sourcePath: projection.sourcePath });
}

function renderReadme(
  repositoryRoot: string,
  projections: readonly PackageApiExampleProjection[],
  payloads: ReadonlyMap<string, ExamplePayload>
): Readonly<{ readonly content: string; readonly path: string }> {
  const templatePath = repositoryFilePath(repositoryRoot, README_TEMPLATE_PATH);
  const template = readText(templatePath);
  if (template.split(PACKAGE_CHECK_GUIDE_INDEX_MARKER).length !== 2) {
    throw new Error(
      `package README template must contain exactly one Check guide index marker: ${README_TEMPLATE_PATH}`
    );
  }
  if (/^(?: {0,3})(?:`{3,}|~{3,})/m.test(template)) {
    throw new Error(
      `package README template must not contain fenced code: ${README_TEMPLATE_PATH}`
    );
  }
  const readmeProjections = projections.filter((projection) =>
    projection.targets.some((target) => target.kind === "readme")
  );
  const expectedPlaceholders = new Set<string>();
  for (const projection of readmeProjections) {
    for (const target of projection.targets) {
      if (target.kind === "readme") expectedPlaceholders.add(target.placeholderId);
    }
  }
  const foundPlaceholders = new Map<string, number>();
  const markerPattern = /^<!-- package-api-example:([a-z][a-z0-9-]*) -->$/gm;
  for (const match of template.matchAll(markerPattern)) {
    const placeholderId = match[1];
    foundPlaceholders.set(placeholderId, (foundPlaceholders.get(placeholderId) ?? 0) + 1);
  }
  if (template.replace(markerPattern, "").includes("package-api-example:")) {
    throw new Error(`malformed package API README placeholder in ${README_TEMPLATE_PATH}`);
  }
  for (const placeholderId of expectedPlaceholders) {
    if (foundPlaceholders.get(placeholderId) !== 1) {
      throw new Error(`missing or duplicate package API README placeholder: ${placeholderId}`);
    }
  }
  for (const placeholderId of foundPlaceholders.keys()) {
    if (!expectedPlaceholders.has(placeholderId)) {
      throw new Error(`unknown package API README placeholder: ${placeholderId}`);
    }
  }

  let content = template.replace(PACKAGE_CHECK_GUIDE_INDEX_MARKER, PACKAGE_CHECK_GUIDE_INDEX_LINK);
  for (const projection of readmeProjections) {
    const payload = requiredPayload(payloads, projection.id);
    for (const target of projection.targets) {
      if (target.kind !== "readme") continue;
      content = content.replace(
        readmePlaceholder(target.placeholderId),
        fencedTypeScript(payload.content)
      );
    }
  }
  return Object.freeze({ content, path: repositoryFilePath(repositoryRoot, README_PATH) });
}

function renderJSDocSources(
  repositoryRoot: string,
  projections: readonly PackageApiExampleProjection[],
  payloads: ReadonlyMap<string, ExamplePayload>
): readonly Readonly<{ readonly content: string; readonly path: string }>[] {
  const grouped = new Map<string, JSDocProjection[]>();
  for (const projection of projections) {
    const payload = requiredPayload(payloads, projection.id);
    for (const target of projection.targets) {
      if (target.kind !== "jsdoc") continue;
      const key = jsdocTargetKey(target.sourcePath, target.declarationName);
      const targetProjections = grouped.get(key) ?? [];
      targetProjections.push(
        Object.freeze({
          declarationName: target.declarationName,
          payload,
          sourcePath: target.sourcePath,
          title: projection.title
        })
      );
      grouped.set(key, targetProjections);
    }
  }

  const targets = new Map<string, JSDocTarget>();
  for (const targetProjections of grouped.values()) {
    const target = targetProjections[0];
    if (target === undefined) throw new Error("package API JSDoc projection is missing its target");
    targets.set(
      jsdocTargetKey(target.sourcePath, target.declarationName),
      Object.freeze({
        declarationName: target.declarationName,
        sourcePath: target.sourcePath
      })
    );
  }
  for (const target of discoverJSDocExampleTargets(repositoryRoot)) {
    const key = jsdocTargetKey(target.sourcePath, target.declarationName);
    if (!targets.has(key)) targets.set(key, target);
  }

  const replacementsBySource = new Map<string, JSDocReplacement[]>();
  for (const [key, target] of targets) {
    const sourcePath = repositoryFilePath(repositoryRoot, target.sourcePath);
    const source = readText(sourcePath);
    const replacement = renderJSDocTarget(
      source,
      sourcePath,
      target.declarationName,
      grouped.get(key) ?? []
    );
    const replacements = replacementsBySource.get(sourcePath) ?? [];
    replacements.push(replacement);
    replacementsBySource.set(sourcePath, replacements);
  }

  const jsdocSources: Readonly<{ readonly content: string; readonly path: string }>[] = [];
  for (const [path, replacements] of replacementsBySource) {
    let content = readText(path);
    for (const replacement of replacements.sort((left, right) => right.start - left.start)) {
      content = `${content.slice(0, replacement.start)}${replacement.content}${content.slice(replacement.end)}`;
    }
    jsdocSources.push(Object.freeze({ content, path }));
  }
  return Object.freeze(jsdocSources.sort((left, right) => left.path.localeCompare(right.path)));
}

function discoverJSDocExampleTargets(repositoryRoot: string): readonly JSDocTarget[] {
  const productRoot = repositoryFilePath(repositoryRoot, "src");
  const sourcePaths: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(path);
      } else if (
        entry.isFile() &&
        entry.name.endsWith(".ts") &&
        !entry.name.endsWith(".test.ts") &&
        !entry.name.endsWith(".test-support.ts")
      ) {
        sourcePaths.push(path);
      }
    }
  };
  visit(productRoot);

  const targets = new Map<string, JSDocTarget>();
  for (const sourcePath of sourcePaths.sort()) {
    const source = readText(sourcePath);
    if (!source.includes("@example")) continue;
    const repositoryPath = toRepositoryPath(repositoryRoot, sourcePath);
    const commentPattern = /\/\*\*[\s\S]*?\*\//g;
    for (const match of source.matchAll(commentPattern)) {
      if (match.index === undefined || !match[0].includes("@example")) continue;
      const target = discoverJSDocExampleTarget(source, repositoryPath, match[0], match.index);
      const key = jsdocTargetKey(target.sourcePath, target.declarationName);
      if (targets.has(key)) {
        throw new Error(`duplicate package API JSDoc target: ${key}`);
      }
      targets.set(key, target);
    }
  }
  return Object.freeze([...targets.values()]);
}

function discoverJSDocExampleTarget(
  source: string,
  sourcePath: string,
  comment: string,
  commentStart: number
): JSDocTarget {
  const lines = comment.split("\n");
  const firstExample = lines.findIndex((line) => /^ \* @example\b/.test(line));
  if (firstExample === -1) {
    throw new Error(`invalid package API JSDoc example in ${sourcePath}`);
  }
  for (const line of lines.slice(firstExample + 1)) {
    const tag = /^ \* @([^\s]+)/.exec(line)?.[1];
    if (tag !== undefined && tag !== "example") {
      throw new Error(`non-example JSDoc tag follows @example in ${sourcePath}: @${tag}`);
    }
  }

  const commentEnd = commentStart + comment.length;
  const declaration =
    /^\s*export\s+(?:async\s+)?(?:function|const|class|interface|type)\s+([A-Za-z_$][A-Za-z0-9_$]*)(?:\b|<)/.exec(
      source.slice(commentEnd)
    );
  if (declaration === null) {
    throw new Error(
      `package API JSDoc @example is not adjacent to a supported export in ${sourcePath}`
    );
  }
  return Object.freeze({ declarationName: declaration[1], sourcePath });
}

function renderJSDocTarget(
  source: string,
  sourcePath: string,
  declarationName: string,
  projections: readonly JSDocProjection[]
): JSDocReplacement {
  const targetComment = findTargetJSDocComment(source, sourcePath, declarationName);
  const lines = targetComment.content.split("\n");
  if (lines[0] !== "/**" || lines.at(-1) !== " */") {
    throw new Error(`invalid JSDoc comment for ${declarationName} in ${sourcePath}`);
  }
  const firstExample = lines.findIndex((line) => /^ \* @example\b/.test(line));
  const proseLines = firstExample === -1 ? lines.slice(0, -1) : lines.slice(0, firstExample);
  const expectedExampleLines = projections.flatMap((projection) => formatJSDocExample(projection));
  return Object.freeze({
    content: [...proseLines, ...expectedExampleLines, " */"].join("\n"),
    end: targetComment.end,
    start: targetComment.start
  });
}

function findTargetJSDocComment(
  source: string,
  sourcePath: string,
  declarationName: string
): Readonly<{ readonly content: string; readonly end: number; readonly start: number }> {
  const declarationPattern = new RegExp(
    `export\\s+(?:async\\s+)?(?:function|const|class|interface|type)\\s+${escapeRegex(declarationName)}(?:\\b|<)`,
    "g"
  );
  const candidates: Readonly<{
    readonly content: string;
    readonly end: number;
    readonly start: number;
  }>[] = [];
  for (const match of source.matchAll(declarationPattern)) {
    if (match.index === undefined) continue;
    const prefix = source.slice(0, match.index);
    const end = prefix.lastIndexOf("*/");
    if (end === -1 || prefix.slice(end + 2).trim().length !== 0) continue;
    const start = prefix.lastIndexOf("/**", end);
    if (start === -1) continue;
    candidates.push(Object.freeze({ content: source.slice(start, end + 2), end: end + 2, start }));
  }
  if (candidates.length !== 1) {
    throw new Error(
      `expected exactly one JSDoc target for ${declarationName} in ${sourcePath}; found ${candidates.length}`
    );
  }
  const target = candidates[0];
  if (target === undefined)
    throw new Error(`missing JSDoc target for ${declarationName} in ${sourcePath}`);
  return target;
}

function formatJSDocExample(projection: JSDocProjection): readonly string[] {
  if (projection.payload.content.includes("*/")) {
    throw new Error(
      `package API JSDoc payload cannot contain */: ${projection.payload.sourcePath}`
    );
  }
  const contentLines = projection.payload.content.slice(0, -1).split("\n");
  return Object.freeze([
    ` * @example ${projection.title}`,
    " * ```ts",
    ...contentLines.map((line) => (line.length === 0 ? " *" : ` * ${line}`)),
    " * ```"
  ]);
}

function fencedTypeScript(payload: string): string {
  let fence = "```";
  while (payload.includes(fence)) fence = `${fence}\``;
  return `${fence}ts\n${payload}${fence}`;
}

function requiredPayload(
  payloads: ReadonlyMap<string, ExamplePayload>,
  id: string
): ExamplePayload {
  const payload = payloads.get(id);
  if (payload === undefined) throw new Error(`missing package API example payload: ${id}`);
  return payload;
}

function readmePlaceholder(placeholderId: string): string {
  return `<!-- package-api-example:${placeholderId} -->`;
}

function repositoryFilePath(repositoryRoot: string, repositoryPath: string): string {
  const filePath = resolve(repositoryRoot, repositoryPath);
  const relativePath = relative(repositoryRoot, filePath);
  if (relativePath === "" || relativePath === ".." || relativePath.startsWith(`..${sep}`)) {
    throw new Error(`package API documentation path escapes repository root: ${repositoryPath}`);
  }
  return filePath;
}

function toRepositoryPath(repositoryRoot: string, filePath: string): string {
  return relative(repositoryRoot, filePath).split(sep).join("/");
}

function regionKey(sourcePath: string, regionId: string): string {
  return `${sourcePath}#${regionId}`;
}

function jsdocTargetKey(sourcePath: string, declarationName: string): string {
  return `${sourcePath}#${declarationName}`;
}

function projectionTargetKey(target: PackageApiExampleTarget): string {
  return target.kind === "readme"
    ? `readme#${target.placeholderId}`
    : `jsdoc#${jsdocTargetKey(target.sourcePath, target.declarationName)}`;
}

function validIdentifier(value: string): boolean {
  return /^[a-z][a-z0-9-]*$/.test(value);
}

function validTypeScriptIdentifier(value: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readText(path: string): string {
  return readFileSync(path, "utf8");
}
