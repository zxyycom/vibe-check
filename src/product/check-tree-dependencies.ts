import type { ResolvedCheckTreeLeaf } from "./check-tree.ts";

export function resolveCheckTreeDependencies(
  leaves: readonly ResolvedCheckTreeLeaf[],
  descendants: ReadonlyMap<string, readonly string[]>
): readonly ResolvedCheckTreeLeaf[] | undefined {
  const ids = new Set(leaves.map((leaf) => leaf.definition.checkId));
  const expanded = leaves.map((leaf) => expandLeafDependencies(leaf, descendants, ids));
  if (expanded.some((leaf) => leaf === undefined)) return undefined;
  const resolved = expanded as readonly ResolvedCheckTreeLeaf[];
  return hasDependencyCycle(resolved) ? undefined : Object.freeze(resolved);
}

function expandLeafDependencies(
  leaf: ResolvedCheckTreeLeaf,
  descendants: ReadonlyMap<string, readonly string[]>,
  ids: ReadonlySet<string>
): ResolvedCheckTreeLeaf | undefined {
  const dependencies: string[] = [];
  for (const dependency of leaf.dependsOn) {
    const targets = descendants.get(dependency) ?? (ids.has(dependency) ? [dependency] : undefined);
    if (targets === undefined) return undefined;
    for (const target of targets) {
      if (target === leaf.definition.checkId || !dependencies.includes(target)) dependencies.push(target);
    }
  }
  return dependencies.includes(leaf.definition.checkId)
    ? undefined
    : Object.freeze({ ...leaf, dependsOn: Object.freeze(dependencies) });
}

function hasDependencyCycle(leaves: readonly ResolvedCheckTreeLeaf[]): boolean {
  const dependencies = new Map(leaves.map((leaf) => [leaf.definition.checkId, leaf.dependsOn]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const dependency of dependencies.get(id) ?? []) if (visit(dependency)) return true;
    visiting.delete(id);
    visited.add(id);
    return false;
  };
  return leaves.some((leaf) => visit(leaf.definition.checkId));
}
