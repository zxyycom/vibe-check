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
  /** Complete numeric exit and capture, independent of the selected default terminal cause. */
  readonly isComplete: boolean;
  readonly isCanceled?: true;
  readonly isMaxBuffer?: true;
  readonly signal: NodeJS.Signals | null;
  readonly status: number | null;
  readonly stderr: string;
  readonly timedOut?: true;
  readonly stdout: string;
};

// Product consumers capture text; Execa 10 correlates stdio transforms with the encoding branch.
type TextSyncOptions = Extract<SyncOptions, { readonly encoding?: "utf8" | "utf16le" | undefined }>;

export type RunProcessSyncOptions = {
  readonly args: readonly string[];
  readonly command: string;
  readonly cwd?: string | URL;
  readonly encoding?: TextSyncOptions["encoding"];
  readonly env?: NodeJS.ProcessEnv;
  readonly maxBuffer?: number;
  readonly stdio?: TextSyncOptions["stdio"];
  readonly timeout?: number;
  readonly windowsHide?: boolean;
};

export type RunProcessOptions = {
  readonly args?: readonly string[];
  readonly cancelSignal?: AbortSignal;
  readonly command: string;
  readonly cwd?: string | URL;
  /** `false` uses only the supplied `env`; omission preserves Execa's inherited default. */
  readonly extendEnv?: boolean;
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
  readonly isCanceled?: boolean | undefined;
  readonly isMaxBuffer?: boolean | undefined;
  readonly message?: string | undefined;
  readonly originalMessage?: string | undefined;
  readonly shortMessage?: string | undefined;
  readonly signal?: NodeJS.Signals | undefined;
  readonly stderr?: unknown;
  readonly stdout?: unknown;
  readonly timedOut?: boolean | undefined;
};
