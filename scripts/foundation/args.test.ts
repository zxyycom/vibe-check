import { expect, test } from "bun:test";

import { parsePositiveInteger } from "./args.ts";

test("parses strict positive integers", () => {
  expect(parsePositiveInteger("4", "concurrency")).toBe(4);
  expect(() => parsePositiveInteger("0", "concurrency")).toThrow(
    "concurrency must be a positive integer"
  );
});
