import { execa, execaSync } from "execa";

import { plainTextProcessEnv } from "./env.ts";
import { toProcessResult } from "./result.ts";
import {
  DEFAULT_PROCESS_MAX_BUFFER_BYTES,
  type ProcessResult,
  type RunProcessOptions,
  type RunProcessSyncOptions
} from "./process-contract.ts";

export function runProcessSync(options: RunProcessSyncOptions): ProcessResult {
  const { args, command, ...processOptions } = options;
  const result = execaSync(command, args, {
    ...processOptions,
    encoding: processOptions.encoding ?? "utf8",
    env: plainTextProcessEnv({ env: processOptions.env }),
    maxBuffer: processOptions.maxBuffer ?? DEFAULT_PROCESS_MAX_BUFFER_BYTES,
    reject: false,
    stripFinalNewline: false,
    windowsHide: processOptions.windowsHide ?? true
  });
  return toProcessResult(result, command);
}

export function runProcess(options: RunProcessOptions): Promise<ProcessResult> {
  const {
    args = [],
    command,
    cwd,
    env,
    label = command,
    maxBuffer = DEFAULT_PROCESS_MAX_BUFFER_BYTES,
    timeout,
    windowsHide = true
  } = options;

  return execa(command, args, {
    cwd,
    env: plainTextProcessEnv({ env }),
    maxBuffer,
    reject: false,
    stripFinalNewline: false,
    timeout,
    windowsHide
  }).then((result) => toProcessResult(result, label));
}
