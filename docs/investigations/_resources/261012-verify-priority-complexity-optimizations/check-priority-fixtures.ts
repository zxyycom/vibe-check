/** One-off fixture builder. Only writes its newly created owned /tmp directory.
 * Real Git history lives solely in that fixture, never in the workspace repo.
 * Review revision: historical manifests retain their original builder identity.
 */
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import type { BenchmarkFixture } from "./benchmark-boundaries.ts";

const root = mkdtempSync("/tmp/vibe-check-k-fixtures-");
const gitEnv = { ...process.env };
for (const key of Object.keys(gitEnv)) {
  if (key.startsWith("GIT_")) delete gitEnv[key];
}
Object.assign(gitEnv, {
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_CONFIG_SYSTEM: "/dev/null",
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_TERMINAL_PROMPT: "0",
  LC_ALL: "C",
  GIT_AUTHOR_NAME: "Benchmark Fixture",
  GIT_AUTHOR_EMAIL: "fixture@example.invalid",
  GIT_COMMITTER_NAME: "Benchmark Fixture",
  GIT_COMMITTER_EMAIL: "fixture@example.invalid"
});

function sha(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function buildDirectoryFixture(size: number): BenchmarkFixture {
  const directory = `directory-${size}`;
  const absolute = join(root, directory);
  mkdirSync(absolute);
  const files = Array.from(
    { length: size },
    (_, index) => `f-${String(index).padStart(6, "0")}.ts`
  );
  for (const file of files) writeFileSync(join(absolute, file), "");
  return {
    workload: "directory",
    size,
    directory,
    fileCount: size,
    bytesPerFile: 0,
    fileListSha256: sha(JSON.stringify(files)),
    useDefaultExcludes: false,
    patterns: "all exact filenames"
  };
}

function buildAnchorFixture(size: number): BenchmarkFixture {
  const directory = `anchors-${size}`;
  const absolute = join(root, directory);
  mkdirSync(absolute);
  const suffix = (index: number): string => String(index).padStart(6, "0");
  const lastSlug = `heading-${suffix(size - 1)}`;
  const headings = Array.from({ length: size }, (_, index) => `# Heading ${suffix(index)}\n`).join(
    "\n"
  );
  const links = Array.from(
    { length: size },
    (_, index) => `[Link ${suffix(index)}](#${lastSlug})\n`
  ).join("\n");
  const text = `${headings}\n${links}`;
  writeFileSync(join(absolute, "a.md"), text);
  return {
    workload: "anchors",
    size,
    directory,
    sourceCount: 1,
    headings: size,
    occurrences: size,
    anchorKind: "same-document last valid slug",
    lastSlug,
    bytes: Buffer.byteLength(text),
    sourceSha256: sha(text),
    cache: "disabled",
    targetReadCount: 0,
    findings: 0
  };
}

/** All fixture commands use the same isolated configuration and bounded failure boundary. */
function fixtureGit(options: {
  readonly cwd: string;
  readonly args: readonly string[];
  readonly date?: string;
}): string {
  const result = spawnSync(
    "git",
    [
      "-c",
      "core.hooksPath=/dev/null",
      "-c",
      "commit.gpgsign=false",
      "-c",
      "core.autocrlf=false",
      ...options.args
    ],
    {
      cwd: options.cwd,
      encoding: "utf8",
      env: {
        ...gitEnv,
        ...(options.date === undefined
          ? {}
          : { GIT_AUTHOR_DATE: options.date, GIT_COMMITTER_DATE: options.date })
      },
      timeout: 10_000
    }
  );
  if (result.error !== undefined || result.status !== 0 || result.signal !== null) {
    const reason = result.error?.message ?? result.stderr;
    throw new Error(
      `Owned fixture Git failed in ${options.cwd}: ${JSON.stringify(options.args)}; status=${result.status}, signal=${result.signal}; ${reason}`
    );
  }
  return result.stdout.trim();
}

function buildReminderFixture(size: number): BenchmarkFixture {
  const directory = `reminders-${size}`;
  const absolute = join(root, directory);
  mkdirSync(absolute);
  fixtureGit({ cwd: absolute, args: ["init", "--initial-branch=main", "."] });
  let text = "root\n";
  let baseCommit = "";
  const commits: string[] = [];
  for (let index = 0; index <= size; index += 1) {
    if (index > 0) text += `line-${String(index).padStart(6, "0")}\n`;
    writeFileSync(join(absolute, "history.txt"), text);
    fixtureGit({ cwd: absolute, args: ["add", "--", "history.txt"] });
    fixtureGit({
      cwd: absolute,
      args: ["commit", "--quiet", "-m", `Fixture commit ${String(index).padStart(6, "0")}`],
      date: `${1_700_000_000 + index} +0000`
    });
    const commit = fixtureGit({ cwd: absolute, args: ["rev-parse", "HEAD"] });
    if (index === 0) baseCommit = commit;
    commits.push(commit);
  }
  const headCommit = commits.at(-1);
  if (baseCommit === "" || headCommit === undefined) {
    throw new Error(`Owned fixture ${directory} has no complete root/head commit identity`);
  }
  if (fixtureGit({ cwd: absolute, args: ["status", "--porcelain"] }) !== "") {
    throw new Error(`Fixture worktree not clean: ${absolute}`);
  }
  return {
    workload: "reminders",
    size,
    directory,
    firstParentHistoryCount: size + 1,
    reminderCount: size === 4 ? 1 : 8,
    baseCommit,
    headCommit,
    commits,
    changedLines: size,
    commitCount: size,
    sameBaseline: true,
    assessment: "clear",
    bytes: Buffer.byteLength(text),
    sourceSha256: sha(text),
    fixedIdentity: "Benchmark Fixture <fixture@example.invalid>",
    fixedRootDate: "1700000000 +0000",
    historyConstruction:
      "root plus each successor appends exactly one line to history.txt; no merges"
  };
}

const fixtures: BenchmarkFixture[] = [];
for (const size of [32, 512, 1024, 4096]) fixtures.push(buildDirectoryFixture(size));
for (const size of [16, 4096]) fixtures.push(buildAnchorFixture(size));
for (const size of [4, 32]) fixtures.push(buildReminderFixture(size));
const gitVersion = fixtureGit({ cwd: root, args: ["--version"] });
const manifest = {
  protocol: "check-priority-fixtures-v1",
  createdAt: new Date().toISOString(),
  root,
  gitVersion,
  gitIsolation:
    "inherited GIT_* removed; system/global config disabled; hooks /dev/null; gpg/autocrlf disabled; fixed fixture identity/dates",
  fixtures,
  cleanup:
    "Remove only this generated root once before/after evidence closes; preserve formal manifest and builder"
};
writeFileSync(join(root, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(JSON.stringify(manifest, null, 2));
