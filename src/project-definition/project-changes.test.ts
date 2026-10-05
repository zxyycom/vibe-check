import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ProjectChangeFlagRegion, ProjectChangesConfiguration } from "../index.ts";
import {
  createDeclarativeFingerprint,
  defineConfig,
  normalizeProjectDefinition
} from "./project-definition.ts";
import { validateProjectDefinition } from "./project-definition-validation.ts";

describe("Project Definition changes", () => {
  it("normalizes omitted exclusions to the same frozen identity as an explicit empty array", () => {
    const include = ["src/**"];
    const authored: ProjectChangesConfiguration = {
      flags: { source: { include } },
      source: { compareWith: "HEAD" }
    };
    const definition = defineConfig({ changes: authored });
    const explicit = defineConfig({
      changes: {
        flags: { source: { exclude: [], include: ["src/**"] } },
        source: { compareWith: "HEAD" }
      }
    });
    const validated = validateProjectDefinition(definition);
    assert.equal(validated.ok, true);
    if (!validated.ok) return;
    const normalized = normalizeProjectDefinition(validated.value);
    const expected = {
      flags: { source: { exclude: [], include: ["src/**"] } },
      source: { compareWith: "HEAD" }
    };
    assert.deepEqual(normalized.changes, expected);
    assert.deepEqual(normalized.declarative.changes, expected);
    assert.deepEqual(normalizeProjectDefinition(definition).changes, expected);
    assert.equal(
      createDeclarativeFingerprint(normalized.declarative),
      createDeclarativeFingerprint(normalizeProjectDefinition(explicit).declarative)
    );
    assert.notEqual(normalized.changes, authored);
    assert.equal(Object.hasOwn(authored.flags.source ?? {}, "exclude"), false);
    assert.equal(Object.isFrozen(normalized.changes), true);
    assert.equal(Object.isFrozen(normalized.changes?.source), true);
    assert.equal(Object.isFrozen(normalized.changes?.flags), true);
    assert.equal(Object.isFrozen(normalized.changes?.flags.source), true);
    assert.equal(Object.isFrozen(normalized.changes?.flags.source?.include), true);
    assert.equal(Object.isFrozen(normalized.changes?.flags.source?.exclude), true);
    include.push("docs/**");
    assert.deepEqual(normalized.changes, expected);

    type AcceptsOwnUndefined = {
      exclude: undefined;
      include: readonly string[];
    } extends ProjectChangeFlagRegion
      ? true
      : false;
    const acceptsOwnUndefined: AcceptsOwnUndefined = false;
    assert.equal(acceptsOwnUndefined, false);
  });

  it("rejects malformed regions without relaxing required fields or closed input safety", () => {
    let accessorCalls = 0;
    const accessorRegion = Object.defineProperty({ include: ["src/**"] }, "exclude", {
      enumerable: true,
      get: () => {
        accessorCalls += 1;
        return [];
      }
    });
    const accessorArray = Object.defineProperty([], "0", {
      enumerable: true,
      get: () => {
        accessorCalls += 1;
        return "src/**";
      }
    });
    const malformedRegions: readonly unknown[] = [
      {},
      { exclude: [] },
      { include: undefined },
      { include: null },
      { include: "src/**" },
      { include: ["src/**"], exclude: undefined },
      { include: ["src/**"], exclude: null },
      { include: ["src/**"], exclude: "src/**" },
      { include: ["src/**"], exclude: [""] },
      { include: ["src/**"], exclude: [false] },
      { include: ["src/**"], exclude: new Array(1) },
      { include: ["src/**"], exclude: Object.assign([], { extra: true }) },
      { include: ["src/**"], exclude: accessorArray },
      { include: ["src/**"], extra: [] },
      { include: ["src/**"], [Symbol("extra")]: [] },
      Object.defineProperty({ include: ["src/**"] }, "exclude", { value: [] }),
      Object.create({ exclude: [] }, { include: { enumerable: true, value: ["src/**"] } }),
      accessorRegion
    ];
    const malformedChanges: readonly unknown[] = [
      ...malformedRegions.map((region) => ({
        flags: { source: region },
        source: { compareWith: "HEAD" }
      })),
      { flags: { source: { include: ["src/**"] } } },
      { flags: { source: { include: ["src/**"] } }, source: undefined },
      { flags: { source: { include: ["src/**"] } }, source: {} },
      { flags: { source: { include: ["src/**"] } }, source: { compareWith: undefined } },
      { flags: { source: { include: ["src/**"] } }, source: { compareWith: "HEAD", extra: true } },
      { flags: {}, source: { compareWith: "HEAD" } }
    ];
    const defaults = defineConfig({});
    for (const changes of malformedChanges) {
      assert.deepEqual(validateProjectDefinition({ ...defaults, changes }), {
        error: {
          kind: "invalid-project-definition",
          path: "definition.changes",
          reason: "invalid-value"
        },
        ok: false
      });
    }
    assert.equal(accessorCalls, 0);
  });
});
