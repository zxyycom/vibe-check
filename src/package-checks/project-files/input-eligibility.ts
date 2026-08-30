/** 一个 Check 对完整 selected path set 做 eligibility 分类后的结果。 */
export interface ProjectFileEligibilityPartition {
  readonly acceptedPaths: readonly string[];
  readonly rejectedPaths: readonly string[];
}

/** 保持输入顺序，将每个 selected path 恰好分配给 accepted 或 rejected。 */
export function partitionProjectFilesByEligibility(
  selectedPaths: readonly string[],
  accepts: (path: string) => boolean
): ProjectFileEligibilityPartition {
  const acceptedPaths: string[] = [];
  const rejectedPaths: string[] = [];
  for (const path of selectedPaths) {
    (accepts(path) ? acceptedPaths : rejectedPaths).push(path);
  }
  return Object.freeze({
    acceptedPaths: Object.freeze(acceptedPaths),
    rejectedPaths: Object.freeze(rejectedPaths)
  });
}
