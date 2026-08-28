interface MarkdownManagedRegion {
  readonly endLineIndex: number;
  readonly startLineIndex: number;
}

export interface MarkdownManagedRegionReplacement {
  readonly managedRegionId: string;
  readonly replacementLines: readonly string[];
}

interface LocatedMarkdownManagedRegionReplacement {
  readonly region: MarkdownManagedRegion;
  readonly replacementLines: readonly string[];
}

const MARKDOWN_MANAGED_REGION_MARKER =
  /^<!-- package-api-example:(start|end):([a-z][a-z0-9-]*) -->$/;
const MARKDOWN_MANAGED_REGION_MARKER_PREFIX = /^\s*<!-- package-api-example:/;

/** Replaces exact managed-region bodies while preserving the surrounding Markdown bytes. */
export function renderMarkdownManagedRegions(
  input: Readonly<{
    readonly documentPackagePath: string;
    readonly replacements: readonly MarkdownManagedRegionReplacement[];
    readonly sourceMarkdown: string;
  }>
): string {
  assertMarkdownSourceText(input.documentPackagePath, input.sourceMarkdown);
  const regions = parseMarkdownManagedRegions(input.documentPackagePath, input.sourceMarkdown);
  const replacements = locateMarkdownManagedRegionReplacements(
    input.documentPackagePath,
    input.replacements,
    regions
  );
  const sourceLines = input.sourceMarkdown.split("\n");
  for (const replacement of replacements) {
    sourceLines.splice(
      replacement.region.startLineIndex + 1,
      replacement.region.endLineIndex - replacement.region.startLineIndex - 1,
      ...replacement.replacementLines
    );
  }
  return sourceLines.join("\n");
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
}

function parseMarkdownManagedRegions(
  documentPackagePath: string,
  sourceMarkdown: string
): ReadonlyMap<string, MarkdownManagedRegion> {
  const regions = new Map<string, MarkdownManagedRegion>();
  let openRegion: Readonly<{ readonly id: string; readonly lineIndex: number }> | undefined;
  for (const [lineIndex, line] of sourceMarkdown.split("\n").entries()) {
    const marker = MARKDOWN_MANAGED_REGION_MARKER.exec(line);
    if (MARKDOWN_MANAGED_REGION_MARKER_PREFIX.test(line) && marker === null) {
      throw new Error(
        `malformed package API Markdown managed-region marker in ${documentPackagePath}`
      );
    }
    if (marker === null) continue;
    const [, boundary, managedRegionId] = marker;
    if (boundary === "start") {
      if (openRegion !== undefined) {
        throw new Error(
          `nested package API Markdown managed region in ${documentPackagePath}: ${managedRegionId}`
        );
      }
      if (regions.has(managedRegionId)) {
        throw new Error(
          `duplicate package API Markdown managed region in ${documentPackagePath}: ${managedRegionId}`
        );
      }
      openRegion = Object.freeze({ id: managedRegionId, lineIndex });
      continue;
    }
    if (openRegion === undefined || openRegion.id !== managedRegionId) {
      throw new Error(
        `mismatched package API Markdown managed region in ${documentPackagePath}: ${managedRegionId}`
      );
    }
    regions.set(
      managedRegionId,
      Object.freeze({
        endLineIndex: lineIndex,
        startLineIndex: openRegion.lineIndex
      })
    );
    openRegion = undefined;
  }
  if (openRegion !== undefined) {
    throw new Error(
      `unclosed package API Markdown managed region in ${documentPackagePath}: ${openRegion.id}`
    );
  }
  return regions;
}

function locateMarkdownManagedRegionReplacements(
  documentPackagePath: string,
  replacements: readonly MarkdownManagedRegionReplacement[],
  regions: ReadonlyMap<string, MarkdownManagedRegion>
): readonly LocatedMarkdownManagedRegionReplacement[] {
  const replacementIds = new Set<string>();
  const locatedReplacements: LocatedMarkdownManagedRegionReplacement[] = [];
  for (const replacement of replacements) {
    if (replacementIds.has(replacement.managedRegionId)) {
      throw new Error(
        `duplicate package API Markdown managed-region replacement in ${documentPackagePath}: ${replacement.managedRegionId}`
      );
    }
    if (replacement.replacementLines.length === 0) {
      throw new Error(
        `empty package API Markdown managed-region replacement in ${documentPackagePath}: ${replacement.managedRegionId}`
      );
    }
    const region = regions.get(replacement.managedRegionId);
    if (region === undefined) {
      throw new Error(
        `missing package API Markdown managed region in ${documentPackagePath}: ${replacement.managedRegionId}`
      );
    }
    replacementIds.add(replacement.managedRegionId);
    locatedReplacements.push(
      Object.freeze({ region, replacementLines: replacement.replacementLines })
    );
  }

  for (const managedRegionId of regions.keys()) {
    if (!replacementIds.has(managedRegionId)) {
      throw new Error(
        `unknown package API Markdown managed region in ${documentPackagePath}: ${managedRegionId}`
      );
    }
  }

  return Object.freeze(
    locatedReplacements.sort(
      (left, right) => right.region.startLineIndex - left.region.startLineIndex
    )
  );
}
