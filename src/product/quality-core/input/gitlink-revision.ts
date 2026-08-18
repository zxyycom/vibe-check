/** Reads canonical gitlink entries from a named Git tree revision. */

import { processFailed, runGit, toSlashPath } from "../../foundation/index.ts";

export type Gitlink = Readonly<{
  readonly path: string;
  readonly sha: string;
}>;

export function gitlinksAtRevision({
  repository,
  revision
}: Readonly<{
  readonly repository: string;
  readonly revision: string;
}>): readonly Gitlink[] | null {
  const result = runGit({
    args: ["ls-tree", "-r", "-z", revision],
    cwd: repository
  });
  if (processFailed(result)) return null;

  const gitlinks: Gitlink[] = [];
  for (const entry of result.stdout.split("\0")) {
    if (!entry) continue;
    const separator = entry.indexOf("\t");
    if (separator < 0) continue;
    const [mode, type, sha] = entry.slice(0, separator).split(/\s+/u);
    if (mode !== "160000" || type !== "commit" || !sha) continue;
    gitlinks.push({ path: toSlashPath(entry.slice(separator + 1)), sha });
  }
  return Object.freeze(gitlinks);
}
