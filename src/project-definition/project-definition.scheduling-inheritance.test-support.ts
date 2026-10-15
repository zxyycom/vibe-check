import { inherit, type Check } from "../check/check.ts";
import { passed } from "./project-definition.test-support.ts";

/** Shared collection edits expose replacement, rollback and parent-snapshot boundaries. */
export function overlappingSchedulingCollections(): readonly Check[] {
  const collections = (values: NonNullable<Check["mutex"]>) => ({
    dependsOn: values,
    mutex: values,
    observes: values
  });
  const leaf = (checkId: string, fields: Partial<Check> = {}): Check => ({
    checkId,
    displayName: checkId,
    execute: passed,
    ...fields
  });
  return [
    {
      checkId: "root",
      displayName: "Root",
      ...collections(["z", "a"]),
      checks: [
        leaf("parent", {
          ...collections(inherit({ remove: ["a", "missing"], add: ["a", "b", "b"] })),
          checks: [
            leaf("cleared", collections([])),
            leaf("replaced", {
              ...collections(["replacement"]),
              checks: [leaf("edited", collections(inherit({ add: ["child"] })))]
            }),
            leaf("restored-child")
          ]
        }),
        leaf("restored-sibling"),
        leaf("no-op", collections(inherit({ remove: ["missing"], add: ["a"] })))
      ]
    },
    leaf("independent")
  ];
}

export function deepInheritedMutexTree(size: number): Check {
  let check: Check = { checkId: "leaf", displayName: "Leaf", execute: passed };
  for (let index = 0; index < size; index += 1) {
    check = {
      checkId: `parent-${index}`,
      displayName: "Parent",
      mutex: inherit({ add: [`cost-mutex-${index}`] }),
      checks: [check]
    };
  }
  return check;
}

/** Observe only the marked fixture's materialization and always restore the host method. */
export function measureMutexSorting<T>(resolve: () => T): {
  readonly value: T;
  readonly sortedElements: number;
} {
  const originalSort: (
    this: unknown[],
    compare?: (left: unknown, right: unknown) => number
  ) => unknown[] = Array.prototype.sort;
  let sortedElements = 0;
  Reflect.set(
    Array.prototype,
    "sort",
    function (this: unknown[], compare?: (left: unknown, right: unknown) => number) {
      if (typeof this[0] === "string" && this[0].startsWith("cost-mutex-"))
        sortedElements += this.length;
      return Reflect.apply(originalSort, this, [compare]);
    }
  );
  try {
    return { value: resolve(), sortedElements };
  } finally {
    Reflect.set(Array.prototype, "sort", originalSort);
  }
}
