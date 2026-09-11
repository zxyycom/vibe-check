import type { SyncOptions } from "execa";

export const DEFAULT_PROCESS_MAX_BUFFER_BYTES = 64 * 1024 * 1024;

export interface ProcessFailure extends Error {
  code?: number | string | null;
  signal?: NodeJS.Signals | null;
  status?: number | null;
  stderr?: Buffer | string;
  stdout?: Buffer | string;
}

export type ProcessResult = {
  readonly error?: Error;
  readonly signal: NodeJS.Signals | null;
  readonly status: number | null;
  readonly stderr: string;
  readonly stdout: string;
  readonly timedOut?: true;
};

export type RunProcessSyncOptions = {
  readonly args: readonly string[];
  readonly command: string;
  readonly cwd?: string | URL;
  readonly encoding?: SyncOptions["encoding"];
  readonly env?: NodeJS.ProcessEnv;
  readonly maxBuffer?: number;
  readonly stdio?: SyncOptions["stdio"];
  readonly timeout?: number;
  readonly windowsHide?: boolean;
};

export type RunProcessOptions = {
  readonly args?: readonly string[];
  readonly cancelSignal?: AbortSignal;
  readonly command: string;
  readonly cwd?: string | URL;
  readonly env?: NodeJS.ProcessEnv;
  readonly label?: string;
  readonly maxBuffer?: number;
  readonly timeout?: number;
  readonly windowsHide?: boolean;
};

export type ExecaResultLike = {
  /** Execa's imported result types permit explicitly present `undefined` values. */
  readonly code?: string | undefined;
  readonly exitCode?: number | undefined;
  readonly failed?: boolean | undefined;
  readonly isMaxBuffer?: boolean | undefined;
  readonly message?: string | undefined;
  readonly originalMessage?: string | undefined;
  readonly shortMessage?: string | undefined;
  readonly signal?: NodeJS.Signals | undefined;
  readonly stderr?: unknown;
  readonly stdout?: unknown;
  readonly timedOut?: boolean | undefined;
};
