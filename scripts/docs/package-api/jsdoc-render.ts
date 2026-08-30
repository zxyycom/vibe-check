import { readFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

import type { PackageApiExampleProjection } from "./example-projections.ts";
import type { ExamplePayload } from "./example-payloads.ts";
import type { RenderedPackageApiFile } from "./render.ts";
import { discoverJSDocExampleTargets } from "./jsdoc-target-discovery.ts";

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

export function renderJSDocSources(
  repositoryRoot: string,
  projections: readonly PackageApiExampleProjection[],
  payloads: ReadonlyMap<string, ExamplePayload>
): readonly RenderedPackageApiFile[] {
  const grouped = groupJSDocProjections(projections, payloads);
  const targets = knownJSDocTargets(repositoryRoot, grouped);
  return renderJSDocTargetSources(repositoryRoot, targets, grouped);
}

function groupJSDocProjections(
  projections: readonly PackageApiExampleProjection[],
  payloads: ReadonlyMap<string, ExamplePayload>
): ReadonlyMap<string, readonly JSDocProjection[]> {
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
  return grouped;
}

function knownJSDocTargets(
  repositoryRoot: string,
  grouped: ReadonlyMap<string, readonly JSDocProjection[]>
): ReadonlyMap<string, JSDocTarget> {
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
  return targets;
}

function renderJSDocTargetSources(
  repositoryRoot: string,
  targets: ReadonlyMap<string, JSDocTarget>,
  grouped: ReadonlyMap<string, readonly JSDocProjection[]>
): readonly RenderedPackageApiFile[] {
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

  const jsdocSources = [...replacementsBySource].map(([absolutePath, replacements]) =>
    Object.freeze({ absolutePath, content: applyJSDocReplacements(absolutePath, replacements) })
  );
  return Object.freeze(
    jsdocSources.sort((left, right) => left.absolutePath.localeCompare(right.absolutePath))
  );
}

function applyJSDocReplacements(
  absolutePath: string,
  replacements: readonly JSDocReplacement[]
): string {
  let content = readText(absolutePath);
  for (const replacement of replacements.toSorted((left, right) => right.start - left.start)) {
    content = `${content.slice(0, replacement.start)}${replacement.content}${content.slice(replacement.end)}`;
  }
  return content;
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

function repositoryFilePath(repositoryRoot: string, repositoryPath: string): string {
  const filePath = resolve(repositoryRoot, repositoryPath);
  const relativePath = relative(repositoryRoot, filePath);
  if (relativePath === "" || relativePath === ".." || relativePath.startsWith(`..${sep}`)) {
    throw new Error(`package API documentation path escapes repository root: ${repositoryPath}`);
  }
  return filePath;
}

function jsdocTargetKey(sourcePath: string, declarationName: string): string {
  return `${sourcePath}#${declarationName}`;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readText(path: string): string {
  return readFileSync(path, "utf8");
}

function requiredPayload(
  payloads: ReadonlyMap<string, ExamplePayload>,
  id: string
): ExamplePayload {
  const payload = payloads.get(id);
  if (payload === undefined) throw new Error(`missing package API example payload: ${id}`);
  return payload;
}
