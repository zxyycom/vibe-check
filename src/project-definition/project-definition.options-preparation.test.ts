import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { defineCheck } from "../check/check.ts";
import { defineConfig } from "./project-definition.ts";
import {
  definitionAcceptsDefaultJsonValidationOptions,
  definitionAcceptsJsonSchemaValidationOptions,
  definitionAcceptsJsonValidationOptions,
  invalidJsonSchemaValidationOptions,
  invalidJsonValidationOptions,
  validJsonSchemaValidationOptions
} from "./project-definition.options-preparation.test-support.ts";
import { validateProjectDefinition } from "./project-definition-validation.ts";
import { passed } from "./project-definition.test-support.ts";

describe("Project Definition", () => {
  it("accepts ordinary authored JSON options while their Check preparation owns domain validation", () => {
    for (const options of invalidJsonValidationOptions) {
      assert.equal(definitionAcceptsJsonValidationOptions(options), true);
    }
    assert.equal(definitionAcceptsDefaultJsonValidationOptions(), true);
    assert.equal(
      validateProjectDefinition(
        defineConfig({
          checks: [
            defineCheck({
              checkId: "throwing-preparation",
              displayName: "Throwing preparation",
              options: { accepted: true },
              prepare: () => {
                throw new Error("preparation failure");
              },
              execute: passed
            })
          ]
        })
      ).ok,
      true
    );
  });

  it("accepts ordinary JSON Schema options while their Check preparation owns domain validation", () => {
    assert.equal(
      definitionAcceptsJsonSchemaValidationOptions(validJsonSchemaValidationOptions),
      true
    );
    for (const options of invalidJsonSchemaValidationOptions) {
      assert.equal(definitionAcceptsJsonSchemaValidationOptions(options), true);
    }
  });
});
