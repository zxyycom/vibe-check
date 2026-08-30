import assert from "node:assert/strict";

export type HostileCheckValue = Readonly<{
  readonly assertNotCalled: () => void;
  readonly messageAttachment?: boolean;
  readonly value: object;
}>;

export type HostileCheckValueFactory = Readonly<{ readonly create: () => HostileCheckValue }>;

export function adversarialCheckValues(): readonly HostileCheckValueFactory[] {
  return [
    {
      create: () => {
        const value = new Proxy(
          {},
          {
            ownKeys: () => {
              throw new Error("reflection must be contained");
            }
          }
        );
        return Object.freeze({ assertNotCalled: () => undefined, value });
      }
    },
    {
      create: () => {
        let called = false;
        const value = {};
        Object.defineProperty(value, "accessor", {
          enumerable: true,
          get: () => {
            called = true;
            throw new Error("accessor must not execute");
          }
        });
        return Object.freeze({
          assertNotCalled: () => assert.equal(called, false),
          value
        });
      }
    },
    {
      create: () => {
        let called = false;
        const value = {
          toJSON: () => {
            called = true;
            return {};
          }
        };
        return Object.freeze({
          assertNotCalled: () => assert.equal(called, false),
          value
        });
      }
    },
    {
      create: () => {
        const value: Record<string, unknown> = {};
        value.self = value;
        return Object.freeze({ assertNotCalled: () => undefined, value });
      }
    },
    {
      create: () => {
        const value: unknown[] = [];
        value.length = 2;
        value[1] = { level: "info", code: "sparse", message: "Sparse attachment" };
        return Object.freeze({
          assertNotCalled: () => undefined,
          messageAttachment: true,
          value
        });
      }
    },
    {
      create: () => {
        const value: unknown[] = [{ level: "info", code: "named", message: "Named attachment" }];
        Object.defineProperty(value, "named", { enumerable: true, value: true });
        return Object.freeze({
          assertNotCalled: () => undefined,
          messageAttachment: true,
          value
        });
      }
    },
    {
      create: () => {
        let called = false;
        const value: unknown[] = [];
        Object.defineProperty(value, "0", {
          enumerable: true,
          get: () => {
            called = true;
            throw new Error("array accessor must not execute");
          }
        });
        return Object.freeze({
          assertNotCalled: () => assert.equal(called, false),
          messageAttachment: true,
          value
        });
      }
    },
    {
      create: () => {
        const value: unknown[] = [{ level: "info", code: "symbol", message: "Symbol attachment" }];
        Object.defineProperty(value, Symbol("message-symbol"), { enumerable: true, value: true });
        return Object.freeze({
          assertNotCalled: () => undefined,
          messageAttachment: true,
          value
        });
      }
    },
    {
      create: () => {
        const value = [{ level: "info", code: "nested", message: "Nested message" }];
        Object.setPrototypeOf(value, { inherited: true });
        return Object.freeze({
          assertNotCalled: () => undefined,
          messageAttachment: true,
          value
        });
      }
    },
    {
      create: () =>
        Object.freeze({
          assertNotCalled: () => undefined,
          value: { nonFinite: Number.POSITIVE_INFINITY }
        })
    },
    {
      create: () => {
        const value = { accepted: true };
        Object.setPrototypeOf(value, { inherited: true });
        return Object.freeze({ assertNotCalled: () => undefined, value });
      }
    }
  ];
}
