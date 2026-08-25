import GithubSlugger from "github-slugger";
import { fromMarkdown } from "mdast-util-from-markdown";
import { frontmatterFromMarkdown } from "mdast-util-frontmatter";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { frontmatter } from "micromark-extension-frontmatter";
import { gfm } from "micromark-extension-gfm";

interface MarkdownAstPoint {
  readonly line: number;
  readonly column: number;
  readonly offset?: number;
}

interface MarkdownAstPosition {
  readonly start: MarkdownAstPoint;
  readonly end: MarkdownAstPoint;
}

interface MarkdownAstNode {
  readonly type: string;
  readonly position?: MarkdownAstPosition;
  readonly children?: readonly MarkdownAstNode[];
  readonly value?: string;
  readonly url?: string;
  readonly identifier?: string;
  readonly alt?: string | null;
}

type MarkdownOccurrenceKind = "image" | "link";

interface MarkdownSourcePosition {
  readonly line: number;
  readonly column: number;
}

interface MarkdownSourceRange {
  readonly startOffset: number;
  readonly endOffset: number;
  readonly start: MarkdownSourcePosition;
  readonly end: MarkdownSourcePosition;
}

interface MarkdownLinkOccurrence {
  readonly kind: MarkdownOccurrenceKind;
  readonly rawDestination: string;
  readonly range: MarkdownSourceRange;
}

interface MarkdownHeading {
  readonly slug: string;
  readonly range: MarkdownSourceRange;
}

interface ParsedMarkdownLinkFacts {
  readonly occurrences: readonly MarkdownLinkOccurrence[];
  readonly headings: readonly MarkdownHeading[];
}

type MarkdownLinkParseResult =
  | Readonly<{
      readonly ok: true;
      readonly facts: ParsedMarkdownLinkFacts;
    }>
  | Readonly<{
      readonly ok: false;
      readonly reason: "markdown-parse-failure";
    }>;

/**
 * Link-private Markdown grammar adapter. It deliberately exposes facts rather
 * than the dependency AST, so resolver ownership starts after parsing.
 */
export function parseMarkdownLinkFacts(markdown: string): MarkdownLinkParseResult {
  if (hasUnpairedSurrogate(markdown)) {
    return parseFailure();
  }

  try {
    const tree: unknown = fromMarkdown(markdown, {
      extensions: [gfm(), frontmatter(["yaml"])],
      mdastExtensions: [gfmFromMarkdown(), frontmatterFromMarkdown(["yaml"])]
    });
    if (!isMarkdownAstNode(tree)) {
      return parseFailure();
    }
    return collectMarkdownLinkFacts(tree);
  } catch {
    return parseFailure();
  }
}

function collectMarkdownLinkFacts(tree: MarkdownAstNode): MarkdownLinkParseResult {
  const definitions = definitionsByIdentifier(tree);
  const occurrences: MarkdownLinkOccurrence[] = [];
  const headings: MarkdownHeading[] = [];
  const slugger = new GithubSlugger();

  forEachNode(tree, (node) => {
    const occurrence = occurrenceFromNode(node, definitions);
    if (occurrence !== null) {
      occurrences.push(occurrence);
    }

    if (node.type === "heading") {
      const heading = headingFromNode(node, slugger);
      if (heading === null) {
        throw new Error("Markdown heading did not include a source range.");
      }
      headings.push(heading);
    }
  });

  return Object.freeze({
    ok: true as const,
    facts: Object.freeze({
      occurrences: Object.freeze(occurrences),
      headings: Object.freeze(headings)
    })
  });
}

function definitionsByIdentifier(tree: MarkdownAstNode): ReadonlyMap<string, string> {
  const definitions = new Map<string, string>();

  forEachNode(tree, (node) => {
    if (node.type !== "definition") {
      return;
    }
    if (node.identifier === undefined || node.url === undefined) {
      throw new Error("Markdown definition was missing a destination.");
    }
    if (!definitions.has(node.identifier)) {
      definitions.set(node.identifier, node.url);
    }
  });

  return definitions;
}

function occurrenceFromNode(
  node: MarkdownAstNode,
  definitions: ReadonlyMap<string, string>
): MarkdownLinkOccurrence | null {
  if (node.type === "link") {
    return occurrenceFromResource(node, "link");
  }
  if (node.type === "image") {
    return occurrenceFromResource(node, "image");
  }
  if (node.type === "linkReference") {
    return occurrenceFromReference(node, "link", definitions);
  }
  if (node.type === "imageReference") {
    return occurrenceFromReference(node, "image", definitions);
  }
  return null;
}

function occurrenceFromResource(
  node: MarkdownAstNode,
  kind: MarkdownOccurrenceKind
): MarkdownLinkOccurrence | null {
  if (node.url === undefined) {
    throw new Error("Markdown occurrence was missing a destination.");
  }
  return occurrenceWithDestination(node, kind, node.url);
}

function occurrenceWithDestination(
  node: MarkdownAstNode,
  kind: MarkdownOccurrenceKind,
  rawDestination: string
): MarkdownLinkOccurrence | null {
  const range = sourceRangeFromPosition(node.position);
  if (range === null) {
    throw new Error("Markdown occurrence did not include a source range.");
  }
  return Object.freeze({ kind, rawDestination, range });
}

function occurrenceFromReference(
  node: MarkdownAstNode,
  kind: MarkdownOccurrenceKind,
  definitions: ReadonlyMap<string, string>
): MarkdownLinkOccurrence | null {
  if (node.identifier === undefined) {
    throw new Error("Markdown reference was missing an identifier.");
  }
  const rawDestination = definitions.get(node.identifier);
  if (rawDestination === undefined) {
    return null;
  }
  return occurrenceWithDestination(node, kind, rawDestination);
}

function headingFromNode(node: MarkdownAstNode, slugger: GithubSlugger): MarkdownHeading | null {
  const range = sourceRangeFromPosition(node.position);
  if (range === null) {
    return null;
  }
  return Object.freeze({
    slug: slugger.slug(markdownText(node)),
    range
  });
}

function markdownText(node: MarkdownAstNode): string {
  if (node.value !== undefined) {
    return node.value;
  }
  if (node.children !== undefined) {
    return node.children.map(markdownText).join("");
  }
  if (node.type === "image" || node.type === "imageReference") {
    return node.alt ?? "";
  }
  return "";
}

function isMarkdownAstNode(value: unknown): value is MarkdownAstNode {
  if (
    typeof value !== "object" ||
    value === null ||
    !("type" in value) ||
    !("children" in value) ||
    !Array.isArray(value.children)
  ) {
    return false;
  }
  return typeof value.type === "string";
}

function sourceRangeFromPosition(
  position: MarkdownAstPosition | undefined
): MarkdownSourceRange | null {
  if (
    position === undefined ||
    position.start.offset === undefined ||
    position.end.offset === undefined
  ) {
    return null;
  }

  return Object.freeze({
    startOffset: position.start.offset,
    endOffset: position.end.offset,
    start: Object.freeze({ line: position.start.line, column: position.start.column }),
    end: Object.freeze({ line: position.end.line, column: position.end.column })
  });
}

function forEachNode(root: MarkdownAstNode, visitor: (node: MarkdownAstNode) => void): void {
  const nodes: MarkdownAstNode[] = [root];

  while (nodes.length > 0) {
    const node = nodes.pop();
    if (node === undefined) {
      return;
    }
    visitor(node);
    if (node.children !== undefined) {
      for (let index = node.children.length - 1; index >= 0; index -= 1) {
        const child = node.children[index];
        if (child !== undefined) {
          nodes.push(child);
        }
      }
    }
  }
}

function hasUnpairedSurrogate(markdown: string): boolean {
  for (let index = 0; index < markdown.length; index += 1) {
    const codeUnit = markdown.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const nextCodeUnit = markdown.charCodeAt(index + 1);
      if (!(nextCodeUnit >= 0xdc00 && nextCodeUnit <= 0xdfff)) {
        return true;
      }
      index += 1;
      continue;
    }
    if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      return true;
    }
  }
  return false;
}

function parseFailure(): MarkdownLinkParseResult {
  return Object.freeze({ ok: false as const, reason: "markdown-parse-failure" as const });
}

export type {
  MarkdownHeading,
  MarkdownLinkOccurrence,
  MarkdownLinkParseResult,
  MarkdownOccurrenceKind,
  MarkdownSourcePosition,
  MarkdownSourceRange,
  ParsedMarkdownLinkFacts
};
