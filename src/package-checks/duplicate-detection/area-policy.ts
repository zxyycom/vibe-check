import type {
  DuplicateCodeFragment,
  DuplicateCodeLocation,
  DuplicateDetectionAreaInput
} from "./measurement-model.ts";
import { isValidDuplicateFragment } from "./records.ts";

type PathPolicy = Readonly<{
  codeArea: string;
  minimumLines: number;
  minimumTokens: number;
}>;

type AnnotatedFragment = Readonly<{
  fragment: DuplicateCodeFragment;
  requiredMinimumLines: number;
  requiredMinimumTokens: number;
}>;

/** Restores every matching code area and applies the strictest involved policy. */
export function applyDuplicateAreaPolicy(
  fragments: readonly DuplicateCodeFragment[],
  areas: readonly DuplicateDetectionAreaInput[]
): readonly DuplicateCodeFragment[] | undefined {
  const policiesByPath = buildPathPolicies(areas);
  const accepted: DuplicateCodeFragment[] = [];
  for (const fragment of fragments) {
    if (!isValidDuplicateFragment(fragment)) return undefined;
    const annotated = annotateFragment(fragment, policiesByPath);
    if (annotated === undefined) return undefined;
    if (
      annotated.fragment.lineCount >= annotated.requiredMinimumLines &&
      annotated.fragment.tokenCount >= annotated.requiredMinimumTokens
    ) {
      accepted.push(annotated.fragment);
    }
  }
  return Object.freeze(accepted);
}

function buildPathPolicies(
  areas: readonly DuplicateDetectionAreaInput[]
): ReadonlyMap<string, readonly PathPolicy[]> {
  const mutablePolicies = new Map<string, PathPolicy[]>();
  for (const area of areas) {
    for (const path of area.approvedExactPaths) {
      const policies = mutablePolicies.get(path) ?? [];
      policies.push(
        Object.freeze({
          codeArea: area.codeArea,
          minimumLines: area.minimumLines,
          minimumTokens: area.minimumTokens
        })
      );
      mutablePolicies.set(path, policies);
    }
  }
  return new Map(
    Array.from(mutablePolicies, ([path, policies]) => [path, Object.freeze(policies)] as const)
  );
}

function annotateFragment(
  fragment: DuplicateCodeFragment,
  policiesByPath: ReadonlyMap<string, readonly PathPolicy[]>
): AnnotatedFragment | undefined {
  const locations: DuplicateCodeLocation[] = [];
  const involvedPolicies: PathPolicy[] = [];
  for (const location of fragment.locations) {
    const pathPolicies = policiesByPath.get(location.path);
    if (pathPolicies === undefined || pathPolicies.length === 0) return undefined;
    locations.push(
      Object.freeze({
        endLine: location.endLine,
        path: location.path,
        startLine: location.startLine
      })
    );
    involvedPolicies.push(...pathPolicies);
  }
  if (involvedPolicies.length === 0) return undefined;

  const annotatedFragment = Object.freeze({
    ...fragment,
    codeAreas: Object.freeze(uniqueSorted(involvedPolicies.map((policy) => policy.codeArea))),
    locations: Object.freeze(locations)
  });
  return Object.freeze({
    fragment: annotatedFragment,
    requiredMinimumLines: Math.max(...involvedPolicies.map((policy) => policy.minimumLines)),
    requiredMinimumTokens: Math.max(...involvedPolicies.map((policy) => policy.minimumTokens))
  });
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort(compareText);
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
