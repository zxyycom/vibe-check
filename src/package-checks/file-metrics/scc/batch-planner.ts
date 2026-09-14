const TERMINAL_NUL_CODE_UNITS = 1;

/** SCC adapter 的私有 Windows argv 传输上限；不属于 scanner options。 */
export const SCC_BATCH_COMMAND_LINE_CEILING = 28_000;

export type SccBatchPlan =
  | { readonly batches: readonly (readonly string[])[]; readonly ok: true }
  | { readonly error: string; readonly ok: false };

/**
 * 返回 Windows command-line serialization 的保守 UTF-16 code-unit 上界。
 *
 * 每个 argument 都按最多双倍转义并保留一对引号，arguments 之间保留一个分隔符，
 * 最后保留 CreateProcessW 所需的终止 NUL。
 */
export function estimateSccCommandLineCodeUnits(argumentsToEstimate: readonly string[]): number {
  return argumentsToEstimate.reduce(
    (total, argument, index) => total + (index === 0 ? 0 : 1) + 2 * argument.length + 2,
    TERMINAL_NUL_CODE_UNITS
  );
}

/** 将已批准的 exact paths 按固定 SCC protocol 稳定地切为可传输 batches。 */
export function planSccBatches(
  executable: string,
  fixedArguments: readonly string[],
  includePaths: readonly string[],
  ceiling = SCC_BATCH_COMMAND_LINE_CEILING
): SccBatchPlan {
  const batches: string[][] = [];
  let currentBatch: string[] = [];

  for (const includePath of includePaths) {
    const singlePathArguments = [executable, ...fixedArguments, includePath];
    if (estimateSccCommandLineCodeUnits(singlePathArguments) > ceiling) {
      return {
        ok: false,
        error: `scc exact path cannot fit command-line ceiling ${ceiling}: ${JSON.stringify(includePath)}`
      };
    }

    const candidateBatch = [...currentBatch, includePath];
    if (
      currentBatch.length > 0 &&
      estimateSccCommandLineCodeUnits([executable, ...fixedArguments, ...candidateBatch]) > ceiling
    ) {
      batches.push(currentBatch);
      currentBatch = [includePath];
      continue;
    }
    currentBatch = candidateBatch;
  }

  if (currentBatch.length > 0) batches.push(currentBatch);
  return { ok: true, batches };
}
