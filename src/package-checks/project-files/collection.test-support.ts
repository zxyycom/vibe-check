import fs from "node:fs";
import { dirname, join, resolve } from "node:path";

export function write(root: string, file: string): void {
  fs.mkdirSync(dirname(join(root, file)), { recursive: true });
  fs.writeFileSync(join(root, file), "content\n");
}

/** Ordinary and syntax-sensitive filenames for the complete native list matrix. */
export const nativePatternFiles = [
  ".entry",
  "src/.dot.ts",
  "src/Safe_1-2.ts",
  "src/a.ts",
  "src/b.tsx",
  "docs/a.md",
  "docs/a b.md",
  "src/référence.ts",
  "src/square[1].ts",
  "src/line\nbreak.ts"
];

export const nativePatternLists = [
  ["src/a.ts", "src/.dot.ts", "src/a.ts", "src/Safe_1-2.ts", ".entry"],
  ["src/référence.ts"],
  ["docs/a b.md"],
  ["src/square[[]1].ts"],
  ["src//a.ts"],
  ["src/**/*.{ts,tsx}", "!src/a.ts", "src/a.ts"],
  ["src/**/@(a|b).@(ts|tsx)"],
  ["!docs/**"],
  ["**/*", "!src/**"],
  ["**/*", "!src/**", "src/a.ts"],
  ["!src/**", "!!src/**"],
  ["!(docs)/**"],
  ["./!(docs)/**"],
  ["./src/*.ts"],
  ["./src/a.ts"],
  ["./src/*.ts", "!src/a.ts", "./src/a.ts"],
  []
];

/** Count only the marked deep-path fixture; restoration is independent of collection success. */
export function measurePrefixCopies<T>(collect: () => T): {
  readonly value: T;
  readonly copiedPrefixSlots: number;
} {
  const originalSlice: (this: unknown[], start?: number, end?: number) => unknown[] =
    Array.prototype.slice;
  let copiedPrefixSlots = 0;
  Reflect.set(Array.prototype, "slice", function (this: unknown[], start?: number, end?: number) {
    if (this[0] === "prefix-cost") copiedPrefixSlots += end ?? this.length;
    return Reflect.apply(originalSlice, this, [start, end]);
  });
  try {
    return { value: collect(), copiedPrefixSlots };
  } finally {
    Reflect.set(Array.prototype, "slice", originalSlice);
  }
}

/** Observe the adapter's inspection/read demand without retaining replaced host methods. */
export function observeCollectionAccesses(collect: (accesses: string[]) => void): void {
  const originalStat = fs.lstatSync;
  const originalRead = fs.readdirSync;
  const accesses: string[] = [];
  Reflect.set(fs, "lstatSync", (target: fs.PathLike) => {
    accesses.push(resolve(String(target)));
    return originalStat(target);
  });
  Reflect.set(fs, "readdirSync", (target: fs.PathLike, options: { withFileTypes: true }) => {
    accesses.push(resolve(String(target)));
    return originalRead(target, options);
  });
  try {
    collect(accesses);
  } finally {
    Reflect.set(fs, "lstatSync", originalStat);
    Reflect.set(fs, "readdirSync", originalRead);
  }
}
