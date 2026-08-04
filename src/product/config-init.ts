import {
  closeSync,
  lstatSync,
  mkdirSync,
  openSync,
  rmdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
  type Stats
} from "node:fs";

import { createConfigInitCandidates } from "./config-init-candidates.ts";
import { resolveProjectConfigPaths } from "./config-paths.ts";
import { errorMessage } from "./foundation/src/errors.ts";

export {
  createConfigInitCandidates,
  type ConfigInitCandidates
} from "./config-init-candidates.ts";

export interface ConfigInitResult {
  readonly configPath: string;
  readonly schemaPath: string;
  readonly state: "discovery-ready";
}

/** Narrow initialization filesystem seam for deterministic boundary tests. */
export interface ConfigInitFileOps {
  readonly close: (fileDescriptor: number) => void;
  readonly lstat: (path: string) => Stats;
  readonly makeDirectory: (path: string) => void;
  readonly openExclusive: (path: string) => number;
  readonly removeDirectory: (path: string) => void;
  readonly removeFile: (path: string) => void;
  readonly stat: (path: string) => Stats;
  readonly write: (fileDescriptor: number, bytes: Uint8Array) => void;
}

type ConfigInitStage =
  | "candidate validation"
  | "config creation"
  | "project-root validation"
  | "schema creation"
  | "tool-directory preparation";

export class ProjectConfigInitError extends Error {
  readonly projectRoot: string;
  readonly stage: ConfigInitStage;
  readonly targetPath: string;

  constructor(options: {
    readonly cause: unknown;
    readonly cleanupErrors: readonly unknown[];
    readonly projectRoot: string;
    readonly stage: ConfigInitStage;
    readonly targetPath: string;
  }) {
    const cleanup = options.cleanupErrors.length === 0
      ? ""
      : ` Cleanup also reported: ${options.cleanupErrors.map(errorMessage).join("; ")}.`;
    super(
      `failed to initialize project config during ${options.stage} at ` +
        `"${options.targetPath}" for project root "${options.projectRoot}": ` +
        `${errorMessage(options.cause)}.${cleanup} Existing entries are not overwritten; ` +
        "resolve the path or permissions, inspect any invocation-created partial entries, and retry initialization.",
      { cause: options.cause }
    );
    this.name = "ProjectConfigInitError";
    this.projectRoot = options.projectRoot;
    this.stage = options.stage;
    this.targetPath = options.targetPath;
  }
}

const NODE_CONFIG_INIT_FILE_OPS: ConfigInitFileOps = {
  close: (fileDescriptor) => closeSync(fileDescriptor),
  lstat: (path) => lstatSync(path),
  makeDirectory: (path) => mkdirSync(path),
  openExclusive: (path) => openSync(path, "wx"),
  removeDirectory: (path) => rmdirSync(path),
  removeFile: (path) => unlinkSync(path),
  stat: (path) => statSync(path),
  write: (fileDescriptor, bytes) => writeFileSync(fileDescriptor, bytes)
};

export function initializeProjectConfig(
  projectRoot: string,
  fileOps: Partial<ConfigInitFileOps> = {}
): ConfigInitResult {
  const paths = resolveProjectConfigPaths(projectRoot);
  const ops: ConfigInitFileOps = {
    ...NODE_CONFIG_INIT_FILE_OPS,
    ...fileOps
  };
  const ownedFiles: string[] = [];
  const cleanupErrors: unknown[] = [];
  let directoryOwned = false;
  let stage: ConfigInitStage = "candidate validation";
  let targetPath = paths.projectRoot;

  try {
    const candidates = createConfigInitCandidates();

    stage = "project-root validation";
    const projectStats = ops.stat(paths.projectRoot);
    if (!projectStats.isDirectory()) {
      throw new Error("project root is not an existing directory");
    }

    stage = "tool-directory preparation";
    targetPath = paths.directoryPath;
    const directoryStats = lstatOptional(paths.directoryPath, ops);
    if (directoryStats === undefined) {
      ops.makeDirectory(paths.directoryPath);
      directoryOwned = true;
    } else if (
      directoryStats.isSymbolicLink() ||
      !directoryStats.isDirectory()
    ) {
      throw new Error(
        "tool path must be a normal, non-symlink directory when it already exists"
      );
    }

    stage = "config creation";
    targetPath = paths.configPath;
    createMissingTarget(
      paths.configPath,
      candidates.configBytes,
      ops,
      ownedFiles,
      cleanupErrors
    );

    stage = "schema creation";
    targetPath = paths.schemaPath;
    createMissingTarget(
      paths.schemaPath,
      candidates.schemaBytes,
      ops,
      ownedFiles,
      cleanupErrors
    );

    return {
      configPath: paths.configPath,
      schemaPath: paths.schemaPath,
      state: "discovery-ready"
    };
  } catch (cause: unknown) {
    cleanupOwnedEntries(
      paths.directoryPath,
      ownedFiles,
      directoryOwned,
      ops,
      cleanupErrors
    );
    throw new ProjectConfigInitError({
      cause,
      cleanupErrors,
      projectRoot: paths.projectRoot,
      stage,
      targetPath
    });
  }
}

function lstatOptional(
  path: string,
  ops: ConfigInitFileOps
): Stats | undefined {
  try {
    return ops.lstat(path);
  } catch (error: unknown) {
    if (isErrno(error, "ENOENT")) return undefined;
    throw error;
  }
}

function createOwnedFile(
  path: string,
  bytes: Uint8Array,
  ops: ConfigInitFileOps,
  ownedFiles: string[],
  cleanupErrors: unknown[]
): void {
  const fileDescriptor = ops.openExclusive(path);
  ownedFiles.push(path);

  let failed = false;
  let failure: unknown;
  try {
    ops.write(fileDescriptor, bytes);
  } catch (error: unknown) {
    failed = true;
    failure = error;
  }
  try {
    ops.close(fileDescriptor);
  } catch (error: unknown) {
    if (!failed) {
      failed = true;
      failure = error;
    }
    else cleanupErrors.push(error);
  }
  if (failed) throw failure;
}

function createMissingTarget(
  path: string,
  bytes: Uint8Array,
  ops: ConfigInitFileOps,
  ownedFiles: string[],
  cleanupErrors: unknown[]
): void {
  const existing = lstatOptional(path, ops);
  if (existing === undefined) {
    createOwnedFile(path, bytes, ops, ownedFiles, cleanupErrors);
    return;
  }
  if (existing.isSymbolicLink() || !existing.isFile()) {
    throw new Error(
      "target path must be a normal, non-symlink file when it already exists"
    );
  }
}

function cleanupOwnedEntries(
  directoryPath: string,
  ownedFiles: readonly string[],
  directoryOwned: boolean,
  ops: ConfigInitFileOps,
  cleanupErrors: unknown[]
): void {
  for (const path of [...ownedFiles].reverse()) {
    try {
      ops.removeFile(path);
    } catch (error: unknown) {
      cleanupErrors.push(error);
    }
  }
  if (!directoryOwned) return;
  try {
    ops.removeDirectory(directoryPath);
  } catch (error: unknown) {
    cleanupErrors.push(error);
  }
}

function isErrno(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}
