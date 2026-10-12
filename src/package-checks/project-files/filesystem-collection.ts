/** Thin fast-glob filesystem policy: no-follow, necessary reads and Check-local sharing. */

import fs from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import type { FileSystemAdapter } from "fast-glob";
import micromatch from "micromatch";

import { CONFIG_GLOB_OPTIONS, matchesConfigPatterns } from "../../data-boundary/config-glob.ts";
import { errorMessage } from "../host-environment/error-message.ts";
import { DEFAULT_PROJECT_FILE_EXCLUDES } from "./configuration.ts";
import type { ProjectFileSelection } from "./configuration.ts";

type SubtreePruner = (path: string) => boolean;
interface CollectionEntry extends fs.Dirent {
  readonly mayBeDirectory: boolean;
  getStats(): fs.Stats;
  assertFaithfulName(): void;
}

interface CollectionDirectory {
  readonly entries: CollectionEntry[];
  readonly entriesByName: ReadonlyMap<string, readonly CollectionEntry[]>;
}

/** Acquisition is a superset; only the common native list matcher decides membership. */
export function collectionCandidatePatterns(selections: readonly ProjectFileSelection[]): string[] {
  const patterns = selections.flatMap((selection) => {
    const nonempty = selection.patterns.filter((pattern) => pattern !== "");
    if (nonempty.length === 0) return [];
    const positives = nonempty.filter((pattern) => !isListNegative(pattern));
    // Native negative-only lists and leading negative extglobs may select a complement.
    if (
      positives.length === 0 ||
      nonempty.some(
        (pattern) =>
          micromatch.scan(pattern, CONFIG_GLOB_OPTIONS).negatedExtglob || pattern.startsWith("!!")
      )
    )
      return ["**/*"];
    return positives;
  });
  return [...new Set(patterns)];
}

export function createCollectionFilesystem(
  root: string,
  selections: readonly ProjectFileSelection[]
): Partial<FileSystemAdapter> {
  const access = new CollectionDirectoryAccess(root, createSubtreePruner(selections), selections);
  function readdirSync(path: string, options: { withFileTypes: true }): fs.Dirent[];
  function readdirSync(path: string): string[];
  function readdirSync(path: string, options?: { withFileTypes: true }): fs.Dirent[] | string[] {
    const entries = access.readTarget(resolve(path));
    return options?.withFileTypes === true ? entries : entries.map((entry) => entry.name);
  }
  return {
    readdirSync,
    lstatSync: (path: string) => {
      const absolute = resolve(path);
      const relativePath = slashRelative(root, absolute);
      // Static patterns otherwise stat before library filtering, including excluded bases.
      const entry = selections.some((selection) => selectedPath(relativePath, selection))
        ? access.targetEntry(absolute)
        : undefined;
      if (entry === undefined) {
        throw Object.assign(new Error(`project path skipped by collection policy: ${absolute}`), {
          code: "ENOENT"
        });
      }
      return entry.getStats();
    }
  };
}

/** One operation owns its observed directory membership; no cache survives collection. */
class CollectionDirectoryAccess {
  private readonly directories = new Map<string, CollectionDirectory>();
  private readonly root: string;
  private readonly noDemand: SubtreePruner;
  private readonly selections: readonly ProjectFileSelection[];

  constructor(root: string, noDemand: SubtreePruner, selections: readonly ProjectFileSelection[]) {
    this.root = root;
    this.noDemand = noDemand;
    this.selections = selections;
    this.readDirectory(root); // Required even for empty patterns; symlink roots are rejected.
  }

  readTarget(absolute: string): fs.Dirent[] {
    if (absolute === this.root) return this.readDirectory(this.root).entries;
    const entry = this.targetEntry(absolute, true);
    if (entry?.isDirectory() !== true) return [];
    entry.assertFaithfulName();
    return this.readDirectory(absolute).entries;
  }

  targetEntry(absolute: string, readingDirectory = false): CollectionEntry | undefined {
    const path = this.demandedPath(absolute, readingDirectory);
    if (path === undefined) return undefined;
    const parts = path.split("/");
    let parent = this.root;
    for (const [index, part] of parts.entries()) {
      const entry = this.validatedDirectoryEntry(
        parent,
        part,
        readingDirectory || index < parts.length - 1
      );
      if (entry === undefined) return undefined; // Missing before inspection is a legal no-match.
      if (index === parts.length - 1) return entry;
      if (!entry.isDirectory()) return undefined; // Also rejects stable directory symlinks.
      entry.assertFaithfulName();
      parent = join(parent, part);
    }
    return undefined;
  }

  private validatedDirectoryEntry(
    parent: string,
    name: string,
    requireDirectoryIdentity: boolean
  ): CollectionEntry | undefined {
    const matching = this.readDirectory(parent).entriesByName.get(name) ?? [];
    // Detect selected lossy files before a valid U+FFFD spelling can hide the collision.
    for (const candidate of matching) {
      candidate.isFile();
      if (requireDirectoryIdentity && candidate.isDirectory()) candidate.assertFaithfulName();
    }
    return matching.find((candidate) => !candidate.isSymbolicLink());
  }

  private demandedPath(absolute: string, readingDirectory: boolean): string | undefined {
    const path = slashRelative(this.root, absolute);
    if (path === "" || isAbsolute(path) || path === ".." || path.startsWith("../"))
      return undefined;
    if (
      this.noDemand(path) &&
      (readingDirectory || !this.selections.some((selection) => selectedPath(path, selection)))
    )
      return undefined;
    return path;
  }

  private retainEntry(parent: string, entry: CollectionEntry): boolean {
    if (!entry.mayBeDirectory) return true;
    const path = slashRelative(this.root, join(parent, entry.name));
    if (!this.noDemand(path)) return true;
    // A subtree exclusion can still select an ordinary file with that base spelling.
    return (
      this.selections.some((selection) => selectedPath(path, selection)) && !entry.isDirectory()
    );
  }

  private readDirectory(path: string): CollectionDirectory {
    const cached = this.directories.get(path);
    if (cached !== undefined) return cached;
    const stats = path === this.root ? inspectPath(path) : this.targetEntry(path, true)?.getStats();
    if (stats?.isDirectory() !== true)
      throw new Error(`project directory is not a real directory: ${path}`);
    let entries: CollectionEntry[];
    try {
      // Bun 1.3.14 returns bare byte names for this overload, not byte Dirents.
      entries = fs
        .readdirSync(path, { withFileTypes: true, encoding: "buffer" })
        .map((entry) =>
          entry instanceof Uint8Array
            ? createCollectionEntry(this.root, path, Buffer.from(entry), this.selections)
            : createCollectionEntry(this.root, path, entry.name, this.selections, entry)
        );
    } catch (cause: unknown) {
      throw new Error(`could not read project directory ${path}: ${errorMessage(cause)}`, {
        cause
      });
    }
    entries = entries.filter((entry) => this.retainEntry(path, entry));
    const entriesByName = new Map<string, CollectionEntry[]>();
    for (const entry of entries) {
      const matching = entriesByName.get(entry.name);
      // Different raw byte names can decode to the same spelling; retain every entry in order.
      if (matching === undefined) entriesByName.set(entry.name, [entry]);
      else matching.push(entry);
    }
    const directory = { entries, entriesByName };
    this.directories.set(path, directory);
    return directory;
  }
}

/** Preserve byte identity while presenting only the Dirent interface needed by fast-glob. */
function createCollectionEntry(
  root: string,
  parent: string,
  nameBytes: Buffer,
  selections: readonly ProjectFileSelection[],
  knownType?: fs.Dirent<Buffer>
): CollectionEntry {
  const name = nameBytes.toString("utf8");
  const faithful = Buffer.from(name, "utf8").equals(nameBytes);
  const path = join(parent, name);
  const physicalPath = faithful ? path : Buffer.concat([Buffer.from(`${parent}${sep}`), nameBytes]);
  let stats: fs.Stats | undefined;
  function assertFaithfulName(): void {
    if (!faithful)
      throw new Error(
        `could not faithfully represent project entry at ${parent}: name bytes ${nameBytes.toString("hex")}`
      );
  }
  function isFile(): boolean {
    return faithful && (knownType ?? getStats()).isFile();
  }
  function getStats(): fs.Stats {
    stats ??= inspectPath(physicalPath);
    return stats;
  }
  // Validate selected lossy files before fast-glob's duplicate-path filter can hide one.
  if (
    !faithful &&
    selections.some((selection) => selectedPath(slashRelative(root, path), selection)) &&
    (knownType ?? getStats()).isFile()
  )
    assertFaithfulName();
  return {
    name,
    parentPath: parent,
    mayBeDirectory: knownType === undefined || knownType.isDirectory(),
    getStats,
    assertFaithfulName,
    isFile,
    isDirectory: () => (knownType ?? getStats()).isDirectory(),
    isSymbolicLink: () => (knownType ?? getStats()).isSymbolicLink(),
    isBlockDevice: () => (knownType ?? getStats()).isBlockDevice(),
    isCharacterDevice: () => (knownType ?? getStats()).isCharacterDevice(),
    isFIFO: () => (knownType ?? getStats()).isFIFO(),
    isSocket: () => (knownType ?? getStats()).isSocket()
  };
}

function createSubtreePruner(selections: readonly ProjectFileSelection[]): SubtreePruner {
  const policies = selections.map((selection) => ({
    isEmpty: selection.patterns.every((pattern) => pattern === ""),
    // These are proven positive subtree predicates, not a second selection language.
    excludes: subtreeExclusions(selection).map((pattern) =>
      micromatch.matcher(pattern, CONFIG_GLOB_OPTIONS)
    )
  }));
  return (path) =>
    path !== "" &&
    policies.every(
      ({ isEmpty, excludes }) =>
        isEmpty ||
        path.split("/").some((_, index, parts) => {
          const prefix = parts.slice(0, index + 1).join("/");
          return excludes.some((matches) => matches(prefix));
        })
    );
}

function subtreeExclusions(selection: ProjectFileSelection): readonly string[] {
  let lastPositive = -1;
  for (const [index, pattern] of selection.patterns.entries()) {
    if (!isListNegative(pattern)) lastPositive = index;
  }
  const trailingNegatives = selection.patterns
    .slice(lastPositive + 1)
    .filter(isListNegative)
    .map((pattern) => pattern.slice(1));
  return [
    ...(selection.useDefaultExcludes === false ? [] : DEFAULT_PROJECT_FILE_EXCLUDES),
    ...trailingNegatives
  ]
    .filter((pattern) => pattern.endsWith("/**"))
    .map((pattern) => pattern.slice(0, -3));
}

function inspectPath(path: string | Buffer): fs.Stats {
  try {
    return fs.lstatSync(path);
  } catch (cause: unknown) {
    // Plain Error prevents fast-glob from swallowing a real required ENOENT.
    const target = typeof path === "string" ? path : `bytes ${path.toString("hex")}`;
    throw new Error(`could not inspect project path ${target}: ${errorMessage(cause)}`, { cause });
  }
}

function selectedPath(path: string, selection: ProjectFileSelection): boolean {
  return (
    matchesConfigPatterns(path, selection.patterns) &&
    (selection.useDefaultExcludes === false ||
      !matchesConfigPatterns(path, DEFAULT_PROJECT_FILE_EXCLUDES))
  );
}

function isListNegative(pattern: string): boolean {
  return pattern.startsWith("!") && !pattern.startsWith("!(") && !pattern.startsWith("!!");
}

function slashRelative(root: string, path: string): string {
  return relative(root, path).split(sep).join("/");
}
