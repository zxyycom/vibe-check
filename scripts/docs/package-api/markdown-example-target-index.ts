export interface MarkdownHeading {
  readonly level: number;
  readonly lineIndex: number;
  readonly path: readonly string[];
}

export interface MarkdownFence {
  readonly endLineIndex: number;
  readonly info: string;
  readonly startLineIndex: number;
}

export interface MarkdownStructure {
  readonly fences: readonly MarkdownFence[];
  readonly headings: readonly MarkdownHeading[];
}

export interface MarkdownTargetIndex {
  readonly headingsByPathKey: ReadonlyMap<string, readonly MarkdownHeading[]>;
  readonly typeScriptFencesByHeading: ReadonlyMap<MarkdownHeading, readonly MarkdownFence[]>;
}

interface HeadingSection {
  readonly heading: MarkdownHeading;
  readonly typeScriptFences: MarkdownFence[];
}

interface HeadingSectionCursor {
  readonly activeSections: HeadingSection[];
  readonly sections: readonly HeadingSection[];
  nextSectionIndex: number;
}

/** Heading levels are bounded by six, so each fence contributes to at most six sections. */
export function indexMarkdownTargets(structure: MarkdownStructure): MarkdownTargetIndex {
  return {
    headingsByPathKey: indexHeadingsByPath(structure.headings),
    typeScriptFencesByHeading: indexSectionTypeScriptFences(structure)
  };
}

function indexHeadingsByPath(
  headings: readonly MarkdownHeading[]
): MarkdownTargetIndex["headingsByPathKey"] {
  const headingsByPath = new Map<string, MarkdownHeading[]>();
  for (const heading of headings) {
    const key = headingPathKey(heading.path);
    const matches = headingsByPath.get(key) ?? [];
    matches.push(heading);
    headingsByPath.set(key, matches);
  }
  return headingsByPath;
}

function indexSectionTypeScriptFences(
  structure: MarkdownStructure
): MarkdownTargetIndex["typeScriptFencesByHeading"] {
  const sections: HeadingSection[] = structure.headings.map((heading) => ({
    heading,
    typeScriptFences: []
  }));
  const cursor: HeadingSectionCursor = {
    activeSections: [],
    sections,
    nextSectionIndex: 0
  };
  for (const fence of structure.fences) {
    advanceHeadingSections(cursor, fence.startLineIndex);
    if (fence.info !== "ts" && fence.info !== "typescript") continue;
    for (const section of cursor.activeSections) section.typeScriptFences.push(fence);
  }
  return new Map(sections.map(({ heading, typeScriptFences }) => [heading, typeScriptFences]));
}

/** Advances the monotone section sweep, keeping only ancestors not ended by a peer heading. */
function advanceHeadingSections(cursor: HeadingSectionCursor, beforeLineIndex: number): void {
  while (cursor.nextSectionIndex < cursor.sections.length) {
    const section = cursor.sections[cursor.nextSectionIndex];
    if (section === undefined || section.heading.lineIndex >= beforeLineIndex) break;
    let previous = cursor.activeSections.at(-1);
    while (previous !== undefined && previous.heading.level >= section.heading.level) {
      cursor.activeSections.pop();
      previous = cursor.activeSections.at(-1);
    }
    cursor.activeSections.push(section);
    cursor.nextSectionIndex += 1;
  }
}

export function headingPathKey(headingPath: readonly string[]): string {
  return JSON.stringify(headingPath);
}
