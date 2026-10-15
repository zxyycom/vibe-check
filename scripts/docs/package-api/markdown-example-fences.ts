import {
  headingPathKey,
  indexMarkdownTargets,
  type MarkdownFence,
  type MarkdownHeading,
  type MarkdownStructure,
  type MarkdownTargetIndex
} from "./markdown-example-target-index.ts";

export interface MarkdownExampleFenceReplacement {
  readonly headingPath: readonly string[];
  readonly replacementLines: readonly string[];
}

interface LocatedMarkdownExampleFenceReplacement {
  readonly fence: MarkdownFence;
  readonly replacementLines: readonly string[];
}

interface OpenMarkdownFence {
  readonly character: "`" | "~";
  readonly info: string;
  readonly length: number;
  readonly startLineIndex: number;
}

const PACKAGE_API_EXAMPLE_PROJECTION_MARKER = /^\s*<!--\s*\/?package-api-example:/m;

export function hasPackageApiExampleProjectionMarker(markdown: string): boolean {
  return PACKAGE_API_EXAMPLE_PROJECTION_MARKER.test(markdown);
}

/** Replaces one fenced TypeScript example in each natural Markdown section target. */
export function renderMarkdownExampleFences(
  input: Readonly<{
    readonly documentPackagePath: string;
    readonly replacements: readonly MarkdownExampleFenceReplacement[];
    readonly sourceMarkdown: string;
  }>
): string {
  assertMarkdownSourceText(input.documentPackagePath, input.sourceMarkdown);
  const structure = parseMarkdownStructure(input.documentPackagePath, input.sourceMarkdown);
  const locatedReplacements = locateMarkdownExampleFenceReplacements(
    input.documentPackagePath,
    input.replacements,
    structure
  );
  const sourceLines = input.sourceMarkdown.split("\n");
  const replacementsAscendingByLine = locatedReplacements.toReversed();
  const hasOverlappingFences = replacementsAscendingByLine.some(
    (replacement, index) =>
      index > 0 &&
      replacement.fence.startLineIndex <=
        (replacementsAscendingByLine[index - 1]?.fence.endLineIndex ?? -1)
  );
  // Ancestor and child heading targets can select the same fence. Preserve the existing ordered
  // splice semantics for overlapping targets; only disjoint ranges admit one-pass construction.
  if (hasOverlappingFences) {
    for (const replacement of locatedReplacements) {
      sourceLines.splice(
        replacement.fence.startLineIndex,
        replacement.fence.endLineIndex - replacement.fence.startLineIndex + 1,
        ...replacement.replacementLines
      );
    }
    return sourceLines.join("\n");
  }
  const chunks: string[] = [];
  let nextSourceLineIndex = 0;
  for (const replacement of replacementsAscendingByLine) {
    if (nextSourceLineIndex < replacement.fence.startLineIndex)
      chunks.push(
        sourceLines.slice(nextSourceLineIndex, replacement.fence.startLineIndex).join("\n")
      );
    chunks.push(replacement.replacementLines.join("\n"));
    nextSourceLineIndex = replacement.fence.endLineIndex + 1;
  }
  if (nextSourceLineIndex < sourceLines.length)
    chunks.push(sourceLines.slice(nextSourceLineIndex).join("\n"));
  return chunks.join("\n");
}

function assertMarkdownSourceText(documentPackagePath: string, sourceMarkdown: string): void {
  if (
    sourceMarkdown.includes("\r") ||
    !sourceMarkdown.endsWith("\n") ||
    sourceMarkdown.endsWith("\n\n")
  ) {
    throw new Error(
      `package Markdown source must use LF and one trailing LF: ${documentPackagePath}`
    );
  }
  if (hasPackageApiExampleProjectionMarker(sourceMarkdown)) {
    throw new Error(
      `package Markdown contains a package example projection marker: ${documentPackagePath}`
    );
  }
}

function parseMarkdownStructure(
  documentPackagePath: string,
  sourceMarkdown: string
): MarkdownStructure {
  const fences: MarkdownFence[] = [];
  const headings: MarkdownHeading[] = [];
  const headingStack: Array<string | undefined> = [];
  let openFence: OpenMarkdownFence | undefined;
  for (const [lineIndex, line] of sourceMarkdown.split("\n").entries()) {
    if (openFence !== undefined) {
      if (isFenceClose(line, openFence)) {
        fences.push(
          Object.freeze({
            endLineIndex: lineIndex,
            info: openFence.info,
            startLineIndex: openFence.startLineIndex
          })
        );
        openFence = undefined;
      }
      continue;
    }

    const fence = parseFenceOpen(line, lineIndex);
    if (fence !== undefined) {
      openFence = fence;
      continue;
    }

    const heading = parseHeading(line, lineIndex, headingStack);
    if (heading !== undefined) headings.push(heading);
  }
  if (openFence !== undefined) {
    throw new Error(
      `unclosed Markdown fence in ${documentPackagePath}:${openFence.startLineIndex + 1}`
    );
  }
  return Object.freeze({ fences: Object.freeze(fences), headings: Object.freeze(headings) });
}

function parseFenceOpen(line: string, lineIndex: number): OpenMarkdownFence | undefined {
  const match = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
  if (match === null) return undefined;
  const marker = match[1];
  if (marker === undefined) return undefined;
  const character = marker[0];
  if (character !== "`" && character !== "~") return undefined;
  return Object.freeze({
    character,
    info: (match[2] ?? "").trim(),
    length: marker.length,
    startLineIndex: lineIndex
  });
}

function isFenceClose(line: string, fence: OpenMarkdownFence): boolean {
  const match = /^ {0,3}(`{3,}|~{3,})[ \t]*$/.exec(line);
  const marker = match?.[1];
  return marker !== undefined && marker[0] === fence.character && marker.length >= fence.length;
}

function parseHeading(
  line: string,
  lineIndex: number,
  headingStack: Array<string | undefined>
): MarkdownHeading | undefined {
  const match = /^ {0,3}(#{1,6})[ \t]+(.+)$/.exec(line);
  if (match === null) return undefined;
  const marker = match[1];
  const authoredText = match[2];
  if (marker === undefined || authoredText === undefined) return undefined;
  const text = authoredText
    .trimEnd()
    .replace(/[ \t]+#+[ \t]*$/, "")
    .trimEnd();
  if (text.length === 0) return undefined;
  const level = marker.length;
  headingStack.length = level - 1;
  headingStack[level - 1] = text;
  const path = headingStack
    .slice(1, level)
    .filter((heading): heading is string => heading !== undefined);
  return Object.freeze({
    level,
    lineIndex,
    path: Object.freeze(path)
  });
}

function locateMarkdownExampleFenceReplacements(
  documentPackagePath: string,
  replacements: readonly MarkdownExampleFenceReplacement[],
  structure: MarkdownStructure
): readonly LocatedMarkdownExampleFenceReplacement[] {
  const replacementPaths = new Set<string>();
  const locatedReplacements: LocatedMarkdownExampleFenceReplacement[] = [];
  const index = indexMarkdownTargets(structure);
  for (const replacement of replacements) {
    const key = headingPathKey(replacement.headingPath);
    if (replacementPaths.has(key)) {
      throw new Error(
        `duplicate package API Markdown example target in ${documentPackagePath}: ${displayHeadingPath(replacement.headingPath)}`
      );
    }
    if (replacement.replacementLines.length === 0) {
      throw new Error(
        `empty package API Markdown example replacement in ${documentPackagePath}: ${displayHeadingPath(replacement.headingPath)}`
      );
    }
    const heading = requiredTargetHeading(
      documentPackagePath,
      replacement.headingPath,
      index.headingsByPathKey
    );
    const fence = requiredSectionTypeScriptFence(
      documentPackagePath,
      heading,
      index.typeScriptFencesByHeading
    );
    replacementPaths.add(key);
    locatedReplacements.push(
      Object.freeze({ fence, replacementLines: replacement.replacementLines })
    );
  }
  return Object.freeze(
    locatedReplacements.sort(
      (left, right) => right.fence.startLineIndex - left.fence.startLineIndex
    )
  );
}

function requiredTargetHeading(
  documentPackagePath: string,
  headingPath: readonly string[],
  headingsByPathKey: MarkdownTargetIndex["headingsByPathKey"]
): MarkdownHeading {
  const matches = headingsByPathKey.get(headingPathKey(headingPath)) ?? [];
  if (matches.length !== 1) {
    throw new Error(
      `expected exactly one package API Markdown heading target in ${documentPackagePath}: ${displayHeadingPath(headingPath)}; found ${matches.length}`
    );
  }
  const heading = matches[0];
  if (heading === undefined) throw new Error("package API Markdown heading target is missing");
  return heading;
}

function requiredSectionTypeScriptFence(
  documentPackagePath: string,
  heading: MarkdownHeading,
  typeScriptFencesByHeading: MarkdownTargetIndex["typeScriptFencesByHeading"]
): MarkdownFence {
  const matches = typeScriptFencesByHeading.get(heading) ?? [];
  if (matches.length !== 1) {
    throw new Error(
      `expected exactly one fenced TypeScript example under ${displayHeadingPath(heading.path)} in ${documentPackagePath}; found ${matches.length}`
    );
  }
  const fence = matches[0];
  if (fence === undefined) throw new Error("package API Markdown TypeScript fence is missing");
  return fence;
}

function displayHeadingPath(headingPath: readonly string[]): string {
  return headingPath.join(" > ");
}
