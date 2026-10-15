import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

import { type PackageApiExampleProjection } from "./example-projections.ts";
import { loadPackageDocuments, type PackageMarkdownDocument } from "../package-documents.ts";
import {
  assertProjection,
  assertTarget,
  markdownTargetKey
} from "./example-projection-validation.ts";

const EXAMPLE_DIRECTORY = "docs/examples/package-api";

export interface ExamplePayload {
  readonly content: string;
  readonly sourcePath: string;
}

interface ExampleSourceCatalog {
  readonly regions: ReadonlyMap<string, ExamplePayload>;
  readonly sourcesByRepositoryPath: ReadonlyMap<string, string>;
}

export function collectExamplePayloads(
  repositoryRoot: string,
  projections: readonly PackageApiExampleProjection[],
  markdownDocuments = loadPackageDocuments(repositoryRoot).markdownDocuments
): ReadonlyMap<string, ExamplePayload> {
  const sourcePaths = collectExampleSourcePaths(repositoryRoot);
  const { regions, sourcesByRepositoryPath } = collectExampleSources(repositoryRoot, sourcePaths);
  const payloads = resolveProjectionPayloads(
    projections,
    regions,
    markdownDocuments,
    sourcesByRepositoryPath
  );
  assertAllExampleInputsAreProjected(repositoryRoot, sourcePaths, regions, projections);
  return payloads;
}

function collectExampleSources(
  repositoryRoot: string,
  sourcePaths: readonly string[]
): ExampleSourceCatalog {
  const sourcesByRepositoryPath = new Map<string, string>();
  const regionIds = new Set<string>();
  const regions = new Map<string, ExamplePayload>();
  for (const sourcePath of sourcePaths) {
    const content = readText(sourcePath);
    assertSourceText(sourcePath, content);
    const repositoryPath = toRepositoryPath(repositoryRoot, sourcePath);
    sourcesByRepositoryPath.set(repositoryPath, content);
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
  return { regions, sourcesByRepositoryPath };
}

function resolveProjectionPayloads(
  projections: readonly PackageApiExampleProjection[],
  regions: ReadonlyMap<string, ExamplePayload>,
  markdownDocuments: readonly PackageMarkdownDocument[],
  sourcesByRepositoryPath: ReadonlyMap<string, string>
): ReadonlyMap<string, ExamplePayload> {
  const projectionIds = new Set<string>();
  const projectionRegions = new Set<string>();
  const usedMarkdownTargets = new Set<string>();
  const payloads = new Map<string, ExamplePayload>();
  for (const projection of projections) {
    assertProjection(projection, markdownDocuments);
    if (projectionIds.has(projection.id)) {
      throw new Error(`duplicate package API example projection id: ${projection.id}`);
    }
    projectionIds.add(projection.id);
    if (!sourcesByRepositoryPath.has(projection.sourcePath)) {
      throw new Error(`unknown package API example source: ${projection.sourcePath}`);
    }
    const payload = payloadForProjection(projection, regions, sourcesByRepositoryPath);
    const key =
      projection.regionId === undefined
        ? projection.sourcePath
        : regionKey(projection.sourcePath, projection.regionId);
    if (projectionRegions.has(key)) {
      throw new Error(`duplicate package API example projection source or region: ${key}`);
    }
    projectionRegions.add(key);
    for (const target of projection.targets) {
      assertTarget(target, projection.id, markdownDocuments);
      if (target.kind !== "markdown") continue;
      const targetKey = markdownTargetKey(target.documentId, target.headingPath);
      if (usedMarkdownTargets.has(targetKey)) {
        throw new Error(`duplicate package API Markdown example target: ${targetKey}`);
      }
      usedMarkdownTargets.add(targetKey);
    }
    payloads.set(projection.id, payload);
  }
  return payloads;
}

function assertAllExampleInputsAreProjected(
  repositoryRoot: string,
  sourcePaths: readonly string[],
  regions: ReadonlyMap<string, ExamplePayload>,
  projections: readonly PackageApiExampleProjection[]
): void {
  const projectionRegions = projectedRegions(projections);
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
}

function projectedRegions(
  projections: readonly PackageApiExampleProjection[]
): ReadonlySet<string> {
  return new Set(
    projections.map((projection) =>
      projection.regionId === undefined
        ? projection.sourcePath
        : regionKey(projection.sourcePath, projection.regionId)
    )
  );
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
  const lines = content.split("\n");
  return materializeExampleRegions(
    sourcePath,
    lines,
    collectExampleRegionBounds(sourcePath, lines)
  );
}

type ExampleRegionBounds = Readonly<{
  readonly endLineIndex: number;
  readonly startLineIndex: number;
}>;

interface ExampleRegionParseState {
  readonly bounds: Map<string, ExampleRegionBounds>;
  readonly openRegions: { id: string; lineIndex: number }[];
  readonly seenRegionIds: Set<string>;
}

function collectExampleRegionBounds(
  sourcePath: string,
  lines: readonly string[]
): ReadonlyMap<string, ExampleRegionBounds> {
  const state: ExampleRegionParseState = {
    bounds: new Map(),
    openRegions: [],
    seenRegionIds: new Set()
  };
  for (const [lineIndex, line] of lines.entries()) {
    applyExampleRegionMarker(sourcePath, line, lineIndex, state);
  }
  const open = state.openRegions.at(-1);
  if (open !== undefined)
    throw new Error(`unclosed package API example region ${open.id} in ${sourcePath}`);
  return state.bounds;
}

function applyExampleRegionMarker(
  sourcePath: string,
  line: string,
  lineIndex: number,
  state: ExampleRegionParseState
): void {
  const { bounds, openRegions, seenRegionIds } = state;
  const marker = exampleRegionMarker(line, sourcePath, lineIndex);
  if (marker === undefined) return;
  if (marker.kind === "start") {
    if (seenRegionIds.has(marker.id)) {
      throw new Error(`duplicate package API example region ${marker.id} in ${sourcePath}`);
    }
    seenRegionIds.add(marker.id);
    openRegions.push({ id: marker.id, lineIndex });
    return;
  }
  const open = openRegions.pop();
  if (open === undefined || open.id !== marker.id) {
    throw new Error(
      `unclosed package API example region ${marker.id} in ${sourcePath}:${lineIndex + 1}`
    );
  }
  bounds.set(open.id, Object.freeze({ endLineIndex: lineIndex, startLineIndex: open.lineIndex }));
}

function exampleRegionMarker(
  line: string,
  sourcePath: string,
  lineIndex: number
): Readonly<{ readonly id: string; readonly kind: "end" | "start" }> | undefined {
  const start = /^\/\/ #region package-api-example:([a-z][a-z0-9-]*)$/.exec(line);
  if (start !== null) {
    const id = start[1];
    if (id === undefined) throw new TypeError("package API example start marker has no id");
    return Object.freeze({ id, kind: "start" });
  }
  const end = /^\/\/ #endregion package-api-example:([a-z][a-z0-9-]*)$/.exec(line);
  if (end !== null) {
    const id = end[1];
    if (id === undefined) throw new TypeError("package API example end marker has no id");
    return Object.freeze({ id, kind: "end" });
  }
  if (line.includes("package-api-example:")) {
    throw new Error(`malformed package API example marker in ${sourcePath}:${lineIndex + 1}`);
  }
  return undefined;
}

function materializeExampleRegions(
  sourcePath: string,
  lines: readonly string[],
  regionBounds: ReadonlyMap<string, ExampleRegionBounds>
): ReadonlyMap<string, string> {
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

function payloadForProjection(
  projection: PackageApiExampleProjection,
  regions: ReadonlyMap<string, ExamplePayload>,
  sourcesByRepositoryPath: ReadonlyMap<string, string>
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
  const content = sourcesByRepositoryPath.get(projection.sourcePath);
  if (content === undefined)
    throw new Error(`unknown package API example source: ${projection.sourcePath}`);
  if (content.includes("package-api-example:")) {
    throw new Error(
      `full-file package API example cannot contain regions: ${projection.sourcePath}`
    );
  }
  return Object.freeze({ content, sourcePath: projection.sourcePath });
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

function readText(path: string): string {
  return readFileSync(path, "utf8");
}
