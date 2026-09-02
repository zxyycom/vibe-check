/** TypeScript documentation comment. */
export function choose(value?: number): number {
  if (value === undefined) return 0;
  return value > 0 ? value : -value;
}
