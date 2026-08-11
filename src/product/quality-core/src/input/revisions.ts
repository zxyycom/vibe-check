/**
 * Explicit baseline revision resolution 与 materialization。
 *
 * 调用方选择的 revision 在 scan work 前解析为 commit SHA；materialization
 * 只消费该 invocation-owned identity。
 */

import { mkdirSync } from "node:fs";
import { join } from "node:path";

import {
  processFailed,
  runGit,
  runProcessSync,
  toSlashPath
} from "../../../foundation/src/index.ts";
import {
  collectRevisionChanges,
  collectWorkingTreeChanges,
  uniqueSortedPaths
} from "./revision-tree.ts";
import { materializeRevisionGitlinks } from "./revision-materialization.ts";
import { matchesAnyConfigGlob } from "../model/config-glob.ts";

type MaterializeBaselineResult =
  | { ok: true; workDir: string }
  | { error: string; ok: false; reason: string };

type ChangeScope = {
  changed: boolean;
  changedFiles: string[];
};

export type BaselineCommitResolution =
  | { commitSha: string; ok: true }
  | { error: string; ok: false };

export function resolveBaselineCommitSha({
  cwd,
  revision
}: {
  cwd: string;
  revision: string;
}): BaselineCommitResolution {
  if (revision.length === 0) {
    return unavailableBaselineRevision();
  }

  const result = runGit([
    "rev-parse",
    "--verify",
    "--quiet",
    "--end-of-options",
    `${revision}^{commit}`
  ], { cwd });
  if (result.error) {
    throw new Error(
      "failed to resolve --baseline revision because Git could not run; verify Git and project root access",
      { cause: result.error }
    );
  }
  if (result.status !== 0) {
    return unavailableBaselineRevision();
  }

  const commitSha = result.stdout.trim();
  if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u.test(commitSha)) {
    return unavailableBaselineRevision();
  }
  return { commitSha, ok: true };
}

function unavailableBaselineRevision(): BaselineCommitResolution {
  return {
    error:
      "--baseline must resolve to a locally available commit; fetch the intended revision or provide another revision",
    ok: false
  };
}

/**
 * 在隔离目录中生成 baseline snapshot。
 *
 * 通过 git archive 导出文件；导出的目录不是 git repo。
 */
export function materializeBaselineRevision({
  commitSha,
  cwd,
  baselineWorkDir
}: {
  baselineWorkDir: string;
  commitSha: string;
  cwd: string;
}): MaterializeBaselineResult {
  mkdirSync(baselineWorkDir, { recursive: true });

  const archivePath = join(baselineWorkDir, "baseline.tar");

  const archiveResult = runGit([
    "archive",
    "--format=tar",
    "--output", archivePath,
    commitSha
  ], {
    cwd
  });

  if (processFailed(archiveResult)) {
    return {
      ok: false,
      error: `git archive failed: ${archiveResult.error?.message || archiveResult.stderr || "exit " + archiveResult.status}`,
      reason: "baseline-materialization-failed"
    };
  }

  const untarDir = join(baselineWorkDir, "repo");
  mkdirSync(untarDir, { recursive: true });

  const untarResult = runProcessSync("tar", ["-xf", archivePath, "-C", untarDir], { cwd: baselineWorkDir });

  if (processFailed(untarResult)) {
    return {
      ok: false,
      error: `tar extract failed: ${untarResult.error?.message || untarResult.stderr || "exit " + untarResult.status}`,
      reason: "baseline-materialization-failed"
    };
  }

  const submoduleError = materializeRevisionGitlinks({
    archiveDir: baselineWorkDir,
    archiveIndex: { value: 0 },
    repository: cwd,
    revision: commitSha,
    targetDir: untarDir
  });
  if (submoduleError) {
    return {
      ok: false,
      error: submoduleError,
      reason: "baseline-materialization-failed"
    };
  }

  return { ok: true, workDir: untarDir };
}

export function detectScanInputChange({
  baselineSha,
  cwd,
  scanInputPaths
}: {
  baselineSha: string | null;
  cwd: string;
  scanInputPaths: string[];
}): ChangeScope {
  if (!baselineSha) {
    return { changed: true, changedFiles: [] };
  }

  const changedFiles = [
    ...getRevisionChangedFiles(cwd, baselineSha, "HEAD", scanInputPaths),
    ...getWorkingTreeChangedFiles(cwd, scanInputPaths)
  ].map(toSlashPath);
  const uniqueChangedFiles = uniqueSortedPaths(changedFiles);
  const scanInputChanged = changedFiles.some((filePath) =>
    matchesAnyConfigGlob(filePath, scanInputPaths)
  );

  return { changed: scanInputChanged, changedFiles: uniqueChangedFiles };
}

// ── Helpers ───────────────────────────────────────────────────────────

export function getWorkingTreeChangedFiles(cwd: string, scanInputPaths: string[]): string[] {
  return uniqueSortedPaths(collectWorkingTreeChanges({
    prefix: "",
    repository: cwd,
    revision: "HEAD",
    scanInputPaths
  }));
}

export function getRevisionChangedFiles(
  cwd: string,
  fromRevision: string,
  toRevision: string,
  scanInputPaths: string[] | readonly string[]
): string[] {
  return uniqueSortedPaths(collectRevisionChanges({
    fromRevision,
    prefix: "",
    repository: cwd,
    scanInputPaths,
    toRevision
  }));
}
