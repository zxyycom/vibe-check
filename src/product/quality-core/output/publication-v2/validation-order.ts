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
  return values.every((value, index) => index === 0 || key(values[index - 1]!) < key(value));
}
