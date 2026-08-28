/** Reads canonical gitlink entries from a named Git tree revision. */

import { processFailed } from "../host-environment/process/command.ts";
import { runGit } from "../host-environment/git.ts";
import { toSlashPath } from "../host-environment/path.ts";

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
}>): readonly Gitlink[] {
  const result = runGit({
    args: ["ls-tree", "-r", "-z", revision],
    cwd: repository
  });
  if (processFailed(result)) {
    const detail =
      result.stderr.trim() ||
      result.error?.message ||
      (result.signal === null ? `exit status ${result.status}` : `signal ${result.signal}`);
    throw new Error(`could not inspect gitlinks at ${revision} in ${repository}: ${detail}`);
  }

  const gitlinks: Gitlink[] = [];
  for (const entry of result.stdout.split("\0")) {
    if (!entry) continue;
    const gitlink = parseGitlinkEntry({ entry, repository, revision });
    if (gitlink !== null) gitlinks.push(gitlink);
  }
  return Object.freeze(gitlinks);
}

function parseGitlinkEntry({
  entry,
  repository,
  revision
}: Readonly<{
  readonly entry: string;
  readonly repository: string;
  readonly revision: string;
}>): Gitlink | null {
  const separator = entry.indexOf("\t");
  const metadata = separator < 0 ? [] : entry.slice(0, separator).split(/\s+/u);
  const path = separator < 0 ? "" : entry.slice(separator + 1);
  if (metadata.length !== 3 || path.length === 0) {
    throw new Error(`invalid git tree output at ${revision} in ${repository}`);
  }
  const [mode, type, sha] = metadata;
  if (mode === undefined || type === undefined || sha === undefined || !isFullGitObjectId(sha)) {
    throw new Error(`invalid git tree output at ${revision} in ${repository}`);
  }
  if (mode !== "160000") return null;
  if (type !== "commit") {
    throw new Error(`invalid gitlink output at ${revision} in ${repository}`);
  }
  return Object.freeze({ path: toSlashPath(path), sha });
}

function isFullGitObjectId(value: string): boolean {
  return /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u.test(value);
}
