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
  const fixedCodeUnits = estimateSccCommandLineCodeUnits([executable, ...fixedArguments]);
  let currentBatch: string[] = [];
  let currentCodeUnits = fixedCodeUnits;

  for (const includePath of includePaths) {
    const pathCodeUnits = 2 * includePath.length + 3;
    if (fixedCodeUnits + pathCodeUnits > ceiling) {
      return {
        ok: false,
        error: `scc exact path cannot fit command-line ceiling ${ceiling}: ${JSON.stringify(includePath)}`
      };
    }

    if (currentBatch.length > 0 && currentCodeUnits + pathCodeUnits > ceiling) {
      batches.push(currentBatch);
      currentBatch = [];
      currentCodeUnits = fixedCodeUnits;
    }
    currentBatch.push(includePath);
    currentCodeUnits += pathCodeUnits;
  }

  if (currentBatch.length > 0) batches.push(currentBatch);
  return { ok: true, batches };
}
