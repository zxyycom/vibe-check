/**
 * Explicit baseline revision resolution 与 materialization。
 *
 * 调用方选择的 revision 在 scan work 前解析为 commit SHA；materialization
 * 只消费该 invocation-owned identity。
 */

import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { processFailed, runGit, runProcessSync } from "../../foundation/index.ts";
import { materializeRevisionGitlinks } from "./revision-materialization.ts";

type MaterializeBaselineResult =
  | { ok: true; workDir: string }
  | { error: string; ok: false; reason: string };

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

  const result = runGit({
    args: ["rev-parse", "--verify", "--quiet", "--end-of-options", `${revision}^{commit}`],
    cwd
  });
  if (result.error) {
    throw new Error(
      "failed to resolve comparison revision because Git could not run; verify Git and project root access",
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
      "comparison revision must resolve to a locally available commit; fetch it or provide another revision",
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

  const archiveResult = runGit({
    args: ["archive", "--format=tar", "--output", archivePath, commitSha],
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

  const untarResult = runProcessSync({
    args: ["-xf", archivePath, "-C", untarDir],
    command: "tar",
    cwd: baselineWorkDir
  });

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
