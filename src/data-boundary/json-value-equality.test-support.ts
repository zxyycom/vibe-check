import { Assert, type AssertStrict } from "node:assert";

const jsonValueAssert: AssertStrict = new Assert({ strict: true, skipPrototype: true });

// Compare JSON-shaped content across canonical null-prototype objects and authored literals.
// This is not JSON validation and does not prove prototypes, freezing, or reference identity.
export function assertJsonValueEqual(actual: unknown, expected: unknown, message?: string): void {
  jsonValueAssert.deepStrictEqual(actual, expected, message);
}
