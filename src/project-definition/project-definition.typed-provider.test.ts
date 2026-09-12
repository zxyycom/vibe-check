import { describe, it } from "node:test";

import { defineConfig } from "./project-definition.ts";
import {
  assertExecutableProviderRetainsParser,
  assertExecutableProviderRetainsHandoffAndExcludesItFromDeclarativeIdentity,
  assertInvalidHandoffDeclarationsAreRejected,
  assertInvalidParserDeclarationsAreRejected,
  assertParsersDoNotChangeDeclarativeIdentity,
  assertUndefinedParserIsOmitted
} from "./project-definition.typed-provider.test-support.ts";

describe("Project Definition", () => {
  it("accepts parsers only on executable providers and excludes them from declarative identity", () => {
    const firstDataParser = (data: Readonly<Record<string, unknown>>) => ({
      source: typeof data.source === "string" ? data.source : ""
    });
    const secondDataParser = (data: Readonly<Record<string, unknown>>) => ({
      source: typeof data.source === "string" ? data.source : ""
    });

    assertExecutableProviderRetainsParser(firstDataParser);
    assertParsersDoNotChangeDeclarativeIdentity(firstDataParser, secondDataParser);
    assertInvalidParserDeclarationsAreRejected(firstDataParser);
    assertUndefinedParserIsOmitted();
    assertExecutableProviderRetainsHandoffAndExcludesItFromDeclarativeIdentity();
    assertInvalidHandoffDeclarationsAreRejected();
  });

  // @ts-expect-error defineConfig rejects retired policy authoring.
  defineConfig({ selectedPolicy: null });
  // @ts-expect-error defineConfig rejects unknown top-level authoring keys.
  defineConfig({ unsupported: true });
});
