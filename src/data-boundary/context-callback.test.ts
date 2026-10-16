import assert from "node:assert/strict";
import { it } from "node:test";
import { normalizeContextCallback, snapshotContextCallback } from "./context-callback.ts";

it("snapshots closed static callback demand and delivers exact frozen views without unused reads", () => {
  const fields = ["first", "second"] as const;
  type Fields = { readonly first: number; readonly second: number };
  const needs = ["second", "first", "second"];
  const observed: object[] = [];
  const descriptor = {
    contextNeeds: needs,
    callback: (input: string, context: object) => {
      observed.push(context);
      return input;
    }
  };
  const snapshot = snapshotContextCallback<[string], Fields, string>(descriptor, fields)!;
  assert.equal(typeof snapshot, "object");
  if (typeof snapshot === "function") throw new Error("expected descriptor");
  assert.deepEqual(snapshot.contextNeeds, ["first", "second"]);
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.contextNeeds), true);
  needs.splice(0);
  descriptor.callback = () => {
    throw new Error("changed callback");
  };
  const normalized = normalizeContextCallback<[string], Fields>(snapshot, fields)!;
  assert.equal(normalized.invoke({ first: 1, second: 2 }, "original"), "original");
  const firstContext = observed[0];
  assert.ok(firstContext !== undefined);
  assert.deepEqual(Reflect.ownKeys(firstContext), fields);
  assert.equal(Object.isFrozen(observed[0]), true);
  assert.deepEqual(Object.getOwnPropertyDescriptors(observed[0]), {
    first: { value: 1, enumerable: true, writable: false, configurable: false },
    second: { value: 2, enumerable: true, writable: false, configurable: false }
  });
  let firstReads = 0;
  let secondReads = 0;
  const source = {
    get first() {
      firstReads += 1;
      return 3;
    },
    get second(): number {
      secondReads += 1;
      throw new Error("unused producer");
    }
  };
  const minimal = normalizeContextCallback<[string], Fields>(
    {
      contextNeeds: ["first"],
      callback: (_input: string, context: object) => observed.push(context)
    },
    fields
  )!;
  minimal.invoke(source, "input");
  assert.deepEqual(observed[1], { first: 3 });
  assert.equal(firstReads, 1);
  assert.equal(secondReads, 0);
  for (const slot of [
    () => undefined,
    { callback: () => undefined },
    { contextNeeds: undefined, callback: () => undefined },
    { contextNeeds: [], callback: () => undefined }
  ]) {
    const empty = normalizeContextCallback<[], Fields>(slot, fields)!;
    empty.invoke(source);
  }
  assert.equal(firstReads, 1);
  assert.equal(secondReads, 0);
  let getterCalls = 0;
  for (const invalid of [
    { callback: () => undefined, contextNeeds: ["foreign"] },
    {
      callback: () => undefined,
      contextNeeds: Object.assign(new Array<unknown>(2), { 1: "first" })
    },
    { callback: () => undefined, contextNeeds: () => ["first"] },
    { callback: () => undefined, contextNeeds: "first" },
    { callback: () => undefined, extra: true },
    { callback: () => undefined, [Symbol("extension")]: true },
    {
      get callback() {
        getterCalls += 1;
        return () => undefined;
      }
    },
    {
      callback: () => undefined,
      contextNeeds: Object.defineProperty(["first"], "0", {
        get() {
          getterCalls += 1;
          return "first";
        }
      })
    }
  ])
    assert.equal(snapshotContextCallback(invalid, fields), undefined);
  assert.equal(getterCalls, 0);
});

function normalizedInvocationTypes(untrusted: unknown) {
  type Fields = { readonly first: number };
  const keys = ["first"] as const;
  const known = {
    contextNeeds: keys,
    callback: (input: string, context: Fields) => `${input}:${context.first}`
  };
  const typed = normalizeContextCallback<[input: string], Fields, string>(known, keys)!;
  const preserved: string = typed.invoke({ first: 1 }, "input");
  // @ts-expect-error Typed invocation keeps the known business argument type.
  typed.invoke({ first: 1 }, 1);
  const erased = normalizeContextCallback<[input: string], Fields>(untrusted, keys)!;
  // @ts-expect-error Descriptor validation does not prove an unknown author's return type.
  const unproven: string = erased.invoke({ first: 1 }, "input");
  // @ts-expect-error A typed result overload requires a known callback contract, not unknown input.
  normalizeContextCallback<[input: string], Fields, string>(untrusted, keys);
  void [preserved, unproven];
}
void normalizedInvocationTypes;
