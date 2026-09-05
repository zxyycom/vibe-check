import assert from "node:assert/strict";

/** Asserts the named lifecycle events occur in their required relative order. */
export function assertEventsInOrder(input: {
  readonly events: readonly string[];
  readonly required: readonly string[];
}): void {
  let priorIndex = -1;
  for (const event of input.required) {
    const index = input.events.indexOf(event, priorIndex + 1);
    assert.ok(
      index >= 0,
      `expected ${event} after ${input.events.slice(priorIndex + 1).join(", ")}`
    );
    priorIndex = index;
  }
}
