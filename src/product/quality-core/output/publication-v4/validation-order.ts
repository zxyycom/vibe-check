export function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function sameText(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function isCanonicalText(values: readonly string[]): boolean {
  return isCanonical(values, (value) => value);
}

export function isCanonical<Value>(
  values: readonly Value[],
  key: (value: Value) => string
): boolean {
  let previousKey: string | undefined;
  for (const value of values) {
    const currentKey = key(value);
    if (previousKey !== undefined && previousKey >= currentKey) return false;
    previousKey = currentKey;
  }
  return true;
}
