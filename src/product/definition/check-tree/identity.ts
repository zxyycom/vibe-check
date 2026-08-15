/** Accepts the stable IDs used by Check leaves, groups, and their dependencies. */
export function isCheckTreeReferenceId(value: string): boolean {
  return /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value);
}
