import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

import { type PackageApiExampleProjection } from "./example-projections.ts";
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

export function collectExamplePayloads(
  repositoryRoot: string,
  projections: readonly PackageApiExampleProjection[]
): ReadonlyMap<string, ExamplePayload> {
  const sourcePaths = collectExampleSourcePaths(repositoryRoot);
  const regions = collectExampleRegions(repositoryRoot, sourcePaths);
  const payloads = resolveProjectionPayloads(repositoryRoot, projections, sourcePaths, regions);
  assertAllExampleInputsAreProjected(repositoryRoot, sourcePaths, regions, projections);
  return payloads;
}

function collectExampleRegions(
  repositoryRoot: string,
  sourcePaths: readonly string[]
): ReadonlyMap<string, ExamplePayload> {
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
  return regions;
}

function resolveProjectionPayloads(
  repositoryRoot: string,
  projections: readonly PackageApiExampleProjection[],
  sourcePaths: readonly string[],
  regions: ReadonlyMap<string, ExamplePayload>
): ReadonlyMap<string, ExamplePayload> {
  const sourcePathSet = new Set(
    sourcePaths.map((sourcePath) => toRepositoryPath(repositoryRoot, sourcePath))
  );
  const projectionIds = new Set<string>();
  const projectionRegions = new Set<string>();
  const usedMarkdownTargets = new Set<string>();
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

function collectExampleRegionBounds(
  sourcePath: string,
  lines: readonly string[]
): ReadonlyMap<string, ExampleRegionBounds> {
  const regionBounds = new Map<string, ExampleRegionBounds>();
  const openRegions: { id: string; lineIndex: number }[] = [];
  for (const [lineIndex, line] of lines.entries()) {
    applyExampleRegionMarker(sourcePath, line, lineIndex, regionBounds, openRegions);
  }
  const open = openRegions.at(-1);
  if (open !== undefined)
    throw new Error(`unclosed package API example region ${open.id} in ${sourcePath}`);
  return regionBounds;
}

function applyExampleRegionMarker(
  sourcePath: string,
  line: string,
  lineIndex: number,
  regionBounds: Map<string, ExampleRegionBounds>,
  openRegions: { id: string; lineIndex: number }[]
): void {
  const marker = exampleRegionMarker(line, sourcePath, lineIndex);
  if (marker === undefined) return;
  if (marker.kind === "start") {
    if (regionBounds.has(marker.id) || openRegions.some((region) => region.id === marker.id)) {
      throw new Error(`duplicate package API example region ${marker.id} in ${sourcePath}`);
    }
    openRegions.push({ id: marker.id, lineIndex });
    return;
  }
  const open = openRegions.pop();
  if (open === undefined || open.id !== marker.id) {
    throw new Error(
      `unclosed package API example region ${marker.id} in ${sourcePath}:${lineIndex + 1}`
    );
  }
  regionBounds.set(
    open.id,
    Object.freeze({ endLineIndex: lineIndex, startLineIndex: open.lineIndex })
  );
}

function exampleRegionMarker(
  line: string,
  sourcePath: string,
  lineIndex: number
): Readonly<{ readonly id: string; readonly kind: "end" | "start" }> | undefined {
  const start = /^\/\/ #region package-api-example:([a-z][a-z0-9-]*)$/.exec(line);
  if (start !== null) return Object.freeze({ id: start[1], kind: "start" });
  const end = /^\/\/ #endregion package-api-example:([a-z][a-z0-9-]*)$/.exec(line);
  if (end !== null) return Object.freeze({ id: end[1], kind: "end" });
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
