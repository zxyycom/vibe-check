/** Check-local shared acquisition and independent selection of ordinary disk files. */

import { resolve } from "node:path";
import fastGlob from "fast-glob";

import { selectConfigPaths } from "../../data-boundary/config-glob.ts";
import { isNormalizedProjectRelativePath } from "../../data-boundary/project-path.ts";
import {
  createCollectionFilesystem,
  collectionCandidatePatterns
} from "./filesystem-collection.ts";
import type { ProjectFileSelection } from "./configuration.ts";
import { DEFAULT_PROJECT_FILE_EXCLUDES } from "./configuration.ts";

export function collectProjectFileSets(
  rootDir: string,
  selections: Readonly<Record<string, ProjectFileSelection>>
): ReadonlyMap<string, readonly string[]> {
  const root = resolve(rootDir);
  const entries = Object.entries(selections).sort(([left], [right]) => compareText(left, right));
  const policies = entries.map(([, selection]) => selection);
  const filesystem = createCollectionFilesystem(root, policies);
  const patterns = collectionCandidatePatterns(policies);
  const candidates =
    patterns.length === 0
      ? []
      : fastGlob
          .sync(patterns, {
            cwd: root,
            dot: true,
            baseNameMatch: false,
            braceExpansion: true,
            caseSensitiveMatch: true,
            extglob: true,
            globstar: true,
            onlyFiles: true,
            followSymbolicLinks: false,
            suppressErrors: false,
            fs: filesystem
          })
          // Normalize the backend prefix only; real filename characters retain their identity.
          .map((path) => path.replace(/^(?:\.\/)+/u, ""));
  const selected = new Map<string, readonly string[]>();
  for (const [id, selection] of entries) {
    let paths = selectConfigPaths(candidates, selection.patterns);
    if (selection.useDefaultExcludes !== false) {
      const excluded = new Set(selectConfigPaths(paths, DEFAULT_PROJECT_FILE_EXCLUDES));
      paths = paths.filter((path) => !excluded.has(path));
    }
    selected.set(id, freezeProjectPaths(root, paths));
  }
  return selected;
}

export function collectProjectFiles(
  rootDir: string,
  selection: ProjectFileSelection
): readonly string[] {
  return requireProjectFileSet(collectProjectFileSets(rootDir, { selection }), "selection");
}

/** 缺少命名结果表示完整性失效，不是成功空集合。 */
export function requireProjectFileSet(
  fileSets: ReadonlyMap<string, readonly string[]>,
  selectionId: string
): readonly string[] {
  const files = fileSets.get(selectionId);
  if (files === undefined)
    throw new Error(`project file collection did not produce selection ${selectionId}`);
  return files;
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function freezeProjectPaths(root: string, paths: readonly string[]): readonly string[] {
  for (const path of paths) {
    if (!isNormalizedProjectRelativePath(path))
      throw new Error(
        `could not represent selected project path as a normalized relative path: ${resolve(root, path)}`
      );
  }
  return Object.freeze([...new Set(paths)].sort(compareText));
}
