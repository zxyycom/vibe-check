import { DEFAULT_PROCESS_MAX_BUFFER_BYTES } from "../../host-environment/process.ts";

export const SCC_LOGICAL_SCAN_TIMEOUT_MS = 300_000;
const NANOSECONDS_PER_MILLISECOND = 1_000_000n;

export interface SccLogicalScanResources {
  readonly deadlineNanoseconds: bigint;
  stderrRemainingBytes: number;
  stdoutRemainingBytes: number;
}

/** 为一次 logical SCC scan 建立共享 deadline 与 stdout/stderr 预算。 */
export function beginSccLogicalScanResources(
  startedNanoseconds: bigint,
  timeoutMilliseconds = SCC_LOGICAL_SCAN_TIMEOUT_MS,
  outputBudgetBytes = DEFAULT_PROCESS_MAX_BUFFER_BYTES
): SccLogicalScanResources {
  return {
    deadlineNanoseconds:
      startedNanoseconds + BigInt(timeoutMilliseconds) * NANOSECONDS_PER_MILLISECOND,
    stderrRemainingBytes: outputBudgetBytes,
    stdoutRemainingBytes: outputBudgetBytes
  };
}

/** 计算下一个 batch 可使用的完整毫秒数；deadline 到期时不再启动 process。 */
export function remainingSccBatchTimeoutMs(
  resources: SccLogicalScanResources,
  nowNanoseconds: bigint
): number | null {
  const remainingNanoseconds = resources.deadlineNanoseconds - nowNanoseconds;
  const remainingMilliseconds = Number(remainingNanoseconds / NANOSECONDS_PER_MILLISECOND);
  return remainingMilliseconds > 0 ? remainingMilliseconds : null;
}

/** 以两个 stream 中较小的余量限制本次 process 的 maxBuffer。 */
export function remainingSccBatchMaxBuffer(resources: SccLogicalScanResources): number | null {
  const remainingBytes = Math.min(resources.stdoutRemainingBytes, resources.stderrRemainingBytes);
  return remainingBytes > 0 ? remainingBytes : null;
}

/** 记录一次 process 的 UTF-8 output；任一 stream 超出完整 logical-scan 预算即失败。 */
export function consumeSccProcessOutput(
  resources: SccLogicalScanResources,
  stdout: string,
  stderr: string
): boolean {
  const stdoutBytes = Buffer.byteLength(stdout, "utf8");
  const stderrBytes = Buffer.byteLength(stderr, "utf8");
  if (
    stdoutBytes > resources.stdoutRemainingBytes ||
    stderrBytes > resources.stderrRemainingBytes
  ) {
    return false;
  }
  resources.stdoutRemainingBytes -= stdoutBytes;
  resources.stderrRemainingBytes -= stderrBytes;
  return true;
}
