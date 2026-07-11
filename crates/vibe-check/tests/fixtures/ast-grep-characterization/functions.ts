type Pair = { left: number; right: number };

export function named(a: number, b: number, c: number, d: number) {
  return a + b + c + d;
}

export function outer(seed: number) {
  function nested(a: number, b: number, c: number, d: number, e: number) {
    return a + b + c + d + e;
  }

  return nested(seed, 2, 3, 4, 5);
}

export class Service {
  constructor(a: number, b: number, c: number, d: number, e: number) {
    void [a, b, c, d, e];
  }

  run(
    this: Service,
    /* Parameter-list comments are named syntax extras. */
    { left, right }: Pair,
    optional?: string,
    withDefault = 1,
    ...rest: string[]
  ) {
    return [left, right, optional, withDefault, rest];
  }
}

export const boundArrow = (
  first = 1,
  second?: string,
  { left, right }: Pair = { left: 0, right: 0 },
  ...rest: string[]
) => [first, second, left, right, rest];

export const boundFunction = function (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number
) {
  return a + b + c + d + e;
};

[1, 2].map((value) => value * 2);
export const alpha = (value: number) => value; export const omega = (value: number) => value;
