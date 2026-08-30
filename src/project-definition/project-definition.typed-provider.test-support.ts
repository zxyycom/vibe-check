import assert from "node:assert/strict";

import { defineCheck } from "../check/check.ts";
import {
  createDeclarativeFingerprint,
  defineConfig,
  normalizeProjectDefinition,
  type ProjectDefinition
} from "./project-definition.ts";
import { validateProjectDefinition } from "./project-definition-validation.ts";
import { passed } from "./project-definition.test-support.ts";

export function providerDefinitionWithParser(
  parseData: (data: Readonly<Record<string, unknown>>) => { readonly source: string }
): ProjectDefinition {
  return defineConfig({
    checks: [
      defineCheck({
        checkId: "provider",
        displayName: "Provider",
        execution: passed,
        parseData
      })
    ]
  });
}

export function assertExecutableProviderRetainsParser(
  parseData: (data: Readonly<Record<string, unknown>>) => { readonly source: string }
): void {
  const validated = validateProjectDefinition(providerDefinitionWithParser(parseData));
  assert.equal(validated.ok, true);
  if (!validated.ok) return;
  const materialized = validated.value.checks[0];
  assert.equal(
    materialized !== undefined && "parseData" in materialized ? materialized.parseData : undefined,
    parseData
  );
}

export function assertParsersDoNotChangeDeclarativeIdentity(
  firstParser: (data: Readonly<Record<string, unknown>>) => { readonly source: string },
  secondParser: (data: Readonly<Record<string, unknown>>) => { readonly source: string }
): void {
  const firstDefinition = normalizeProjectDefinition(providerDefinitionWithParser(firstParser));
  const secondDefinition = normalizeProjectDefinition(providerDefinitionWithParser(secondParser));
  assert.equal(Object.hasOwn(firstDefinition.checks[0] ?? {}, "parseData"), false);
  assert.equal(Object.hasOwn(firstDefinition.declarative.checks[0] ?? {}, "parseData"), false);
  assert.equal(
    createDeclarativeFingerprint(firstDefinition.declarative),
    createDeclarativeFingerprint(secondDefinition.declarative)
  );
}

export function assertInvalidParserDeclarationsAreRejected(
  parseData: (data: Readonly<Record<string, unknown>>) => { readonly source: string }
): void {
  for (const check of [
    { checkId: "container-parser", displayName: "Container parser", parseData },
    {
      checkId: "invalid-parser",
      displayName: "Invalid parser",
      execution: passed,
      parseData: null
    }
  ]) {
    assert.equal(validateProjectDefinition({ ...defineConfig({}), checks: [check] }).ok, false);
  }
}

export function assertUndefinedParserIsOmitted(): void {
  const explicitUndefined = validateProjectDefinition({
    ...defineConfig({}),
    checks: [
      {
        checkId: "undefined-parser",
        displayName: "Undefined parser",
        execution: passed,
        parseData: undefined
      }
    ]
  });
  assert.equal(explicitUndefined.ok, true);
  if (explicitUndefined.ok) {
    assert.equal(Object.hasOwn(explicitUndefined.value.checks[0] ?? {}, "parseData"), false);
  }
}
