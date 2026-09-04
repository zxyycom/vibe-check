import fs from "node:fs";
import path from "node:path";

import { expectedDocsValidationFailure, type DocsValidationDiagnostic } from "./diagnostics.ts";
import { FILE_SYSTEM } from "./task-contract.ts";
import { walkDocumentationFiles } from "./repository-files.ts";
import { toDocumentationAbsolutePath } from "./repository-paths.ts";

const linkPattern = /\[[^\]]+\]\(([^)]+)\)/g;

interface MissingLocalLinkDiagnostic extends DocsValidationDiagnostic {
  readonly data: Readonly<{
    readonly kind: "missing-local-link";
    readonly location: Readonly<{ readonly column: number; readonly line: number }>;
    readonly occurrence: number;
    readonly sourcePath: string;
    readonly targetPath: string;
  }>;
}

interface LocalLinkOccurrence {
  readonly filePath: string;
  readonly match: RegExpMatchArray;
  readonly occurrence: number;
  readonly repositoryRoot: string;
  readonly sourcePath: string;
  readonly text: string;
}

/** Validates local Markdown path targets and reports only explicit successful completion. */
export function validateMarkdownLinks(
  options: Readonly<{
    readonly markdownLinkRoots?: readonly string[];
    readonly report?: (message: string) => void;
    readonly repositoryRoot?: string;
  }> = {}
): void {
  const result = collectMarkdownLinkDiagnostics(options);
  if (result.diagnostics.length > 0) throw expectedDocsValidationFailure(result.diagnostics);
  options.report?.(`markdown links ok: ${result.fileCount} file(s)`);
}

/**
 * Collects every missing local-link occurrence in owner-defined order. This boundary only admits
 * canonical repository-relative paths so neither raw link text nor absolute paths enter Records.
 */
export function collectMarkdownLinkDiagnostics(
  options: Readonly<{
    readonly markdownLinkRoots?: readonly string[];
    readonly repositoryRoot?: string;
  }> = {}
): Readonly<{
  readonly diagnostics: readonly DocsValidationDiagnostic[];
  readonly fileCount: number;
}> {
  const repositoryRoot = path.resolve(options.repositoryRoot ?? toDocumentationAbsolutePath("."));
  const markdownFiles = markdownFilesForLinkValidation(
    repositoryRoot,
    options.markdownLinkRoots ?? FILE_SYSTEM.markdownLinkRoots
  );
  const diagnostics = markdownFiles.flatMap((filePath) =>
    collectFileLinkDiagnostics(repositoryRoot, filePath)
  );

  diagnostics.sort(compareDiagnostics);
  return Object.freeze({
    diagnostics: Object.freeze(diagnostics),
    fileCount: markdownFiles.length
  });
}

function collectFileLinkDiagnostics(
  repositoryRoot: string,
  filePath: string
): readonly MissingLocalLinkDiagnostic[] {
  const sourcePath = canonicalRepositoryRelativePath(repositoryRoot, filePath);
  const text = fs.readFileSync(filePath, "utf8");
  const diagnostics: MissingLocalLinkDiagnostic[] = [];
  let occurrence = 0;
  for (const match of text.matchAll(linkPattern)) {
    occurrence += 1;
    const diagnostic = missingLocalLinkDiagnostic({
      filePath,
      match,
      occurrence,
      repositoryRoot,
      sourcePath,
      text
    });
    if (diagnostic !== undefined) diagnostics.push(diagnostic);
  }
  return diagnostics;
}

function missingLocalLinkDiagnostic(
  input: LocalLinkOccurrence
): MissingLocalLinkDiagnostic | undefined {
  const targetPath = missingLocalTargetPath(input);
  if (targetPath === undefined) return undefined;

  const location = markdownLocation(input.text, input.match.index ?? 0);
  return missingLocalLinkRecord(input, location, targetPath);
}

function missingLocalTargetPath(input: LocalLinkOccurrence): string | undefined {
  const rawTarget = matchedLinkTarget(input.match);
  if (isIgnoredTarget(rawTarget)) return undefined;

  const targetReference = rawTarget.split("#")[0];
  if (targetReference === "") return undefined;
  const targetPath = resolveLocalTarget(input.repositoryRoot, input.filePath, targetReference);
  if (fs.existsSync(path.join(input.repositoryRoot, targetPath))) return undefined;
  return targetPath;
}

function matchedLinkTarget(match: RegExpMatchArray): string {
  const capturedTarget = match[1];
  return capturedTarget === undefined ? "" : capturedTarget.trim().replace(/^<|>$/g, "");
}

function missingLocalLinkRecord(
  input: LocalLinkOccurrence,
  location: Readonly<{ readonly column: number; readonly line: number }>,
  targetPath: string
): MissingLocalLinkDiagnostic {
  return Object.freeze({
    data: Object.freeze({
      kind: "missing-local-link",
      location: Object.freeze(location),
      occurrence: input.occurrence,
      sourcePath: input.sourcePath,
      targetPath
    }),
    id: `missing-local-link:${encodeURIComponent(input.sourcePath)}:${location.line}:${location.column}:${input.occurrence}`,
    presentation: `${input.sourcePath}:${location.line}:${location.column} missing local Markdown link target: ${targetPath}.`
  });
}

function markdownFilesForLinkValidation(
  repositoryRoot: string,
  roots: readonly string[]
): readonly string[] {
  const markdownFiles: string[] = [];
  for (const relativeRoot of roots) {
    if (!isCanonicalRepositoryRelativePath(relativeRoot)) {
      throw new Error("markdown link validation root is unsafe");
    }
    const absoluteRoot = path.resolve(repositoryRoot, relativeRoot);
    if (!isWithinRepository(repositoryRoot, absoluteRoot)) {
      throw new Error("markdown link validation root escapes the repository");
    }
    if (!fs.existsSync(absoluteRoot)) {
      throw new Error(`markdown link validation root is missing: ${relativeRoot}`);
    }

    const stat = fs.statSync(absoluteRoot);
    if (stat.isDirectory()) {
      markdownFiles.push(
        ...walkDocumentationFiles(absoluteRoot, (filePath) =>
          filePath.endsWith(FILE_SYSTEM.markdownExtension)
        )
      );
      continue;
    }

    if (absoluteRoot.endsWith(FILE_SYSTEM.markdownExtension)) markdownFiles.push(absoluteRoot);
  }

  return [...new Set(markdownFiles)].sort((left, right) =>
    canonicalRepositoryRelativePath(repositoryRoot, left).localeCompare(
      canonicalRepositoryRelativePath(repositoryRoot, right)
    )
  );
}

function isIgnoredTarget(rawTarget: string): boolean {
  return rawTarget === "" || rawTarget.startsWith("#") || /^(https?|mailto):/iu.test(rawTarget);
}

function resolveLocalTarget(
  repositoryRoot: string,
  sourcePath: string,
  targetReference: string
): string {
  if (targetReference.includes("\\") || targetReference.includes(":")) {
    throw new Error("markdown link target is not a safe local repository path");
  }
  const absoluteTarget = path.resolve(path.dirname(sourcePath), targetReference);
  if (!isWithinRepository(repositoryRoot, absoluteTarget)) {
    throw new Error("markdown link target escapes the repository");
  }
  return canonicalRepositoryRelativePath(repositoryRoot, absoluteTarget);
}

function markdownLocation(
  source: string,
  offset: number
): Readonly<{ readonly column: number; readonly line: number }> {
  const before = source.slice(0, offset);
  const lastNewline = before.lastIndexOf("\n");
  return Object.freeze({
    column: codePointLength(before.slice(lastNewline + 1)) + 1,
    line: before.split("\n").length
  });
}

function compareDiagnostics(
  left: MissingLocalLinkDiagnostic,
  right: MissingLocalLinkDiagnostic
): number {
  const leftData = left.data;
  const rightData = right.data;
  return (
    leftData.sourcePath.localeCompare(rightData.sourcePath) ||
    leftData.location.line - rightData.location.line ||
    leftData.location.column - rightData.location.column ||
    leftData.occurrence - rightData.occurrence
  );
}

function codePointLength(value: string): number {
  let length = 0;
  for (const _character of value) length += 1;
  return length;
}

function canonicalRepositoryRelativePath(repositoryRoot: string, absolutePath: string): string;
function canonicalRepositoryRelativePath(relativePath: string): boolean;
function canonicalRepositoryRelativePath(
  repositoryRootOrRelativePath: string,
  absolutePath?: string
): string | boolean {
  if (absolutePath === undefined) {
    return (
      repositoryRootOrRelativePath !== "" &&
      !path.isAbsolute(repositoryRootOrRelativePath) &&
      !repositoryRootOrRelativePath.startsWith("../") &&
      !repositoryRootOrRelativePath.includes("\\") &&
      !repositoryRootOrRelativePath.includes("\0")
    );
  }
  const relativePath = path
    .relative(repositoryRootOrRelativePath, absolutePath)
    .replaceAll("\\", "/");
  if (!isCanonicalRepositoryRelativePath(relativePath)) {
    throw new Error("documentation path is not repository-relative");
  }
  return relativePath;
}

function isCanonicalRepositoryRelativePath(value: string): boolean {
  return canonicalRepositoryRelativePath(value) === true;
}

function isWithinRepository(repositoryRoot: string, absolutePath: string): boolean {
  const relativePath = path.relative(repositoryRoot, absolutePath);
  return relativePath !== "" && !relativePath.startsWith(`..${path.sep}`) && relativePath !== "..";
}
